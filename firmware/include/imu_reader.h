#pragma once

// Wraps the M5StickC PLUS2's onboard IMU (MPU6886) via M5Unified, which
// auto-detects the correct chip driver for the board. Call M5.begin() once
// before using this.

struct ImuSample {
  bool valid = false;
  float accelX = 0.0f, accelY = 0.0f, accelZ = 0.0f;  // g
  float gyroX = 0.0f, gyroY = 0.0f, gyroZ = 0.0f;      // deg/s
  float temperatureC = 0.0f;
};

class ImuReader {
 public:
  // Assumes M5.begin() has already initialized the onboard IMU.
  bool begin();

  ImuSample read();

 private:
  bool ready_ = false;
};
