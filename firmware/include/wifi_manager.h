#pragma once

#include <Arduino.h>

class WifiManager {
 public:
  void begin(const char *ssid, const char *password);

  // Non-blocking: call every loop iteration. Reconnects with backoff
  // if the connection drops, without stalling sensor reads.
  void poll();

  bool isConnected() const;

 private:
  const char *ssid_ = nullptr;
  const char *password_ = nullptr;
  uint32_t nextRetryAtMs_ = 0;
  uint32_t retryBackoffMs_ = 1000;
  static constexpr uint32_t kMaxBackoffMs = 30000;
};
