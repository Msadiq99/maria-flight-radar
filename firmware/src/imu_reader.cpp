#include "imu_reader.h"

#include <M5Unified.h>

bool ImuReader::begin() {
  ready_ = M5.Imu.isEnabled();
  return ready_;
}

ImuSample ImuReader::read() {
  ImuSample sample;
  if (!ready_) {
    return sample;
  }

  m5::imu_3d_t accel, gyro;
  float temperature = 0.0f;
  sample.valid = M5.Imu.getAccel(&accel.x, &accel.y, &accel.z) &&
                 M5.Imu.getGyro(&gyro.x, &gyro.y, &gyro.z);
  M5.Imu.getTemp(&temperature);

  sample.accelX = accel.x;
  sample.accelY = accel.y;
  sample.accelZ = accel.z;
  sample.gyroX = gyro.x;
  sample.gyroY = gyro.y;
  sample.gyroZ = gyro.z;
  sample.temperatureC = temperature;
  return sample;
}
