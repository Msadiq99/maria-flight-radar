#include "telemetry_client.h"

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <esp_system.h>
#include <mbedtls/md.h>
#include <time.h>

#include "config.h"

#ifndef TELEMETRY_HMAC_SECRET
#define TELEMETRY_HMAC_SECRET ""
#endif

#ifndef TLS_ROOT_CA
#define TLS_ROOT_CA ""
#endif

#ifndef FIRMWARE_VERSION
#define FIRMWARE_VERSION "dev"
#endif

String hmacSha256(const String &body, const char *secret) {
  byte digest[32];
  mbedtls_md_context_t context;
  mbedtls_md_init(&context);
  const mbedtls_md_info_t *info = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
  mbedtls_md_setup(&context, info, 1);
  mbedtls_md_hmac_starts(&context,
                         reinterpret_cast<const unsigned char *>(secret),
                         strlen(secret));
  mbedtls_md_hmac_update(&context,
                         reinterpret_cast<const unsigned char *>(body.c_str()),
                         body.length());
  mbedtls_md_hmac_finish(&context, digest);
  mbedtls_md_free(&context);

  String hex;
  hex.reserve(64);
  for (byte value : digest) {
    if (value < 16) hex += '0';
    hex += String(value, HEX);
  }
  return hex;
}

void TelemetryClient::begin(const char *apiHost, const char *apiPath,
                             const char *apiKey, const char *deviceId) {
  apiHost_ = apiHost;
  apiPath_ = apiPath;
  apiKey_ = apiKey;
  deviceId_ = deviceId;
  queue_ = xQueueCreate(32, sizeof(PendingTelemetry));
  if (queue_ != nullptr) {
    xTaskCreatePinnedToCore(workerEntry, "telemetry-http", 8192, this, 1,
                            &workerTask_, 0);
  }
}

int TelemetryClient::send(const GpsFix &fix, const ImuSample &imu,
                          int batteryPercent) {
  if (queue_ == nullptr) {
    return -3;
  }

  const time_t epochSeconds = time(nullptr);
  PendingTelemetry sample{
      fix,
      imu,
      millis(),
      nextSequence_++,
      epochSeconds > 1700000000 ? static_cast<int64_t>(epochSeconds) * 1000 : 0,
      batteryPercent,
      WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0,
      ESP.getFreeHeap(),
      static_cast<uint32_t>(esp_reset_reason()),
  };
  if (xQueueSend(queue_, &sample, 0) != pdTRUE) {
    PendingTelemetry discarded;
    xQueueReceive(queue_, &discarded, 0);
    xQueueSend(queue_, &sample, 0);
  }
  return lastStatus_;
}

uint32_t TelemetryClient::acknowledgedSequence() const {
  return acknowledgedSequence_;
}

uint32_t TelemetryClient::failureCount() const {
  return failureCount_;
}

uint32_t TelemetryClient::queuedCount() const {
  return queue_ == nullptr ? 0 : uxQueueMessagesWaiting(queue_);
}

void TelemetryClient::workerEntry(void *context) {
  static_cast<TelemetryClient *>(context)->worker();
}

void TelemetryClient::worker() {
  PendingTelemetry sample;
  while (true) {
    if (xQueueReceive(queue_, &sample, portMAX_DELAY) == pdTRUE) {
      do {
        lastStatus_ = post(sample);
        if (lastStatus_ >= 200 && lastStatus_ < 300) {
          break;
        }
        failureCount_++;
        // Authentication/validation failures will not improve by retrying and
        // must not block all newer samples behind them.
        if (lastStatus_ >= 400 && lastStatus_ < 500 && lastStatus_ != 429) {
          break;
        }
        vTaskDelay(pdMS_TO_TICKS(5000));
      } while (true);
    }
  }
}

int TelemetryClient::post(const PendingTelemetry &sample) {
  if (WiFi.status() != WL_CONNECTED) {
    return -1;
  }

  JsonDocument doc;
  doc["device_id"] = deviceId_;
  doc["uptime_ms"] = sample.uptimeMs;
  doc["sequence"] = sample.sequence;
  doc["captured_at"] = sample.capturedAtMs;
  JsonObject diagnostics = doc["diagnostics"].to<JsonObject>();
  diagnostics["battery_percent"] = sample.batteryPercent;
  diagnostics["wifi_rssi_dbm"] = sample.wifiRssi;
  diagnostics["free_heap_bytes"] = sample.freeHeap;
  diagnostics["reset_reason"] = sample.resetReason;
  diagnostics["firmware_version"] = FIRMWARE_VERSION;
  diagnostics["delivery_failures"] = failureCount_;

  JsonObject gps = doc["gps"].to<JsonObject>();
  gps["fix"] = sample.fix.valid;
  gps["lat"] = sample.fix.latitude;
  gps["lon"] = sample.fix.longitude;
  gps["alt_m"] = sample.fix.altitudeMeters;
  gps["speed_kmph"] = sample.fix.speedKmph;
  gps["course_deg"] = sample.fix.courseDeg;
  gps["satellites"] = sample.fix.satellites;

  JsonObject imuObj = doc["imu"].to<JsonObject>();
  imuObj["valid"] = sample.imu.valid;
  JsonObject accel = imuObj["accel"].to<JsonObject>();
  accel["x"] = sample.imu.accelX;
  accel["y"] = sample.imu.accelY;
  accel["z"] = sample.imu.accelZ;
  JsonObject gyro = imuObj["gyro"].to<JsonObject>();
  gyro["x"] = sample.imu.gyroX;
  gyro["y"] = sample.imu.gyroY;
  gyro["z"] = sample.imu.gyroZ;
  imuObj["temp_c"] = sample.imu.temperatureC;

  String body;
  serializeJson(doc, body);

  String url = String(apiHost_) + apiPath_;

  HTTPClient http;
  WiFiClientSecure secureClient;
  bool secure = url.startsWith("https://");
  if (secure) {
    if (strlen(TLS_ROOT_CA) == 0) {
      return -4;
    }
    secureClient.setCACert(TLS_ROOT_CA);
    http.begin(secureClient, url);
  } else {
    http.begin(url);
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", apiKey_);
  if (strlen(TELEMETRY_HMAC_SECRET) > 0) {
    http.addHeader("X-Telemetry-Signature",
                   hmacSha256(body, TELEMETRY_HMAC_SECRET));
  }
  http.setTimeout(3000);

  int statusCode = http.POST(body);
  if (statusCode >= 200 && statusCode < 300) {
    JsonDocument response;
    if (deserializeJson(response, http.getString()) == DeserializationError::Ok) {
      acknowledgedSequence_ =
          response["acknowledged_sequence"] | sample.sequence;
    } else {
      acknowledgedSequence_ = sample.sequence;
    }
  }
  http.end();
  return statusCode;
}
