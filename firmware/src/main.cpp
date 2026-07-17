#include <Arduino.h>
#include <WiFi.h>
#include <esp_system.h>
#include <esp_task_wdt.h>

#include "config.h"
#include "gps_reader.h"
#include "pins.h"
#include "wifi_manager.h"

#if defined(MARIA_ESP32_28_RADAR_TERMINAL) || \
    defined(MARIA_M5STACK_CORE2_RADAR_TERMINAL)
#if defined(MARIA_M5STACK_CORE2_RADAR_TERMINAL)
#include "board_profiles/m5stack_core2.h"
#include <M5Unified.h>
#else
#include "board_profiles/esp32_2432s028r.h"
#endif
#include "radar_terminal/diagnostic_app.h"
#include "radar_terminal/radar_screen.h"
#include "radar_terminal/radar_settings.h"
#include "radar_terminal/touch_controller.h"
#include "radar_terminal/traffic_client.h"
#else
#include <M5Unified.h>

#include "imu_reader.h"
#include "telemetry_client.h"
#endif

#ifndef SIMULATE_GPS_WHEN_NO_FIX
#define SIMULATE_GPS_WHEN_NO_FIX false
#endif

#ifndef FIRMWARE_VERSION
#define FIRMWARE_VERSION "dev"
#endif

WifiManager wifiManager;
GpsReader gpsReader;

#if defined(MARIA_ESP32_28_RADAR_TERMINAL) || \
    defined(MARIA_M5STACK_CORE2_RADAR_TERMINAL)

MariaRadar::RadarSettings radarSettings;
MariaRadar::RadarScreen radarScreen;
MariaRadar::TouchController touchController;
MariaRadar::TrafficClient trafficClient;
MariaRadar::DiagnosticApp diagnosticApp;

MariaRadar::TerminalScreen terminalScreen = MariaRadar::TerminalScreen::Radar;
uint32_t lastDisplayAtMs = 0;
int selectedAircraft = -1;
bool diagnosticsActive = false;

void bootStatus(const char *stage, const char *state, const char *detail = nullptr) {
  M5.Display.fillScreen(TFT_BLACK);
  M5.Display.setTextColor(TFT_CYAN, TFT_BLACK);
  M5.Display.setTextFont(2);
  M5.Display.setCursor(8, 8);
  M5.Display.println("MARIA FLIGHT RADAR");
  M5.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  M5.Display.println("BOOTING...");
  M5.Display.printf("%s  %s\n", stage, state);
  if (detail != nullptr) M5.Display.println(detail);
  Serial.printf("[MARIA][BOOT] %s=%s%s%s\n", stage, state,
                detail == nullptr ? "" : " ", detail == nullptr ? "" : detail);
  Serial.flush();
}

void bootLog(const char *stage, const char *message) {
  Serial.printf("[MARIA][%s] %s\n", stage, message);
  Serial.flush();
}

GpsFix simulatedFix() {
  const float step = (millis() / 1000) % 240;
  GpsFix fix;
  fix.valid = true;
  fix.latitude = 24.7136 + sin(step * 0.02f) * 0.01f;
  fix.longitude = 46.6753 + cos(step * 0.02f) * 0.01f;
  fix.altitudeMeters = 612;
  fix.speedKmph = 0;
  fix.courseDeg = 0;
  fix.satellites = 9;
  return fix;
}

uint16_t nextRange(uint16_t current) {
  if (current == 25) return 50;
  if (current == 50) return 100;
  if (current == 100) return 200;
  return 25;
}

void selectRelative(int step, const MariaRadar::RadarPreferences &preferences) {
  const MariaRadar::Aircraft *aircraft = trafficClient.aircraft();
  const uint8_t count = trafficClient.count();
  if (count == 0) {
    selectedAircraft = -1;
    return;
  }
  int start = selectedAircraft < 0 ? 0 : selectedAircraft;
  for (uint8_t attempt = 0; attempt < count; attempt++) {
    int candidate = (start + step * (attempt + 1) + count) % count;
    if (MariaRadar::altitudeMatches(aircraft[candidate],
                                    preferences.altitudeFilter)) {
      selectedAircraft = candidate;
      return;
    }
  }
  selectedAircraft = -1;
}

