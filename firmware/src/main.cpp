#include <Arduino.h>
#include <M5Unified.h>
#include <WiFi.h>
#include <esp_task_wdt.h>

#include "config.h"
#include "gps_reader.h"
#include "imu_reader.h"
#include "pins.h"
#include "telemetry_client.h"
#include "wifi_manager.h"

#ifndef SIMULATE_GPS_WHEN_NO_FIX
#define SIMULATE_GPS_WHEN_NO_FIX false
#endif

WifiManager wifiManager;
GpsReader gpsReader;
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
