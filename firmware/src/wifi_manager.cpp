#include "wifi_manager.h"

#include <WiFi.h>

void WifiManager::begin(const char *ssid, const char *password) {
  ssid_ = ssid;
  password_ = password;
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid_, password_);
  nextRetryAtMs_ = 0;
  retryBackoffMs_ = 1000;
}

void WifiManager::poll() {
  if (WiFi.status() == WL_CONNECTED) {
    retryBackoffMs_ = 1000;
    return;
  }

  uint32_t now = millis();
  if (now < nextRetryAtMs_) {
    return;
  }

  Serial.printf("[wifi] not connected (status=%d), retrying...\n", WiFi.status());
  WiFi.disconnect();
  WiFi.begin(ssid_, password_);

  nextRetryAtMs_ = now + retryBackoffMs_;
  retryBackoffMs_ = min(retryBackoffMs_ * 2, kMaxBackoffMs);
}

bool WifiManager::isConnected() const {
  return WiFi.status() == WL_CONNECTED;
}
