#pragma once

#include <Arduino.h>

#include "gps_reader.h"
#include "radar_terminal/radar_model.h"

namespace MariaRadar {

enum class FeedState : uint8_t {
  WifiDisconnected,
  Connecting,
  BackendUnavailable,
  GpsUnavailable,
  NoTraffic,
  LiveTraffic,
  StaleTraffic,
};

class TrafficClient {
 public:
  void begin(const char *apiHost, const char *apiKey);
  void poll(bool wifiConnected, const GpsFix &fix, uint16_t rangeKm,
            uint32_t nowMs);
  const Aircraft *aircraft() const;
  uint8_t count() const;
  FeedState state(uint32_t nowMs, bool wifiConnected, bool gpsValid) const;
  uint32_t lastSuccessMs() const;
  int lastHttpStatus() const;

 private:
  bool fetch(const GpsFix &fix, uint16_t rangeKm, uint32_t nowMs);
  void loadDemo(const GpsFix &fix, uint32_t nowMs);
  void copyText(char *dest, size_t size, const char *value);

  const char *apiHost_ = nullptr;
  char normalizedApiHost_[128] = "";
  const char *apiKey_ = nullptr;
  Aircraft aircraft_[kMaxAircraft]{};
  uint8_t count_ = 0;
  uint32_t nextAttemptMs_ = 0;
  uint32_t retryBackoffMs_ = 2000;
  uint32_t lastSuccessMs_ = 0;
  int lastHttpStatus_ = 0;
  bool simulationActive_ = false;
};

}  // namespace MariaRadar
