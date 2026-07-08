#pragma once

// M5StickC PLUS2: only G26, G36, G25, G0 are exposed on the 8-pin HAT
// connector. GPS only needs to be read (no commands sent to it), so we
// only wire up RX and leave TX disabled.
#define GPS_RX_PIN 26  // ESP32 RX2 <- GPS TX
#define GPS_TX_PIN -1  // unused: ESP32 never transmits to the GPS module

// The IMU is the onboard MPU6886, already wired to the internal I2C bus.
// Handled by M5Unified (see imu_reader.cpp) instead of manual Wire pins.

// Onboard red LED, shared with the IR emitter on G19
#define STATUS_LED_PIN 19
