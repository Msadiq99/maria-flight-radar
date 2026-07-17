#pragma once

// Copy this file to config.h and fill in real values.
// config.h is gitignored so credentials never get committed.

#define WIFI_SSID "your-ssid"
#define WIFI_PASSWORD "your-password"

// Backend telemetry endpoint (see firmware/README.md for the request contract)
#define API_HOST "http://192.168.1.100:8080"
#define API_TELEMETRY_PATH "/api/telemetry"
#define API_KEY "change-me"

// Optional HMAC secret. Configure the same value as TELEMETRY_HMAC_SECRET on
// the backend. Leave empty only for local development.
#define TELEMETRY_HMAC_SECRET ""

// Required when API_HOST uses https://. Paste the root CA certificate as a
// PEM string. HTTPS deliberately fails closed when this is empty.
#define TLS_ROOT_CA ""

// Unique identifier for this tracker unit
#define DEVICE_ID "MARIA-001"
#define FIRMWARE_VERSION "0.3.0"

// Captive portal and Arduino OTA credentials (use strong unique values).
#define CONFIG_PORTAL_SSID "MARIA-Radar-Setup"
#define CONFIG_PORTAL_PASSWORD "maria-setup"
#define OTA_PASSWORD ""

// How often to read sensors and send a telemetry packet
#define TELEMETRY_INTERVAL_MS 2000

// Set to true when testing without a GPS module. The firmware will synthesize a
// slow moving GPS track whenever the real GPS has no fix.
#define SIMULATE_GPS_WHEN_NO_FIX false

// GPS module baud rate (9600 is standard for NEO-6M/NEO-M8N)
#define GPS_BAUD 9600
