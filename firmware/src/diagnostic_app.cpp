#if defined(MARIA_ESP32_28_RADAR_TERMINAL) || \
    defined(MARIA_M5STACK_CORE2_RADAR_TERMINAL)

#include "radar_terminal/diagnostic_app.h"

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <SD.h>
#include <SPI.h>
#include <WiFi.h>
#include <esp_system.h>

#if defined(MARIA_M5STACK_CORE2_RADAR_TERMINAL)
#include <M5Unified.h>
#include "board_profiles/m5stack_core2.h"
#define diagTft M5.Display
#else
#include <TFT_eSPI.h>
#include <XPT2046_Touchscreen.h>
#include "board_profiles/esp32_2432s028r.h"
#endif
#include "config.h"

namespace MariaRadar {

namespace {
#if defined(MARIA_ESP32_28_RADAR_TERMINAL)
TFT_eSPI diagTft;
XPT2046_Touchscreen diagTouch(MariaBoard::kTouchCs, MariaBoard::kTouchIrq);
#endif
constexpr uint16_t kBg = TFT_BLACK;
constexpr uint16_t kPanel = 0x0861;
constexpr uint16_t kCyan = 0x07ff;
constexpr uint16_t kGreen = 0x07e0;
constexpr uint16_t kAmber = 0xffc0;
constexpr uint16_t kRed = 0xf800;
constexpr uint16_t kWhite = TFT_WHITE;
constexpr uint8_t kDisplayStepCount = 10;
constexpr uint8_t kDemoAircraftCount = 10;
constexpr const char *kPrefsNamespace = "maria-radar";
constexpr const char *kPrefsBlob = "prefs";

const char *screenName(DiagnosticScreen screen) {
  switch (screen) {
    case DiagnosticScreen::Menu:
      return "menu";
    case DiagnosticScreen::Display:
      return "display";
    case DiagnosticScreen::Touch:
      return "touch";
    case DiagnosticScreen::BoardInfo:
      return "info";
    case DiagnosticScreen::Wifi:
      return "wifi";
    case DiagnosticScreen::Backend:
      return "backend";
    case DiagnosticScreen::Sd:
      return "sd";
    case DiagnosticScreen::Led:
      return "led";
    case DiagnosticScreen::Speaker:
      return "speaker";
    case DiagnosticScreen::RadarDemo:
      return "demo";
    case DiagnosticScreen::Summary:
      return "summary";
    case DiagnosticScreen::Normal:
      return "normal";
  }
  return "menu";
}

const char *backendStateLabel(BackendDiagnosticState state) {
  switch (state) {
    case BackendDiagnosticState::Untested:
      return "untested";
    case BackendDiagnosticState::GpsUnavailable:
      return "gps unavailable";
    case BackendDiagnosticState::WifiUnavailable:
      return "wifi unavailable";
    case BackendDiagnosticState::HttpOk:
      return "ok";
    case BackendDiagnosticState::HttpError:
      return "http error";
    case BackendDiagnosticState::JsonMalformed:
      return "bad json";
    case BackendDiagnosticState::Timeout:
      return "timeout";
  }
  return "unknown";
}
}  // namespace

bool diagnosticBootRequested() {
#ifdef MARIA_DIAGNOSTIC_MODE
  if (MARIA_DIAGNOSTIC_MODE) return true;
#endif
#if defined(MARIA_M5STACK_CORE2_RADAR_TERMINAL)
  M5.update();
  return M5.BtnA.isPressed();
#else
  pinMode(0, INPUT_PULLUP);
  delay(20);
  return digitalRead(0) == LOW;
#endif
}

void DiagnosticApp::begin(WifiManager *wifiManager) {
  wifiManager_ = wifiManager;
  for (uint8_t i = 0; i < static_cast<uint8_t>(DiagnosticItem::Count); i++) {
    statuses_[i] = DiagnosticStatus::NotTested;
  }
#if defined(MARIA_M5STACK_CORE2_RADAR_TERMINAL)
  delay(250);
  MariaBoard::begin();
#else
  pinMode(MariaBoard::kBacklightPin, OUTPUT);
  digitalWrite(MariaBoard::kBacklightPin, MariaBoard::kBacklightActiveLevel);
#endif
  if (MariaBoard::kRgbLedRed >= 0) pinMode(MariaBoard::kRgbLedRed, OUTPUT);
  if (MariaBoard::kRgbLedGreen >= 0) pinMode(MariaBoard::kRgbLedGreen, OUTPUT);
  if (MariaBoard::kRgbLedBlue >= 0) pinMode(MariaBoard::kRgbLedBlue, OUTPUT);
#if defined(MARIA_ESP32_28_RADAR_TERMINAL)
  diagTft.init();
#endif
  diagTft.setRotation(MariaBoard::kLandscapeRotation);
  diagTft.fillScreen(kBg);
  diagTft.setTextFont(2);
  diagTft.setTextDatum(TL_DATUM);
#if !MARIA_DISABLE_TOUCH
#if defined(MARIA_M5STACK_CORE2_RADAR_TERMINAL)
  touchReady_ = true;
#else
  SPI.begin(MariaBoard::kTouchSclk, MariaBoard::kTouchMiso,
            MariaBoard::kTouchMosi, MariaBoard::kTouchCs);
  touchReady_ = diagTouch.begin();
  diagTouch.setRotation(MariaBoard::kLandscapeRotation);
#endif
#endif
  loadTouchCalibration();
  logStartup();
  printBoardInfo();
  setStatus(DiagnosticItem::Board, DiagnosticStatus::Pass, "board info ready");
  setStatus(DiagnosticItem::Rgb,
            core2RgbSupported() ? DiagnosticStatus::NotTested
                                : DiagnosticStatus::Unsupported,
            core2RgbSupported() ? nullptr : "no Core2 RGB diagnostic");
  drawMenu();
}

DiagnosticScreen DiagnosticApp::screen() const { return screen_; }

void DiagnosticApp::setScreen(DiagnosticScreen screen) {
  if (screen_ == DiagnosticScreen::Led && screen != DiagnosticScreen::Led &&
      MariaBoard::kRgbLedRed >= 0 && MariaBoard::kRgbLedGreen >= 0 &&
      MariaBoard::kRgbLedBlue >= 0) {
    const bool activeLow = MariaBoard::kRgbActiveLevel == LOW;
    digitalWrite(MariaBoard::kRgbLedRed, rgbOutputLevel(activeLow, false));
    digitalWrite(MariaBoard::kRgbLedGreen, rgbOutputLevel(activeLow, false));
    digitalWrite(MariaBoard::kRgbLedBlue, rgbOutputLevel(activeLow, false));
  }
  screen_ = screen;
  lastDrawMs_ = 0;
  Serial.printf("[MARIA][MENU] %s\n", screenName(screen_));
  Serial.flush();
  if (screen == DiagnosticScreen::Display) {
    setStatus(DiagnosticItem::Display, DiagnosticStatus::Running, "display start");
  } else if (screen == DiagnosticScreen::Touch) {
    setStatus(DiagnosticItem::Touch, DiagnosticStatus::Running, "touch start");
  } else if (screen == DiagnosticScreen::Wifi) {
    setStatus(DiagnosticItem::WifiScan, DiagnosticStatus::Running, "scan start");
    wifiScanStartedMs_ = millis();
    WiFi.scanDelete();
    WiFi.scanNetworks(true);
  } else if (screen == DiagnosticScreen::Backend) {
    setStatus(DiagnosticItem::Backend, DiagnosticStatus::Running, "backend start");
  } else if (screen == DiagnosticScreen::Sd) {
    setStatus(DiagnosticItem::Sd, DiagnosticStatus::Running, "sd start");
  } else if (screen == DiagnosticScreen::Speaker) {
    setStatus(DiagnosticItem::Speaker, DiagnosticStatus::Running,
              "speaker prompt");
    speakerPromptStep_ = 0;
  } else if (screen == DiagnosticScreen::RadarDemo) {
    setStatus(DiagnosticItem::RadarDemo, DiagnosticStatus::Running,
              "offline demo start");
  }
}

bool DiagnosticApp::poll(const GpsFix &fix) {
  handleSerial();
  handleTouch();
  uint32_t now = millis();
  if (now - lastDrawMs_ < 250 && screen_ != DiagnosticScreen::RadarDemo) {
    return screen_ == DiagnosticScreen::Normal;
  }
  lastDrawMs_ = now;
  switch (screen_) {
    case DiagnosticScreen::Menu:
      drawMenu();
      break;
    case DiagnosticScreen::Display:
      drawDisplayTest();
      break;
    case DiagnosticScreen::Touch:
      drawTouchTest();
      break;
    case DiagnosticScreen::BoardInfo:
      drawBoardInfo();
      break;
    case DiagnosticScreen::Wifi:
      drawWifiTest();
      break;
    case DiagnosticScreen::Backend:
      drawBackendTest(fix);
      break;
    case DiagnosticScreen::Sd:
      drawSdTest();
      break;
    case DiagnosticScreen::Led:
      drawLedTest();
      break;
    case DiagnosticScreen::Speaker:
      drawSpeakerTest();
      break;
    case DiagnosticScreen::RadarDemo:
      drawRadarDemo();
      break;
    case DiagnosticScreen::Summary:
      drawSummary();
      break;
    case DiagnosticScreen::Normal:
      drawNormalConfirm();
      break;
  }
  return screen_ == DiagnosticScreen::Normal && normalConfirm_;
}

void DiagnosticApp::drawHeader(const char *title) {
  diagTft.fillScreen(kBg);
  diagTft.setTextColor(kCyan, kBg);
  diagTft.drawString(title, 6, 4);
  diagTft.setTextColor(kWhite, kBg);
}

void DiagnosticApp::drawButton(int16_t x, int16_t y, int16_t w,
                               const char *label) {
  diagTft.fillRoundRect(x, y, w, 34, 4, kPanel);
  diagTft.drawRoundRect(x, y, w, 34, 4, kCyan);
  diagTft.setTextColor(kWhite, kPanel);
  diagTft.drawString(label, x + 7, y + 9);
  diagTft.setTextColor(kWhite, kBg);
}

void DiagnosticApp::drawFooterBack() { drawButton(8, 202, 86, "Back"); }

void DiagnosticApp::logStartup() {
  Serial.println("[MARIA][BOOT] Firmware starting");
  Serial.printf("[MARIA][BOARD] %s\n", MariaBoard::kBoardName);
#if defined(MARIA_M5STACK_CORE2_RADAR_TERMINAL)
  Serial.println("[MARIA][MODE] Diagnostic");
#else
  Serial.println("[MARIA][MODE] Diagnostic ESP32-32E");
#endif
  Serial.println("[MARIA][DISPLAY] Init PASS");
#if MARIA_DISABLE_TOUCH
  Serial.println("[MARIA][TOUCH] Init SKIP disabled");
#else
  Serial.printf("[MARIA][TOUCH] Init %s\n", touchReady_ ? "PASS" : "FAIL");
#endif
  Serial.println("[MARIA][SD] Not tested");
  Serial.println("[MARIA][WIFI] Not tested");
  Serial.println("[MARIA][RADAR] Offline demo ready");
  Serial.println("[MARIA][SERIAL] 115200");
  Serial.println("[MARIA][COMMANDS] help info display touch wifi backend sd led speaker demo summary normal reboot");
  Serial.flush();
}

void DiagnosticApp::setStatus(DiagnosticItem item, DiagnosticStatus status,
                              const char *detail) {
  const uint8_t index = static_cast<uint8_t>(item);
  if (index >= static_cast<uint8_t>(DiagnosticItem::Count)) return;
  if (statuses_[index] == status && detail == nullptr) return;
  statuses_[index] = status;
  Serial.printf("[MARIA][DIAG] %s %s", diagnosticItemLabel(item),
                diagnosticStatusLabel(status));
  if (detail != nullptr) Serial.printf(" %s", detail);
  Serial.println();
  Serial.flush();
}

void DiagnosticApp::drawMenu() {
  drawHeader("MARIA FIRST-FLASH DIAGNOSTICS");
  const char *items[] = {"1 Display", "2 Touch", "3 Board", "4 WiFi",
                         "5 Backend", "6 SD",    "7 RGB",   "8 Speaker",
                         "9 Radar",   "10 Normal"};
  for (uint8_t i = 0; i < 10; i++) {
    int16_t x = (i % 2) ? 164 : 8;
    int16_t y = 34 + (i / 2) * 38;
    drawButton(x, y, 148, items[i]);
    DiagnosticItem item = DiagnosticItem::Display;
    if (i == 1) item = DiagnosticItem::Touch;
    if (i == 2) item = DiagnosticItem::Board;
    if (i == 3) item = DiagnosticItem::WifiScan;
    if (i == 4) item = DiagnosticItem::Backend;
    if (i == 5) item = DiagnosticItem::Sd;
    if (i == 6) item = DiagnosticItem::Rgb;
    if (i == 7) item = DiagnosticItem::Speaker;
    if (i == 8) item = DiagnosticItem::RadarDemo;
    if (i == 9) item = DiagnosticItem::NormalMode;
    diagTft.setTextColor(kAmber, kPanel);
    diagTft.drawString(diagnosticStatusLabel(statuses_[static_cast<uint8_t>(item)]),
                       x + 96, y + 9);
    diagTft.setTextColor(kWhite, kBg);
  }
}

void DiagnosticApp::drawDisplayTest() {
  displayStep_ = (displayStep_ + 1) % kDisplayStepCount;
  if (displayStep_ == 0) diagTft.fillScreen(TFT_BLACK);
  if (displayStep_ == 1) diagTft.fillScreen(TFT_WHITE);
  if (displayStep_ == 2) diagTft.fillScreen(TFT_RED);
  if (displayStep_ == 3) diagTft.fillScreen(TFT_GREEN);
  if (displayStep_ == 4) diagTft.fillScreen(TFT_BLUE);
  if (displayStep_ == 5) {
    for (int x = 0; x < 320; x++) diagTft.drawFastVLine(x, 0, 240, x * 2);
  }
  if (displayStep_ == 6) {
    for (int y = 0; y < 240; y++) diagTft.drawFastHLine(0, y, 320, y * 3);
  }
  if (displayStep_ == 7) {
    for (int y = 0; y < 240; y += 20) {
      for (int x = 0; x < 320; x += 20) {
        diagTft.fillRect(x, y, 20, 20, ((x + y) / 20) % 2 ? kWhite : kBg);
      }
    }
  }
  if (displayStep_ >= 8) {
    drawHeader(displayStep_ == 8 ? "TEXT TEST" : "GEOMETRY TEST");
    diagTft.printf("width=%d height=%d rot=%u\n", diagTft.width(),
                   diagTft.height(), MariaBoard::kLandscapeRotation);
    diagTft.drawRect(0, 0, 319, 239, kRed);
    diagTft.drawCircle(160, 120, 50, kCyan);
    diagTft.drawLine(0, 0, 319, 239, kGreen);
    diagTft.drawLine(319, 0, 0, 239, kAmber);
    diagTft.drawString("TL", 2, 20);
    diagTft.drawString("TR", 292, 20);
    diagTft.drawString("BL", 2, 220);
    diagTft.drawString("BR", 292, 220);
  }
  diagTft.setTextColor(kWhite, kBg);
  diagTft.drawString("Tap to continue. Back exits.", 8, 218);
  if (displayStep_ == kDisplayStepCount - 1) {
    setStatus(DiagnosticItem::Display, DiagnosticStatus::Pass,
              "sequence complete");
  }
  Serial.printf("[MARIA][DISPLAY] step=%u width=%d height=%d rotation=%u\n",
                displayStep_, diagTft.width(), diagTft.height(),
                MariaBoard::kLandscapeRotation);
}

void DiagnosticApp::drawTouchTest() {
  drawHeader("TOUCH TEST / CALIBRATION");
#if MARIA_DISABLE_TOUCH
  diagTft.drawString("Touch disabled by build flag", 8, 40);
#else
  if (!touchReady_) {
    diagTft.drawString("Touch init failed - use serial menu", 8, 40);
    return;
  }
#if defined(MARIA_M5STACK_CORE2_RADAR_TERMINAL)
  M5.update();
  auto detail = M5.Touch.getDetail();
  lastTouchDetected_ = detail.isPressed();
  if (lastTouchDetected_) {
    lastRawX_ = detail.x;
    lastRawY_ = detail.y;
    if (detail.x < 0 || detail.y < 0 ||
        detail.x >= MariaBoard::kDisplayWidth ||
        detail.y >= MariaBoard::kDisplayHeight) {
      Serial.printf("[MARIA][TOUCH] FAIL out_of_range x=%d y=%d\n", detail.x,
                    detail.y);
      setStatus(DiagnosticItem::Touch, DiagnosticStatus::Fail,
                "coordinate out of range");
    } else {
      lastMappedX_ = detail.x;
      lastMappedY_ = detail.y;
      touchEvents_++;
      Serial.printf("[MARIA][TOUCH] PASS coordinate x=%d y=%d count=%u\n",
                    lastMappedX_, lastMappedY_, touchEvents_);
      setStatus(DiagnosticItem::Touch, DiagnosticStatus::Pass,
                "valid coordinate");
    }
  }
  diagTft.printf("Touch: %s\n", lastTouchDetected_ ? "pressed" : "idle");
  diagTft.printf("Point: %d,%d\n", lastMappedX_, lastMappedY_);
  diagTft.printf("Events: %u\n", touchEvents_);
  diagTft.println("FT6336U capacitive touch");
  if (lastTouchDetected_) {
    diagTft.drawCircle(lastMappedX_, lastMappedY_, 10, kAmber);
    diagTft.drawLine(lastMappedX_ - 8, lastMappedY_, lastMappedX_ + 8,
                     lastMappedY_, kAmber);
    diagTft.drawLine(lastMappedX_, lastMappedY_ - 8, lastMappedX_,
                     lastMappedY_ + 8, kAmber);
  }
#else
  lastTouchDetected_ = diagTouch.touched();
  if (lastTouchDetected_) {
    TS_Point point = diagTouch.getPoint();
    if (point.x > 0 && point.y > 0) {
      lastRawX_ = point.x;
      lastRawY_ = point.y;
      lastMappedX_ =
          mapCalibrated(point.x, touchBounds_.minX, touchBounds_.maxX, 0, 319);
      lastMappedY_ =
          mapCalibrated(point.y, touchBounds_.minY, touchBounds_.maxY, 0, 239);
      if (calibrationStep_ < 5) {
        calibrationSamples_[calibrationStep_].x = point.x;
        calibrationSamples_[calibrationStep_].y = point.y;
        calibrationSamples_[calibrationStep_].valid = true;
        calibrationStep_++;
        Serial.printf("[diag] touch sample step=%u raw=%d,%d mapped=%d,%d\n",
                      calibrationStep_, lastRawX_, lastRawY_, lastMappedX_,
                      lastMappedY_);
        if (calibrationStep_ == 5) {
          CalibrationBounds next{};
          next.minX = min(calibrationSamples_[0].x, calibrationSamples_[3].x);
          next.maxX = max(calibrationSamples_[1].x, calibrationSamples_[2].x);
          next.minY = min(calibrationSamples_[0].y, calibrationSamples_[1].y);
          next.maxY = max(calibrationSamples_[2].y, calibrationSamples_[3].y);
          if (validCalibrationBounds(next)) {
            touchBounds_ = next;
            saveTouchCalibration(touchBounds_);
            Serial.println("[diag] touch calibration saved");
          } else {
            Serial.println("[diag] touch calibration rejected");
            calibrationStep_ = 0;
          }
        }
      }
    }
  }
  diagTft.printf("Raw: %d,%d  detected:%s\n", lastRawX_, lastRawY_,
                 lastTouchDetected_ ? "yes" : "no");
  diagTft.printf("Mapped: %d,%d rotation:%u\n", lastMappedX_, lastMappedY_,
                 MariaBoard::kLandscapeRotation);
  diagTft.printf("Bounds X:%d-%d Y:%d-%d\n", touchBounds_.minX,
                 touchBounds_.maxX, touchBounds_.minY, touchBounds_.maxY);
  const char *steps[] = {"top-left", "top-right", "bottom-right",
                         "bottom-left", "center", "saved"};
  diagTft.printf("Calibration: touch %s\n", steps[min<uint8_t>(calibrationStep_, 5)]);
  diagTft.drawLine(lastMappedX_ - 8, lastMappedY_, lastMappedX_ + 8,
                   lastMappedY_, kAmber);
  diagTft.drawLine(lastMappedX_, lastMappedY_ - 8, lastMappedX_,
                   lastMappedY_ + 8, kAmber);
#endif
#endif
  drawFooterBack();
}

void DiagnosticApp::loadTouchCalibration() {
  Preferences store;
  store.begin(kPrefsNamespace, true);
  RadarPreferences prefs{};
  const size_t read = store.getBytes(kPrefsBlob, &prefs, sizeof(prefs));
  store.end();
  if (read == sizeof(prefs) && validPreferences(prefs) && prefs.touchCalibrated) {
    touchBounds_.minX = prefs.touchMinX;
    touchBounds_.maxX = prefs.touchMaxX;
    touchBounds_.minY = prefs.touchMinY;
    touchBounds_.maxY = prefs.touchMaxY;
  }
}

void DiagnosticApp::saveTouchCalibration(const CalibrationBounds &bounds) {
  Preferences store;
  store.begin(kPrefsNamespace, false);
  RadarPreferences prefs{};
  const size_t read = store.getBytes(kPrefsBlob, &prefs, sizeof(prefs));
  if (read != sizeof(prefs) || !validPreferences(prefs)) prefs = RadarPreferences{};
  prefs.touchCalibrated = true;
  prefs.touchMinX = bounds.minX;
  prefs.touchMaxX = bounds.maxX;
  prefs.touchMinY = bounds.minY;
  prefs.touchMaxY = bounds.maxY;
  store.putBytes(kPrefsBlob, &prefs, sizeof(prefs));
  store.end();
}

void DiagnosticApp::printBoardInfo() {
  Serial.printf("[board] family=%s\n", MariaBoard::kIdentity.family);
  Serial.printf("[board] pcb=%s\n", MariaBoard::kIdentity.pcbMarking);
  Serial.printf("[board] validation=%s pins=%s rev=%u\n",
                MariaBoard::kIdentity.validationStatus,
                MariaBoard::kPinValidationStatus,
                MariaBoard::kIdentity.profileRevision);
  Serial.printf("[pins] TFT miso=%d mosi=%d sclk=%d cs=%d dc=%d rst=%d\n",
                MariaBoard::kTftMiso, MariaBoard::kTftMosi,
                MariaBoard::kTftSclk, MariaBoard::kTftCs, MariaBoard::kTftDc,
                MariaBoard::kTftRst);
  Serial.printf("[pins] TOUCH miso=%d mosi=%d sclk=%d cs=%d irq=%d\n",
                MariaBoard::kTouchMiso, MariaBoard::kTouchMosi,
                MariaBoard::kTouchSclk, MariaBoard::kTouchCs,
                MariaBoard::kTouchIrq);
}

void DiagnosticApp::drawBoardInfo() {
  drawHeader("BOARD INFO");
  char line[96];
  diagTft.drawString("MARIA Flight Radar", 8, 28);
  diagTft.drawString(MariaBoard::kBoardName, 8, 50);
  snprintf(line, sizeof(line), "Chip rev:%u cores:%u %uMHz",
           ESP.getChipRevision(), ESP.getChipCores(), ESP.getCpuFreqMHz());
  diagTft.drawString(line, 8, 72);
  snprintf(line, sizeof(line), "Flash:%lu Heap:%lu Min:%lu",
           static_cast<unsigned long>(ESP.getFlashChipSize()),
           static_cast<unsigned long>(ESP.getFreeHeap()),
           static_cast<unsigned long>(ESP.getMinFreeHeap()));
  diagTft.drawString(line, 8, 94);
  snprintf(line, sizeof(line), "Mode: diagnostic %s %s", __DATE__, __TIME__);
  diagTft.drawString(line, 8, 116);
  snprintf(line, sizeof(line), "%ux%u rot=%u", MariaBoard::kDisplayWidth,
           MariaBoard::kDisplayHeight, MariaBoard::kLandscapeRotation);
  diagTft.drawString(line, 8, 138);
  diagTft.drawString(MariaBoard::kTftController, 8, 160);
  diagTft.drawString(MariaBoard::kTouchController, 8, 182);
  drawFooterBack();
}

void DiagnosticApp::drawWifiTest() {
  drawHeader("WI-FI DIAGNOSTICS");
  wl_status_t status = WiFi.status();
  diagTft.printf("State: %s\n", status == WL_CONNECTED ? "connected" : "offline");
  if (status == WL_CONNECTED) {
    diagTft.printf("IP: %s\n", WiFi.localIP().toString().c_str());
    setStatus(DiagnosticItem::WifiConnection, DiagnosticStatus::Pass,
              "connected");
  } else {
    diagTft.println("IP: unavailable offline");
    if (statuses_[static_cast<uint8_t>(DiagnosticItem::WifiConnection)] ==
        DiagnosticStatus::NotTested) {
      setStatus(DiagnosticItem::WifiConnection, DiagnosticStatus::Skipped,
                "offline");
    }
  }
  diagTft.printf("RSSI: %d dBm\n", status == WL_CONNECTED ? WiFi.RSSI() : 0);
  diagTft.println("Back exits. Retest: serial retest");
  int networks = WiFi.scanComplete();
  if (networks == WIFI_SCAN_FAILED && wifiScanStartedMs_ == 0) {
    wifiScanStartedMs_ = millis();
    WiFi.scanNetworks(true);
  }
  if (networks >= 0) {
    setStatus(DiagnosticItem::WifiScan, DiagnosticStatus::Pass, "scan complete");
    diagTft.printf("Networks: %d\n", networks);
    for (int i = 0; i < min(networks, 4); i++) {
      diagTft.printf("%s %d %s\n", WiFi.SSID(i).c_str(), WiFi.RSSI(i),
                     WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? "open" : "sec");
    }
  } else if (wifiScanStartedMs_ > 0 && millis() - wifiScanStartedMs_ > 10000) {
    setStatus(DiagnosticItem::WifiScan, DiagnosticStatus::Timeout,
              "scan timeout");
    diagTft.println("Scan timeout. Use retest.");
  } else {
    diagTft.println("Scan running...");
  }
  drawFooterBack();
}

void DiagnosticApp::runBackendTest(const GpsFix &fix) {
  (void)fix;
  const uint32_t started = millis();
  if (WiFi.status() != WL_CONNECTED) {
    strlcpy(backendMessage_, "wifi unavailable", sizeof(backendMessage_));
    backendStatus_ = 0;
    setStatus(DiagnosticItem::Backend, DiagnosticStatus::Skipped,
              "wifi unavailable");
    return;
  }
  char url[192];
  snprintf(url, sizeof(url),
           "%s/health", API_HOST);
  HTTPClient http;
  http.setTimeout(2500);
  if (!http.begin(url)) {
    strlcpy(backendMessage_, "http begin failed", sizeof(backendMessage_));
    backendStatus_ = -1;
    return;
  }
  backendStatus_ = http.GET();
  bool jsonOk = backendStatus_ >= 200 && backendStatus_ < 300;
  http.end();
  backendDurationMs_ = millis() - started;
  BackendDiagnosticState state = classifyBackendStatus(
      backendStatus_, jsonOk, true, true, backendDurationMs_ > 2600);
  snprintf(backendMessage_, sizeof(backendMessage_), "%s status=%d",
           backendStateLabel(state), backendStatus_);
  setStatus(DiagnosticItem::Backend,
            state == BackendDiagnosticState::HttpOk ? DiagnosticStatus::Pass
                                                    : DiagnosticStatus::Fail,
            backendMessage_);
  Serial.printf("[MARIA][BACKEND] %s duration=%lu\n", backendMessage_,
                static_cast<unsigned long>(backendDurationMs_));
}

void DiagnosticApp::drawBackendTest(const GpsFix &fix) {
  if (strcmp(backendMessage_, "untested") == 0) runBackendTest(fix);
  drawHeader("BACKEND DIAGNOSTICS");
  diagTft.printf("URL: %s\n", API_HOST);
  diagTft.printf("GPS: %s\n", fix.valid ? "fix" : "unavailable");
  diagTft.printf("HTTP: %d\n", backendStatus_);
  diagTft.printf("Duration: %lu ms\n", static_cast<unsigned long>(backendDurationMs_));
  diagTft.printf("Result: %s\n", backendMessage_);
  diagTft.println("No API key displayed. Back exits.");
  drawFooterBack();
}

void DiagnosticApp::runSdTest() {
#if MARIA_DISABLE_SD
  strlcpy(sdMessage_, "disabled by build flag", sizeof(sdMessage_));
  setStatus(DiagnosticItem::Sd, DiagnosticStatus::Skipped, sdMessage_);
#else
  if (!MariaBoard::sdBegin()) {
    strlcpy(sdMessage_, "no card or init unavailable", sizeof(sdMessage_));
    setStatus(DiagnosticItem::Sd, DiagnosticStatus::Skipped, sdMessage_);
    return;
  }
  File file = SD.open("/maria_diag.txt", FILE_WRITE);
  if (!file) {
    strlcpy(sdMessage_, "write open failed", sizeof(sdMessage_));
    setStatus(DiagnosticItem::Sd, DiagnosticStatus::Fail, sdMessage_);
    return;
  }
  file.println("MARIA diagnostic");
  file.close();
  file = SD.open("/maria_diag.txt", FILE_READ);
  bool readOk = file && file.available();
  if (file) file.close();
  SD.remove("/maria_diag.txt");
  snprintf(sdMessage_, sizeof(sdMessage_), "type=%u size=%lluMB read=%s",
           SD.cardType(), SD.cardSize() / (1024ULL * 1024ULL),
           readOk ? "ok" : "failed");
  setStatus(DiagnosticItem::Sd, readOk ? DiagnosticStatus::Pass
                                       : DiagnosticStatus::Fail,
            sdMessage_);
#endif
}

void DiagnosticApp::drawSdTest() {
  if (strcmp(sdMessage_, "untested") == 0) runSdTest();
  drawHeader("SD DIAGNOSTICS");
  diagTft.drawString(sdMessage_, 8, 40);
  diagTft.drawString("No erase or format performed.", 8, 70);
  drawFooterBack();
}

void DiagnosticApp::runLedStep() {
  if (MariaBoard::kRgbLedRed < 0 || MariaBoard::kRgbLedGreen < 0 ||
      MariaBoard::kRgbLedBlue < 0) {
    return;
  }
  const bool activeLow = MariaBoard::kRgbActiveLevel == LOW;
  const bool states[][3] = {{0, 0, 0}, {1, 0, 0}, {0, 1, 0}, {0, 0, 1},
                            {1, 1, 1}, {0, 1, 1}, {1, 1, 0}};
  ledStep_ = (ledStep_ + 1) % 7;
  digitalWrite(MariaBoard::kRgbLedRed, rgbOutputLevel(activeLow, states[ledStep_][0]));
  digitalWrite(MariaBoard::kRgbLedGreen, rgbOutputLevel(activeLow, states[ledStep_][1]));
  digitalWrite(MariaBoard::kRgbLedBlue, rgbOutputLevel(activeLow, states[ledStep_][2]));
}

void DiagnosticApp::drawLedTest() {
  drawHeader("RGB LED TEST");
  if (MariaBoard::kRgbLedRed < 0 || MariaBoard::kRgbLedGreen < 0 ||
      MariaBoard::kRgbLedBlue < 0) {
    setStatus(DiagnosticItem::Rgb, DiagnosticStatus::Unsupported,
              "no Core2 RGB LED");
    diagTft.drawString("Unsupported on this board profile", 8, 40);
    drawFooterBack();
    return;
  }
  runLedStep();
  diagTft.printf("Step: %u\n", ledStep_);
  diagTft.drawString("Pins unverified. Slow manual sequence.", 8, 60);
  setStatus(DiagnosticItem::Rgb, DiagnosticStatus::Running, "manual observe");
  drawFooterBack();
}

void DiagnosticApp::beep(uint16_t hz, uint16_t ms) {
  MariaBoard::beep(hz, ms);
}

void DiagnosticApp::drawSpeakerTest() {
  drawHeader("SPEAKER TEST");
#if MARIA_DISABLE_AUDIO
  diagTft.drawString("Audio disabled by build flag", 8, 40);
  setStatus(DiagnosticItem::Speaker, DiagnosticStatus::Skipped,
            "audio disabled");
  return;
#endif
  diagTft.drawString("Tap Play for a short safe tone.", 8, 40);
  diagTft.drawString("Tap Heard after confirming audio.", 8, 64);
  drawButton(8, 106, 86, "Play");
  drawButton(112, 106, 86, "Heard");
  drawButton(216, 106, 86, "Skip");
  drawFooterBack();
}

void DiagnosticApp::drawRadarDemo() {
  drawHeader("OFFLINE RADAR DEMO");
  uint32_t now = millis();
  const int cx = 126;
  const int cy = 122;
  const int radius = 82;
  diagTft.drawCircle(cx, cy, radius, kCyan);
  diagTft.drawCircle(cx, cy, radius / 2, 0x03ef);
  diagTft.drawString("N", cx - 4, cy - radius - 15);
  for (uint8_t i = 0; i < kDemoAircraftCount; i++) {
    DemoAircraft demo = demoAircraftAt(i, demoPaused_ ? 0 : now);
    ScreenPoint p = projectTarget(demo.bearingDeg, demo.distanceKm, demoRangeKm_,
                                  cx, cy, radius);
    if (!p.visible) continue;
    AlertZone zone = classifyAlertZone(demo.distanceKm, AlertThresholds{});
    uint16_t color = zone == AlertZone::Critical
                         ? kRed
                         : zone == AlertZone::Warning ? kAmber : kGreen;
    diagTft.fillCircle(p.x, p.y, i == demoSelected_ ? 5 : 3, color);
  }
  DemoAircraft selected = demoAircraftAt(demoSelected_, demoPaused_ ? 0 : now);
  diagTft.setTextColor(kWhite, kBg);
  diagTft.printf("range=%ukm sel=%d %.1fkm %.0fm\n", demoRangeKm_,
                 demoSelected_ + 1, selected.distanceKm,
                 selected.altitudeMeters);
  diagTft.printf("%s touch=%s\n", demoPaused_ ? "paused" : "running",
#if MARIA_DISABLE_TOUCH
                 "disabled"
#else
                 "compiled"
#endif
  );
  drawButton(8, 202, 72, "Back");
  drawButton(88, 202, 72, "Range");
  drawButton(168, 202, 72, demoPaused_ ? "Run" : "Pause");
  drawButton(248, 202, 64, "Next");
  if (statuses_[static_cast<uint8_t>(DiagnosticItem::RadarDemo)] ==
      DiagnosticStatus::Running) {
    setStatus(DiagnosticItem::RadarDemo, DiagnosticStatus::Pass,
              "offline demo displayed");
  }
}

void DiagnosticApp::drawSummary() {
  drawHeader("DIAGNOSTIC SUMMARY");
  diagTft.printf("%s %s\n", MariaBoard::kBoardName, __DATE__);
  const DiagnosticItem items[] = {
      DiagnosticItem::Display, DiagnosticItem::Touch,      DiagnosticItem::Board,
      DiagnosticItem::WifiScan, DiagnosticItem::WifiConnection,
      DiagnosticItem::Backend, DiagnosticItem::Sd,         DiagnosticItem::Rgb,
      DiagnosticItem::Speaker, DiagnosticItem::RadarDemo,  DiagnosticItem::NormalMode};
  for (uint8_t i = 0; i < 8; i++) {
    const DiagnosticItem item = items[i];
    diagTft.printf("%-10s %s\n", diagnosticItemLabel(item),
                   diagnosticStatusLabel(statuses_[static_cast<uint8_t>(item)]));
  }
  const bool ready =
      diagnosticSummaryReady(statuses_, static_cast<uint8_t>(DiagnosticItem::Count));
  diagTft.printf("Readiness: %s\n", ready ? "READY" : "PENDING");
  drawFooterBack();
}

void DiagnosticApp::drawNormalConfirm() {
  drawHeader("NORMAL MODE");
  diagTft.drawString("Restart into normal radar?", 8, 48);
  diagTft.drawString("Diagnostics remain available", 8, 74);
  diagTft.drawString("by flashing diag or holding BtnA.", 8, 96);
  drawButton(8, 140, 110, "Confirm");
  drawButton(134, 140, 86, "Cancel");
  drawFooterBack();
}

void DiagnosticApp::handleSerial() {
  while (Serial.available()) {
    char ch = static_cast<char>(Serial.read());
    if (ch == '\n' || ch == '\r') {
      serialBuffer_[serialLength_] = '\0';
      SerialCommand command = parseSerialCommand(serialBuffer_);
      serialLength_ = 0;
      if (command == SerialCommand::Help) {
        Serial.println("help info display touch wifi backend sd led speaker demo summary normal reboot retest wifi-clear");
      } else if (command == SerialCommand::Reboot) {
        Serial.println("[diag] rebooting");
        ESP.restart();
      } else if (command == SerialCommand::Retest) {
        strlcpy(backendMessage_, "untested", sizeof(backendMessage_));
        strlcpy(sdMessage_, "untested", sizeof(sdMessage_));
        wifiScanStartedMs_ = 0;
        WiFi.scanDelete();
        for (uint8_t i = 0; i < static_cast<uint8_t>(DiagnosticItem::Count); i++) {
          statuses_[i] = DiagnosticStatus::NotTested;
        }
        setStatus(DiagnosticItem::Board, DiagnosticStatus::Pass,
                  "board info ready");
        if (!core2RgbSupported()) {
          setStatus(DiagnosticItem::Rgb, DiagnosticStatus::Unsupported,
                    "no Core2 RGB diagnostic");
        }
        lastDrawMs_ = 0;
        Serial.println("[MARIA][DIAG] retest queued");
      } else if (command == SerialCommand::WifiClear) {
        WiFi.disconnect(true, true);
        lastDrawMs_ = 0;
        Serial.println("[diag] wifi settings cleared");
      } else if (command == SerialCommand::Unknown) {
        Serial.println("[diag] unknown command");
      } else {
        if (command == SerialCommand::Backend)
          strlcpy(backendMessage_, "untested", sizeof(backendMessage_));
        if (command == SerialCommand::Sd)
          strlcpy(sdMessage_, "untested", sizeof(sdMessage_));
        setScreen(screenForCommand(command));
      }
    } else if (serialLength_ + 1 < sizeof(serialBuffer_)) {
      serialBuffer_[serialLength_++] = ch;
    }
  }
}

void DiagnosticApp::handleTouch() {
#if defined(MARIA_M5STACK_CORE2_RADAR_TERMINAL) && !MARIA_DISABLE_TOUCH
  M5.update();
  auto detail = M5.Touch.getDetail();
  if (!detail.wasPressed()) return;
  const int16_t x = detail.x;
  const int16_t y = detail.y;
  if (screen_ == DiagnosticScreen::Menu) {
    if (y >= 34 && y < 224) {
      const uint8_t col = x >= 160 ? 1 : 0;
      const uint8_t row = static_cast<uint8_t>((y - 34) / 38);
      const uint8_t index = row * 2 + col;
      const DiagnosticScreen screens[] = {
          DiagnosticScreen::Display,   DiagnosticScreen::Touch,
          DiagnosticScreen::BoardInfo, DiagnosticScreen::Wifi,
          DiagnosticScreen::Backend,   DiagnosticScreen::Sd,
          DiagnosticScreen::Led,       DiagnosticScreen::Speaker,
          DiagnosticScreen::RadarDemo, DiagnosticScreen::Normal};
      if (index < sizeof(screens) / sizeof(screens[0])) setScreen(screens[index]);
    }
    return;
  }
  if (y >= 202 && x < 110) {
    if (screen_ == DiagnosticScreen::Touch) {
      Serial.println("[MARIA][TOUCH] exit");
    }
    if (screen_ == DiagnosticScreen::RadarDemo) {
      Serial.println("[MARIA][RADAR] demo exit");
    }
    setScreen(DiagnosticScreen::Menu);
  } else if (screen_ == DiagnosticScreen::Speaker && y >= 100 && y <= 150) {
    if (x < 104) {
      beep(880, 120);
      Serial.println("[MARIA][SPEAKER] play");
    } else if (x < 208) {
      setStatus(DiagnosticItem::Speaker, DiagnosticStatus::Pass,
                "user confirmed");
    } else {
      setStatus(DiagnosticItem::Speaker, DiagnosticStatus::Skipped,
                "user skipped");
    }
    lastDrawMs_ = 0;
  } else if (screen_ == DiagnosticScreen::RadarDemo && y >= 202) {
    if (x < 88) {
      Serial.println("[MARIA][RADAR] demo exit");
      setScreen(DiagnosticScreen::Menu);
    } else if (x < 168) {
      demoRangeKm_ = demoRangeKm_ == 25 ? 50 : demoRangeKm_ == 50 ? 100 : demoRangeKm_ == 100 ? 200 : 25;
      Serial.printf("[MARIA][RADAR] range=%u\n", demoRangeKm_);
    } else if (x < 248) {
      demoPaused_ = !demoPaused_;
      Serial.printf("[MARIA][RADAR] %s\n", demoPaused_ ? "paused" : "running");
    } else {
      demoSelected_ = (demoSelected_ + 1) % kDemoAircraftCount;
      Serial.printf("[MARIA][RADAR] selected=%d\n", demoSelected_ + 1);
    }
    lastDrawMs_ = 0;
  } else if (screen_ == DiagnosticScreen::RadarDemo) {
    demoSelected_ = (demoSelected_ + 1) % kDemoAircraftCount;
    lastDrawMs_ = 0;
  } else if (screen_ == DiagnosticScreen::Normal && y >= 135 && y <= 180) {
    if (x < 126) {
      normalConfirm_ = true;
      setStatus(DiagnosticItem::NormalMode, DiagnosticStatus::Pass,
                "confirmed");
      Serial.println("[MARIA][NORMAL] confirmed");
      Serial.flush();
    } else {
      normalConfirm_ = false;
      setStatus(DiagnosticItem::NormalMode, DiagnosticStatus::Skipped,
                "cancelled");
      setScreen(DiagnosticScreen::Menu);
    }
  }
#endif
}

}  // namespace MariaRadar

#if defined(MARIA_M5STACK_CORE2_RADAR_TERMINAL)
#undef diagTft
#endif

#endif