void handleTouch(const MariaRadar::TouchEvent &event) {
  if (event.action == MariaRadar::TouchAction::None) return;

  MariaRadar::RadarPreferences preferences = radarSettings.get();
  switch (event.action) {
    case MariaRadar::TouchAction::Previous:
      selectRelative(-1, preferences);
      break;
    case MariaRadar::TouchAction::Next:
      selectRelative(1, preferences);
      break;
    case MariaRadar::TouchAction::Range:
      preferences.rangeKm = nextRange(preferences.rangeKm);
      radarSettings.save(preferences);
      break;
    case MariaRadar::TouchAction::Pause:
      preferences.sweepPaused = !preferences.sweepPaused;
      radarSettings.save(preferences);
      break;
    case MariaRadar::TouchAction::Details:
      terminalScreen = terminalScreen == MariaRadar::TerminalScreen::Details
                           ? MariaRadar::TerminalScreen::Radar
                           : MariaRadar::TerminalScreen::Details;
      break;
    case MariaRadar::TouchAction::Status:
      terminalScreen = MariaRadar::TerminalScreen::Status;
      break;
    case MariaRadar::TouchAction::Settings:
      terminalScreen = MariaRadar::TerminalScreen::Settings;
      break;
    case MariaRadar::TouchAction::Back:
      terminalScreen = MariaRadar::TerminalScreen::Radar;
      break;
    case MariaRadar::TouchAction::ToggleLabels:
      preferences.labelsEnabled = !preferences.labelsEnabled;
      radarSettings.save(preferences);
      break;
    case MariaRadar::TouchAction::ToggleTrails:
      preferences.trailsEnabled = !preferences.trailsEnabled;
      radarSettings.save(preferences);
      break;
    case MariaRadar::TouchAction::FactoryReset:
      radarSettings.reset();
      terminalScreen = MariaRadar::TerminalScreen::Radar;
      break;
    case MariaRadar::TouchAction::None:
      break;
  }
  lastDisplayAtMs = 0;
}

void setup() {
  Serial.begin(MariaBoard::kSerialBaud);
  delay(50);
  Serial.printf("[MARIA][BOOT] start reset=%d heap=%lu mode=normal build=%s\n",
                static_cast<int>(esp_reset_reason()),
                static_cast<unsigned long>(ESP.getFreeHeap()), FIRMWARE_VERSION);
  Serial.flush();
  bootLog("BOARD", "M5Stack Core2");
  MariaBoard::begin();
  bootStatus("1. DISPLAY", "OK");
  esp_task_wdt_init(10, true);
  esp_task_wdt_add(nullptr);
  bootStatus("2. SETTINGS", "WAIT");
  radarSettings.begin();
  bootStatus("2. SETTINGS", "OK");
  diagnosticsActive = MariaRadar::diagnosticBootRequested();
  if (diagnosticsActive) {
    diagnosticApp.begin(&wifiManager);
  } else {
    radarScreen.begin();
#if !MARIA_DISABLE_TOUCH
    touchController.begin();
#endif
  }
  bootStatus("3. WIFI", "WAIT");
  gpsReader.begin(Serial2, GPS_RX_PIN, GPS_TX_PIN, GPS_BAUD);
  wifiManager.begin(WIFI_SSID, WIFI_PASSWORD);
  if (wifiManager.provisioningActive()) {
    bootStatus("3. WIFI", "SETUP", "http://maria-radar.local");
    bootLog("WIFI", "setup mode");
  } else {
    bootStatus("3. WIFI", "OK", "connecting in background");
    bootLog("WIFI", "connecting");
  }
  bootStatus("4. BACKEND", "WAIT", API_HOST);
  trafficClient.begin(API_HOST, API_KEY);
  bootStatus("4. BACKEND", "SKIP", "nonblocking; live polling continues");
  bootStatus("5. RADAR", "OK", "DEMO fallback ready");
  radarScreen.begin();
  bootLog("RADAR", "targets=simulation fallback");
  Serial.printf("[MARIA][READY] normal runtime heap=%lu\n",
                static_cast<unsigned long>(ESP.getFreeHeap()));
  Serial.flush();
}

