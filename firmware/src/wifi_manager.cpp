#include "wifi_manager.h"

#include <ArduinoOTA.h>
#include <WiFi.h>
#include <WiFiManager.h>

#include "config.h"

#ifndef CONFIG_PORTAL_PASSWORD
#define CONFIG_PORTAL_PASSWORD "maria-setup"
#endif

#ifndef CONFIG_PORTAL_SSID
#define CONFIG_PORTAL_SSID "MARIA-Radar-Setup"
#endif

#ifndef OTA_PASSWORD
#define OTA_PASSWORD ""
#endif

void WifiManager::begin(const char *ssid, const char *password) {
  ssid_ = ssid;
  password_ = password;
  WiFi.setHostname(DEVICE_ID);
  WiFi.mode(WIFI_STA);
  disconnectedSinceMs_ = millis();
  if (ssid_ == nullptr || strlen(ssid_) == 0 ||
      strcmp(ssid_, "your-ssid") == 0) {
    startProvisioning();
  } else {
    WiFi.begin(ssid_, password_);
  }
  nextRetryAtMs_ = 0;
  retryBackoffMs_ = 1000;
}

void WifiManager::poll() {
  if (portal_ != nullptr) {
    portal_->process();
  }

  if (WiFi.status() == WL_CONNECTED) {
    retryBackoffMs_ = 1000;
    disconnectedSinceMs_ = 0;
    if (!timeConfigured_) {
      configTime(0, 0, "pool.ntp.org", "time.google.com");
      timeConfigured_ = true;
    }
    if (!otaStarted_) {
      ArduinoOTA.setHostname(DEVICE_ID);
      if (strlen(OTA_PASSWORD) > 0) {
        ArduinoOTA.setPassword(OTA_PASSWORD);
      }
      ArduinoOTA.begin();
      otaStarted_ = true;
    }
    ArduinoOTA.handle();
    return;
  }

  uint32_t now = millis();
  if (disconnectedSinceMs_ == 0) {
    disconnectedSinceMs_ = now;
  }
  if (portal_ == nullptr && now - disconnectedSinceMs_ >= 30000) {
    startProvisioning();
  }
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

bool WifiManager::provisioningActive() const {
  return portal_ != nullptr && portal_->getConfigPortalActive();
}

void WifiManager::startProvisioning() {
  if (portal_ != nullptr) {
    return;
  }
  portal_ = new WiFiManager();
  portal_->setConfigPortalBlocking(false);
  portal_->setConfigPortalTimeout(180);
  portal_->setHostname(DEVICE_ID);
  portal_->autoConnect(CONFIG_PORTAL_SSID, CONFIG_PORTAL_PASSWORD);
  Serial.printf("[wifi] provisioning portal %s available at 192.168.4.1\n",
                CONFIG_PORTAL_SSID);
}
