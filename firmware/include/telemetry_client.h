#pragma once

#include "gps_reader.h"
#include "imu_reader.h"

class TelemetryClient {
 public:
  void begin(const char *apiHost, const char *apiPath, const char *apiKey,
             const char *deviceId);

  // Serializes the fix/sample and POSTs it to the backend.
  // Returns the HTTP status code, or a negative value on transport failure.
  int send(const GpsFix &fix, const ImuSample &imu);

 private:
  const char *apiHost_ = nullptr;
  const char *apiPath_ = nullptr;
  const char *apiKey_ = nullptr;
  const char *deviceId_ = nullptr;
};