void loop() {
  esp_task_wdt_reset();
  wifiManager.poll();
  gpsReader.poll();

  uint32_t now = millis();
  GpsFix fix = gpsReader.currentFix();
  if (SIMULATE_GPS_WHEN_NO_FIX && !fix.valid) {
    fix = simulatedFix();
  }

  if (diagnosticsActive) {
    if (diagnosticApp.poll(fix)) {
      diagnosticsActive = false;
      radarScreen.begin();
#if !MARIA_DISABLE_TOUCH
      touchController.begin();
#endif
    }
    return;
  }

  MariaRadar::RadarPreferences preferences = radarSettings.get();
#if !MARIA_DISABLE_TOUCH
  handleTouch(touchController.poll(preferences));
#endif
  preferences = radarSettings.get();

  if (!fix.valid) fix = simulatedFix();
  trafficClient.poll(wifiManager.isConnected(), fix, preferences.rangeKm, now);
  selectedAircraft = MariaRadar::selectedAfterFiltering(
      trafficClient.aircraft(), trafficClient.count(), selectedAircraft,
      preferences.altitudeFilter);

  if (now - lastDisplayAtMs >= (preferences.sweepPaused ? 1000 : 120)) {
    lastDisplayAtMs = now;
    radarScreen.draw(terminalScreen, preferences, trafficClient.aircraft(),
                     trafficClient.count(), selectedAircraft, fix,
                     trafficClient.state(now, wifiManager.isConnected(),
                                         fix.valid),
                     now);
  }
}

#else

ImuReader imuReader;
TelemetryClient telemetryClient;

uint32_t lastTelemetryAtMs = 0;
uint32_t lastDisplayAtMs = 0;
int lastHttpStatus = 0;

enum DisplayPage {
  PAGE_STATUS,
  PAGE_GPS,
  PAGE_IMU,
};

DisplayPage displayPage = PAGE_STATUS;

GpsFix simulatedFix() {
  const float step = (millis() / TELEMETRY_INTERVAL_MS) % 240;
  const float loop = step < 120 ? step : 240 - step;

  GpsFix fix;
  fix.valid = true;
  fix.latitude = 24.7136 + loop * 0.00003;
  fix.longitude = 46.6753 + step * 0.000025;
  fix.altitudeMeters = 612.0 + sin(step * 0.05f) * 8.0f;
  fix.speedKmph = 35.0 + sin(step * 0.08f) * 12.0f;
  fix.courseDeg = fmod(90.0 + step * 2.0, 360.0);
  fix.satellites = 9;
  return fix;
}

void drawStatus(const GpsFix &fix, const ImuSample &imu, int httpStatus) {
  M5.Display.fillScreen(TFT_BLACK);
  M5.Display.setCursor(0, 0);
  M5.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  M5.Display.setTextSize(1);

  M5.Display.println("MARIA Flight Radar");
  M5.Display.println("------------------");
  M5.Display.printf("Page: %s\n\n",
                    displayPage == PAGE_STATUS ? "Status" : displayPage == PAGE_GPS ? "GPS" : "IMU");

  if (displayPage == PAGE_STATUS) {
    M5.Display.printf("WiFi: %s\n", wifiManager.isConnected()
                                         ? "connected"
                                         : wifiManager.provisioningActive()
                                               ? "setup AP"
                                               : "offline");
    M5.Display.printf("RSSI: %d dBm\n", wifiManager.isConnected() ? WiFi.RSSI() : 0);
    M5.Display.printf("API:  %d\n", httpStatus);
    M5.Display.printf("GPS:  %s sats=%lu\n", fix.valid ? "fix" : "no fix",
                      (unsigned long)fix.satellites);
    M5.Display.printf("Mode: %s\n", SIMULATE_GPS_WHEN_NO_FIX ? "sim ok" : "real gps");
    M5.Display.printf("IMU:  %s\n", imu.valid ? "ok" : "missing");
    M5.Display.printf("Q/Ack: %lu/%lu fail=%lu\n",
                      (unsigned long)telemetryClient.queuedCount(),
                      (unsigned long)telemetryClient.acknowledgedSequence(),
                      (unsigned long)telemetryClient.failureCount());
  } else if (displayPage == PAGE_GPS) {
    M5.Display.printf("Fix:  %s\n", fix.valid ? "yes" : "no");
    M5.Display.printf("Sats: %lu\n", (unsigned long)fix.satellites);
    M5.Display.printf("Lat:  %.6f\n", fix.latitude);
    M5.Display.printf("Lon:  %.6f\n", fix.longitude);
    M5.Display.printf("Alt:  %.1f m\n", fix.altitudeMeters);
    M5.Display.printf("Spd:  %.1f km/h\n", fix.speedKmph);
    M5.Display.printf("Crs:  %.1f deg\n", fix.courseDeg);
  } else {
    M5.Display.printf("Valid: %s\n", imu.valid ? "yes" : "no");
    M5.Display.printf("Ax: %.2f g\n", imu.accelX);
    M5.Display.printf("Ay: %.2f g\n", imu.accelY);
    M5.Display.printf("Az: %.2f g\n", imu.accelZ);
    M5.Display.printf("Gx: %.2f dps\n", imu.gyroX);
    M5.Display.printf("Gy: %.2f dps\n", imu.gyroY);
    M5.Display.printf("Gz: %.2f dps\n", imu.gyroZ);
    M5.Display.printf("Tmp: %.1f C\n", imu.temperatureC);
  }

  M5.Display.println();
  M5.Display.println("A/B: next page");
}

