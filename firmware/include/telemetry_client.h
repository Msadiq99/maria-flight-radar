#pragma once

#include <Arduino.h>
#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#include <freertos/task.h>

#include "gps_reader.h"
#include "imu_reader.h"

class TelemetryClient {
 public:
  void begin(const char *apiHost, const char *apiPath, const char *apiKey,
             const char *deviceId);

  // Queues a sample for the background network task. This never blocks the
  // sensor/GPS loop. Returns the latest HTTP status, or a negative value.
  int send(const GpsFix &fix, const ImuSample &imu, int batteryPercent);
  uint32_t acknowledgedSequence() const;
  uint32_t failureCount() const;
  uint32_t queuedCount() const;

 private:
  struct PendingTelemetry {
    GpsFix fix;
    ImuSample imu;
    uint32_t uptimeMs;
    uint32_t sequence;
    int64_t capturedAtMs;
    int batteryPercent;
    int wifiRssi;
    uint32_t freeHeap;
    uint32_t resetReason;
  };

  static void workerEntry(void *context);
  void worker();
  int post(const PendingTelemetry &sample);

  const char *apiHost_ = nullptr;
  const char *apiPath_ = nullptr;
  const char *apiKey_ = nullptr;
  const char *deviceId_ = nullptr;
  QueueHandle_t queue_ = nullptr;
  TaskHandle_t workerTask_ = nullptr;
  volatile int lastStatus_ = 0;
  volatile uint32_t nextSequence_ = 1;
  volatile uint32_t acknowledgedSequence_ = 0;
  volatile uint32_t failureCount_ = 0;
};
