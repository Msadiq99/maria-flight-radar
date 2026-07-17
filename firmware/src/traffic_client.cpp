#if defined(MARIA_ESP32_28_RADAR_TERMINAL) || \
    defined(MARIA_M5STACK_CORE2_RADAR_TERMINAL)

#include "radar_terminal/traffic_client.h"

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>

#include "radar_terminal/radar_model.h"

namespace MariaRadar {

namespace {
constexpr uint32_t kTrafficFreshMs = 15000;
constexpr uint32_t kMaxBackoffMs = 30000;
constexpr size_t kJsonCapacity = 24576;
}

void TrafficClient::begin(const char *apiHost, const char *apiKey) {
  normalizedApiHost_[0] = '\0';
  if (apiHost != nullptr) {
    strlcpy(normalizedApiHost_, apiHost, sizeof(normalizedApiHost_));
    while (strlen(normalizedApiHost_) > 0 &&
           normalizedApiHost_[strlen(normalizedApiHost_) - 1] == '/') {
      normalizedApiHost_[strlen(normalizedApiHost_) - 1] = '\0';
    }
  }
  apiHost_ = normalizedApiHost_;
  apiKey_ = apiKey;
}

void TrafficClient::poll(bool wifiConnected, const GpsFix &fix,
                         uint16_t rangeKm, uint32_t nowMs) {
  if (!fix.valid) {
    return;
  }
#if MARIA_FORCE_DEMO_MODE
  loadDemo(fix, nowMs);
  simulationActive_ = true;
  lastSuccessMs_ = nowMs;
  lastHttpStatus_ = 200;
  nextAttemptMs_ = nowMs + 3000;
  return;
#endif
  if (!wifiConnected) {
    loadDemo(fix, nowMs);
    simulationActive_ = true;
    lastHttpStatus_ = 0;
    return;
  }
  if (nowMs < nextAttemptMs_) {
    return;
  }
  if (fetch(fix, rangeKm, nowMs)) {
    simulationActive_ = false;
    retryBackoffMs_ = 2000;
    nextAttemptMs_ = nowMs + 3000;
  } else {
    loadDemo(fix, nowMs);
    simulationActive_ = true;
    nextAttemptMs_ = nowMs + retryBackoffMs_;
    retryBackoffMs_ = min(retryBackoffMs_ * 2, kMaxBackoffMs);
  }
}

const Aircraft *TrafficClient::aircraft() const {
  return aircraft_;
}

uint8_t TrafficClient::count() const {
  return count_;
}

FeedState TrafficClient::state(uint32_t nowMs, bool wifiConnected,
                               bool gpsValid) const {
  if (simulationActive_) return FeedState::NoTraffic;
  if (!wifiConnected) return FeedState::WifiDisconnected;
  if (!gpsValid) return FeedState::GpsUnavailable;
  if (lastHttpStatus_ < 0 || lastHttpStatus_ >= 400) {
    return lastSuccessMs_ == 0 ? FeedState::BackendUnavailable
                               : FeedState::StaleTraffic;
  }
  if (lastSuccessMs_ == 0) return FeedState::Connecting;
  if (nowMs - lastSuccessMs_ > kTrafficFreshMs) return FeedState::StaleTraffic;
  return count_ == 0 ? FeedState::NoTraffic : FeedState::LiveTraffic;
}

uint32_t TrafficClient::lastSuccessMs() const {
  return lastSuccessMs_;
}

int TrafficClient::lastHttpStatus() const {
  return lastHttpStatus_;
}

void TrafficClient::copyText(char *dest, size_t size, const char *value) {
  if (size == 0) return;
  if (value == nullptr) {
    dest[0] = '\0';
    return;
  }
  strlcpy(dest, value, size);
}

bool TrafficClient::fetch(const GpsFix &fix, uint16_t rangeKm, uint32_t nowMs) {
  if (apiHost_ == nullptr || strlen(apiHost_) == 0) {
    loadDemo(fix, nowMs);
    simulationActive_ = true;
    lastSuccessMs_ = nowMs;
    lastHttpStatus_ = 200;
    return true;
  }

  char url[192];
  snprintf(url, sizeof(url),
           "%s/api/devices/core2/radar?lat=%.6f&lon=%.6f&rangeKm=%u&mode=auto",
           apiHost_, fix.latitude, fix.longitude, static_cast<unsigned>(rangeKm));

  HTTPClient http;
  http.setTimeout(2500);
  if (!http.begin(url)) {
    lastHttpStatus_ = -2;
    return false;
  }
  if (apiKey_ != nullptr && strlen(apiKey_) > 0) {
    http.addHeader("X-API-Key", apiKey_);
  }

  lastHttpStatus_ = http.GET();
  if (lastHttpStatus_ < 200 || lastHttpStatus_ >= 300) {
    http.end();
    return false;
  }
  if (http.getSize() > static_cast<int>(kJsonCapacity)) {
    lastHttpStatus_ = -5;
    http.end();
    return false;
  }

  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, http.getStream());
  http.end();
  if (error) {
    lastHttpStatus_ = -6;
    return false;
  }