void setup() {
  auto cfg = M5.config();
  M5.begin(cfg);  // brings up the onboard MPU6886 IMU, display, and power management

  Serial.begin(115200);
  esp_task_wdt_init(10, true);
  esp_task_wdt_add(nullptr);
  pinMode(STATUS_LED_PIN, OUTPUT);
  M5.Display.setBrightness(80);
  M5.Display.setRotation(1);
  M5.Display.fillScreen(TFT_BLACK);
  M5.Display.setCursor(0, 0);
  M5.Display.setTextColor(TFT_WHITE, TFT_BLACK);
  M5.Display.setTextSize(1);
  M5.Display.println("MARIA Flight Radar");
  M5.Display.println("Booting...");

  gpsReader.begin(Serial2, GPS_RX_PIN, GPS_TX_PIN, GPS_BAUD);

  if (!imuReader.begin()) {
    Serial.println("[imu] onboard IMU not available");
  }

  wifiManager.begin(WIFI_SSID, WIFI_PASSWORD);
  telemetryClient.begin(API_HOST, API_TELEMETRY_PATH, API_KEY, DEVICE_ID);
  M5.Display.println("Telemetry ready");
}

void loop() {
  esp_task_wdt_reset();
  M5.update();
  wifiManager.poll();
  gpsReader.poll();

  digitalWrite(STATUS_LED_PIN, wifiManager.isConnected() ? HIGH : LOW);

  uint32_t now = millis();
  GpsFix fix = gpsReader.currentFix();
  ImuSample imu = imuReader.read();
  bool pageChanged = false;

  if (SIMULATE_GPS_WHEN_NO_FIX && !fix.valid) {
    fix = simulatedFix();
  }

  if (M5.BtnA.wasPressed() || M5.BtnB.wasPressed()) {
    displayPage = static_cast<DisplayPage>((displayPage + 1) % 3);
    pageChanged = true;
  }

  if (now - lastTelemetryAtMs >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryAtMs = now;
    lastHttpStatus =
        telemetryClient.send(fix, imu, M5.Power.getBatteryLevel());
    Serial.printf(
        "[telemetry] wifi_status=%d rssi=%d fix=%d sats=%lu status=%d "
        "imu_valid=%d accel=(%.2f,%.2f,%.2f)g\n",
        WiFi.status(), wifiManager.isConnected() ? WiFi.RSSI() : 0, fix.valid,
        (unsigned long)fix.satellites, lastHttpStatus, imu.valid, imu.accelX,
        imu.accelY, imu.accelZ);
  }

  if (pageChanged || now - lastDisplayAtMs >= 500) {
    lastDisplayAtMs = now;
    drawStatus(fix, imu, lastHttpStatus);
  }
}

#endif
