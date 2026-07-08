#include "telemetry_client.h"

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>

void TelemetryClient::begin(const char *apiHost, const char *apiPath,
                             const char *apiKey, const char *deviceId) {
  apiHost_ = apiHost;
  apiPath_ = apiPath;
  apiKey_ = apiKey;
  deviceId_ = deviceId;
}

int TelemetryClient::send(const GpsFix &fix, const ImuSample &imu) {
  if (WiFi.status() != WL_CONNECTED) {
    return -1;
  }

  JsonDocument doc;
  doc["device_id"] = deviceId_;
  doc["uptime_ms"] = millis();

  JsonObject gps = doc["gps"].to<JsonObject>();
  gps["fix"] = fix.valid;
  gps["lat"] = fix.latitude;
  gps["lon"] = fix.longitude;
  gps["alt_m"] = fix.altitudeMeters;
  gps["speed_kmph"] = fix.speedKmph;
  gps["course_deg"] = fix.courseDeg;
  gps["satellites"] = fix.satellites;

  JsonObject imuObj = doc["imu"].to<JsonObject>();
  imuObj["valid"] = imu.valid;
  JsonObject accel = imuObj["accel"].to<JsonObject>();
  accel["x"] = imu.accelX;
  accel["y"] = imu.accelY;
  accel["z"] = imu.accelZ;
  JsonObject gyro = imuObj["gyro"].to<JsonObject>();
  gyro["x"] = imu.gyroX;
  gyro["y"] = imu.gyroY;
  gyro["z"] = imu.gyroZ;
  imuObj["temp_c"] = imu.temperatureC;

  String body;
  serializeJson(doc, body);

  String url = String(apiHost_) + apiPath_;

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", apiKey_);
  http.setTimeout(3000);

  int statusCode = http.POST(body);
  http.end();
  return statusCode;
}
