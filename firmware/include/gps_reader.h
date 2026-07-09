#pragma once

#include <HardwareSerial.h>
#include <TinyGPSPlus.h>

struct GpsFix {
  bool valid = false;
  double latitude = 0.0;
  double longitude = 0.0;
  double altitudeMeters = 0.0;
  double speedKmph = 0.0;
  double courseDeg = 0.0;
  uint32_t satellites = 0;
};

class GpsReader {
 public:
  void begin(HardwareSerial &serial, int rxPin, int txPin, uint32_t baud);

  // Feeds any pending bytes from the GPS module into the parser.
  // Call this frequently (every loop iteration) so no bytes are dropped.
  void poll();

  // Returns the latest fix while it remains fresh (currently five seconds).
  GpsFix currentFix();

 private:
  HardwareSerial *serial_ = nullptr;
  TinyGPSPlus gps_;
};
