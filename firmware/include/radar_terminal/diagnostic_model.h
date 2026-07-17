#pragma once

#include <stdint.h>

namespace MariaRadar {

enum class DiagnosticScreen : uint8_t {
  Menu,
  Display,
  Touch,
  BoardInfo,
  Wifi,
  Backend,
  Sd,
  Led,
  Speaker,
  RadarDemo,
  Summary,
  Normal,
};

enum class DiagnosticItem : uint8_t {
  Display,
  Touch,
  Board,
  WifiScan,
  WifiConnection,
  Backend,
  Sd,
  Rgb,
  Speaker,
  RadarDemo,
  NormalMode,
  Count,
};

enum class DiagnosticStatus : uint8_t {
  NotTested,
  Running,
  Pass,
  Fail,
  Unsupported,
  Skipped,
  Timeout,
};

enum class SerialCommand : uint8_t {
  Unknown,
  Help,
  Info,
  Display,
  Touch,
  Wifi,
  Backend,
  Sd,
  Led,
  Speaker,
  Demo,
  Summary,
  Normal,
  Reboot,
  Retest,
  WifiClear,
};

enum class BackendDiagnosticState : uint8_t {
  Untested,
  GpsUnavailable,
  WifiUnavailable,
  HttpOk,
  HttpError,
  JsonMalformed,
  Timeout,
};

enum class WifiDiagnosticState : uint8_t {
  Disconnected,
  Connecting,
  Connected,
  Portal,
};

struct CalibrationBounds {
  int16_t minX = 300;
  int16_t maxX = 3800;
  int16_t minY = 300;
  int16_t maxY = 3800;
};

struct CalibrationSample {
  int16_t x = 0;
  int16_t y = 0;
  bool valid = false;
};

struct DemoAircraft {
  float bearingDeg = 0;
  float distanceKm = 0;
  float altitudeMeters = 0;
  float speedKmph = 0;
};

SerialCommand parseSerialCommand(const char *command);
DiagnosticScreen screenForCommand(SerialCommand command);
bool validCalibrationBounds(const CalibrationBounds &bounds);
int16_t mapCalibrated(int16_t raw, int16_t inMin, int16_t inMax,
                      int16_t outMin, int16_t outMax);
bool rgbOutputLevel(bool activeLow, bool on);
BackendDiagnosticState classifyBackendStatus(int httpStatus, bool jsonOk,
                                             bool wifiOk, bool gpsOk,
                                             bool timedOut);
WifiDiagnosticState classifyWifiStatus(bool connected, bool portalActive,
                                       bool connecting);
DemoAircraft demoAircraftAt(uint8_t index, uint32_t tickMs);
const char *diagnosticStatusLabel(DiagnosticStatus status);
const char *diagnosticItemLabel(DiagnosticItem item);
bool diagnosticStatusIsComplete(DiagnosticStatus status);
bool diagnosticSummaryReady(const DiagnosticStatus *statuses, uint8_t count);
bool diagnosticRgbSupported(bool core2Profile, bool rgbPinsAvailable);
bool core2RgbSupported();

}  // namespace MariaRadar
