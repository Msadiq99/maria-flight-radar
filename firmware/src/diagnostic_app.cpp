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
#if defined(MARIA_M5STACK_CORE2_RADAR_TERMINAL)
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
  Serial.println("[diag] MARIA diagnostics ready");
  Serial.println("[diag] commands: help info display touch wifi backend sd led speaker demo normal reboot");
  printBoardInfo();
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
  Serial.printf("[diag] screen=%s\n", screenName(screen_));
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
    case DiagnosticScreen::Normal:
      return true;
  }
  return screen_ == DiagnosticScreen::Normal;
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

void DiagnosticApp::drawMenu() {
  drawHeader("MARIA FIRST-FLASH DIAGNOSTICS");
  const char *items[] = {"1 Display", "2 Touch", "3 Board", "4 WiFi",
                         "5 Backend", "6 SD",    "7 RGB",   "8 Speaker",
                         "9 Radar",   "10 Normal"};
  for (uint8_t i = 0; i < 10; i++) {
    int16_t x = (i % 2) ? 164 : 8;
    int16_t y = 34 + (i / 2) * 38;
    drawButton(x, y, 148, items[i]);
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
  Serial.printf("[diag] display step=%u width=%d height=%d rotation=%u\n",
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
    lastMappedX_ = constrain(detail.x, 0, MariaBoard::kDisplayWidth - 1);
    lastMappedY_ = constrain(detail.y, 0, MariaBoard::kDisplayHeight - 1);
  }
  diagTft.printf("Touch: %s\n", lastTouchDetected_ ? "pressed" : "idle");
  diagTft.printf("Point: %d,%d\n", lastMappedX_, lastMappedY_);
  diagTft.println("FT6336U capacitive touch");
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
  drawButton(8, 202, 86, "Menu");
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
  snprintf(line, sizeof(line), "Chip rev:%u cores:%u", ESP.getChipRevision(),
           ESP.getChipCores());
  diagTft.drawString(line, 8, 32);
  snprintf(line, sizeof(line), "Flash:%lu Heap:%lu Min:%lu",
           static_cast<unsigned long>(ESP.getFlashChipSize()),
           static_cast<unsigned long>(ESP.getFreeHeap()),
           static_cast<unsigned long>(ESP.getMinFreeHeap()));
  diagTft.drawString(line, 8, 56);
  snprintf(line, sizeof(line), "MAC:%s", WiFi.macAddress().c_str());
  diagTft.drawString(line, 8, 80);
  diagTft.drawString(MariaBoard::kPcbMarking, 8, 104);
  diagTft.drawString(MariaBoard::kValidationStatus, 8, 128);
  diagTft.drawString(MariaBoard::kTftController, 8, 152);
  diagTft.drawString(MariaBoard::kTouchController, 8, 176);
  diagTft.drawString(MariaBoard::kPinValidationStatus, 8, 198);
}

void DiagnosticApp::drawWifiTest() {
  drawHeader("WI-FI DIAGNOSTICS");
  wl_status_t status = WiFi.status();
  diagTft.printf("State: %s\n", status == WL_CONNECTED ? "connected" : "offline");
  diagTft.printf("IP: %s\n", WiFi.localIP().toString().c_str());
  diagTft.printf("GW: %s\n", WiFi.gatewayIP().toString().c_str());
  diagTft.printf("DNS: %s\n", WiFi.dnsIP().toString().c_str());
  diagTft.printf("MAC: %s\n", WiFi.macAddress().c_str());
  diagTft.printf("RSSI: %d dBm\n", status == WL_CONNECTED ? WiFi.RSSI() : 0);
  diagTft.println("Serial: wifi / wifi-clear");
  int networks = WiFi.scanComplete();
  if (networks == WIFI_SCAN_FAILED) WiFi.scanNetworks(true);
  if (networks >= 0) {
    diagTft.printf("Networks: %d\n", networks);
    for (int i = 0; i < min(networks, 4); i++) {
      diagTft.printf("%s %d %s\n", WiFi.SSID(i).c_str(), WiFi.RSSI(i),
                     WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? "open" : "sec");
    }
  } else {
    diagTft.println("Scan running...");
  }
}

void DiagnosticApp::runBackendTest(const GpsFix &fix) {
  const uint32_t started = millis();
  BackendDiagnosticState preflight = classifyBackendStatus(
      0, false, WiFi.status() == WL_CONNECTED, fix.valid, false);
  if (preflight != BackendDiagnosticState::JsonMalformed &&
      preflight != BackendDiagnosticState::HttpOk) {
    strlcpy(backendMessage_, backendStateLabel(preflight),
            sizeof(backendMessage_));
    backendStatus_ = 0;
    return;
  }
  char url[192];
  snprintf(url, sizeof(url),
           "%s/api/traffic/nearby?lat=%.6f&lon=%.6f&radius_km=25", API_HOST,
           fix.latitude, fix.longitude);
  HTTPClient http;
  http.setTimeout(2500);
  if (!http.begin(url)) {
    strlcpy(backendMessage_, "http begin failed", sizeof(backendMessage_));
    backendStatus_ = -1;
    return;
  }
  backendStatus_ = http.GET();
  JsonDocument doc;
  bool jsonOk = backendStatus_ >= 200 && backendStatus_ < 300 &&
                deserializeJson(doc, http.getStream()) == DeserializationError::Ok;
  uint8_t count = jsonOk ? doc["aircraft"].size() : 0;
  http.end();
  backendDurationMs_ = millis() - started;
  BackendDiagnosticState state = classifyBackendStatus(
      backendStatus_, jsonOk, true, true, backendDurationMs_ > 2600);
  snprintf(backendMessage_, sizeof(backendMessage_), "%s status=%d count=%u",
           backendStateLabel(state), backendStatus_, count);
  Serial.printf("[diag] backend %s duration=%lu\n", backendMessage_,
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
  diagTft.println("No API key displayed.");
}

void DiagnosticApp::runSdTest() {
#if MARIA_DISABLE_SD
  strlcpy(sdMessage_, "disabled by build flag", sizeof(sdMessage_));
#else
  if (!MariaBoard::sdBegin()) {
    strlcpy(sdMessage_, "SD init failed or unavailable", sizeof(sdMessage_));
    return;
  }
  File file = SD.open("/maria_diag.txt", FILE_WRITE);
  if (!file) {
    strlcpy(sdMessage_, "write open failed", sizeof(sdMessage_));
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
#endif
}

void DiagnosticApp::drawSdTest() {
  if (strcmp(sdMessage_, "untested") == 0) runSdTest();
  drawHeader("SD DIAGNOSTICS");
  diagTft.drawString(sdMessage_, 8, 40);
  diagTft.drawString("No erase or format performed.", 8, 70);
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
    diagTft.drawString("Unsupported on this board profile", 8, 40);
    return;
  }
  runLedStep();
  diagTft.printf("Step: %u\n", ledStep_);
  diagTft.drawString("Pins unverified. Slow manual sequence.", 8, 60);
}

void DiagnosticApp::beep(uint16_t hz, uint16_t ms) {
  MariaBoard::beep(hz, ms);
}

void DiagnosticApp::drawSpeakerTest() {
  drawHeader("SPEAKER TEST");
#if MARIA_DISABLE_AUDIO
  diagTft.drawString("Audio disabled by build flag", 8, 40);
  return;
#endif
  beep(880, 120);
  diagTft.drawString("Short low-volume beep requested", 8, 40);
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
  diagTft.printf("range=%ukm targets=%u heap=%lu\n", demoRangeKm_,
                 kDemoAircraftCount, static_cast<unsigned long>(ESP.getFreeHeap()));
  diagTft.printf("redraw=%lums selected=%d touch=%s\n",
                 static_cast<unsigned long>(millis() - now), demoSelected_,
#if MARIA_DISABLE_TOUCH
                 "disabled"
#else
                 "compiled"
#endif
  );
}

void DiagnosticApp::handleSerial() {
  while (Serial.available()) {
    char ch = static_cast<char>(Serial.read());
    if (ch == '\n' || ch == '\r') {
      serialBuffer_[serialLength_] = '\0';
      SerialCommand command = parseSerialCommand(serialBuffer_);
      serialLength_ = 0;
      if (command == SerialCommand::Help) {
        Serial.println("help info display touch wifi backend sd led speaker demo normal reboot retest wifi-clear");
      } else if (command == SerialCommand::Reboot) {
        Serial.println("[diag] rebooting");
        ESP.restart();
      } else if (command == SerialCommand::Retest) {
        strlcpy(backendMessage_, "untested", sizeof(backendMessage_));
        strlcpy(sdMessage_, "untested", sizeof(sdMessage_));
        lastDrawMs_ = 0;
        Serial.println("[diag] retest queued");
      } else if (command == SerialCommand::WifiClear) {
        WiFi.disconnect(true, true);
        lastDrawMs_ = 0;
        Serial.println("[diag] wifi settings cleared");
      } else if (command == SerialCommand::Unknown) {
        Serial.println("[diag] unknown command");
      } else {
        if (command == SerialCommand::Backend) strlcpy(backendMessage_, "untested", sizeof(backendMessage_));
        if (command == SerialCommand::Sd) strlcpy(sdMessage_, "untested", sizeof(sdMessage_));
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
    setScreen(DiagnosticScreen::Menu);
  } else if (screen_ == DiagnosticScreen::RadarDemo && y >= 202) {
    if (x < 170) {
      demoRangeKm_ = demoRangeKm_ == 25 ? 50 : demoRangeKm_ == 50 ? 100 : demoRangeKm_ == 100 ? 200 : 25;
    } else {
      demoPaused_ = !demoPaused_;
    }
    lastDrawMs_ = 0;
  }
#endif
}

}  // namespace MariaRadar

#if defined(MARIA_M5STACK_CORE2_RADAR_TERMINAL)
#undef diagTft
#endif

#endif
