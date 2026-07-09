#pragma once

#include <Arduino.h>

class WiFiManager;

class WifiManager {
 public:
  void begin(const char *ssid, const char *password);

  // Non-blocking: call every loop iteration. Reconnects with backoff
  // if the connection drops, without stalling sensor reads.
  void poll();

  bool isConnected() const;
  bool provisioningActive() const;

 private:
  void startProvisioning();

  const char *ssid_ = nullptr;
  const char *password_ = nullptr;
  WiFiManager *portal_ = nullptr;
  uint32_t nextRetryAtMs_ = 0;
  uint32_t disconnectedSinceMs_ = 0;
  uint32_t retryBackoffMs_ = 1000;
  bool otaStarted_ = false;
  bool timeConfigured_ = false;
  static constexpr uint32_t kMaxBackoffMs = 30000;
};
