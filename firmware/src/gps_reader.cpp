#include "gps_reader.h"

void GpsReader::begin(HardwareSerial &serial, int rxPin, int txPin, uint32_t baud) {
  serial_ = &serial;
  serial_->begin(baud, SERIAL_8N1, rxPin, txPin);
}

void GpsReader::poll() {
  if (serial_ == nullptr) {
    return;
  }
  while (serial_->available() > 0) {
    gps_.encode(serial_->read());
  }
}

GpsFix GpsReader::currentFix() {
  GpsFix fix;
  fix.valid = gps_.location.isValid() && gps_.location.isUpdated();
  if (gps_.location.isValid()) {
    fix.latitude = gps_.location.lat();
    fix.longitude = gps_.location.lng();
  }
  if (gps_.altitude.isValid()) {
    fix.altitudeMeters = gps_.altitude.meters();
  }
  if (gps_.speed.isValid()) {
    fix.speedKmph = gps_.speed.kmph();
  }
  if (gps_.course.isValid()) {
    fix.courseDeg = gps_.course.deg();
  }
  if (gps_.satellites.isValid()) {
    fix.satellites = gps_.satellites.value();
  }
  return fix;
}