  JsonArray items = doc["aircraft"].as<JsonArray>();
  const bool devicePayload = doc["version"] | false;
  uint8_t nextCount = 0;
  for (JsonObject item : items) {
    if (nextCount >= kMaxAircraft) break;
    Aircraft &target = aircraft_[nextCount];
    target = Aircraft{};
    copyText(target.id, sizeof(target.id), item["id"] | item["icao24"] | "");
    copyText(target.callsign, sizeof(target.callsign), item["callsign"] | "");
    copyText(target.registration, sizeof(target.registration),
             item["tail_number"] | item["registration"] | "");
    copyText(target.aircraftType, sizeof(target.aircraftType),
             item["aircraft_type"] | item["type"] | "");
    copyText(target.origin, sizeof(target.origin), item["origin"] | "");
    copyText(target.destination, sizeof(target.destination),
             item["destination"] | "");
    copyText(target.squawk, sizeof(target.squawk), item["squawk"] | "");
    copyText(target.source, sizeof(target.source), item["source"] | "");
    target.lat = item["lat"] | item["latitude"] | NAN;
    target.lon = item["lon"] | item["longitude"] | NAN;
    target.altitudeMeters = item["altitude_m"] | item["altitudeM"] | NAN;
    target.altitudeValid = isfinite(target.altitudeMeters);
    target.speedKmph = item["velocity_kmph"] | NAN;
    if (!isfinite(target.speedKmph)) {
      float speedMps = item["speedMps"] | NAN;
      target.speedKmph = isfinite(speedMps) ? speedMps * 3.6f : NAN;
    }
    target.speedValid = isfinite(target.speedKmph);
    target.headingDeg = item["heading_deg"] | item["headingDeg"] | NAN;
    target.headingValid = isfinite(target.headingDeg);
    target.verticalRateMps = item["vertical_rate_mps"] | item["verticalRateMps"] |
                             NAN;
    target.verticalRateValid = isfinite(target.verticalRateMps);
    target.updatedAtMs = nowMs;
    target.updatedAtValid = true;
    target.distanceKm = item["distanceKm"] | NAN;
    target.bearingDeg = item["bearingDeg"] | NAN;
    if (!isfinite(target.distanceKm) || !isfinite(target.bearingDeg)) {
      if (!finiteCoordinate(target.lat, target.lon)) continue;
      target.distanceKm = distanceKm(fix.latitude, fix.longitude, target.lat,
                                     target.lon);
      target.bearingDeg =
          bearingDeg(fix.latitude, fix.longitude, target.lat, target.lon);
    }
    if (devicePayload && !finiteCoordinate(target.lat, target.lon)) {
      target.lat = fix.latitude;
      target.lon = fix.longitude;
    }
    if (!isfinite(target.distanceKm) || !isfinite(target.bearingDeg)) continue;
    nextCount++;
  }
  count_ = nextCount;
  lastSuccessMs_ = nowMs;
  return true;
}

void TrafficClient::loadDemo(const GpsFix &fix, uint32_t nowMs) {
  static const float bearings[] = {25, 95, 182, 290};
  static const float distances[] = {4, 12, 28, 45};
  count_ = 4;
  for (uint8_t i = 0; i < count_; i++) {
    Aircraft &target = aircraft_[i];
    target = Aircraft{};
    snprintf(target.id, sizeof(target.id), "SIM%u", i + 1);
    snprintf(target.callsign, sizeof(target.callsign), "SIM%u", i + 1);
    strlcpy(target.source, "simulation", sizeof(target.source));
    target.distanceKm = distances[i];
    target.bearingDeg = bearings[i];
    target.lat = fix.latitude;
    target.lon = fix.longitude;
    target.altitudeMeters = 900 + i * 3200;
    target.altitudeValid = true;
    target.speedKmph = 180 + i * 90;
    target.speedValid = true;
    target.headingDeg = fmodf(bearings[i] + 180, 360);
    target.headingValid = true;
    target.verticalRateMps = i == 0 ? 1.2f : i == 1 ? -0.8f : 0.1f;
    target.verticalRateValid = true;
    target.updatedAtMs = nowMs;
    target.updatedAtValid = true;
  }
}

}  // namespace MariaRadar

#endif
