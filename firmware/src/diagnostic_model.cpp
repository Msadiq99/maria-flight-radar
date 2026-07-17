#include "radar_terminal/diagnostic_model.h"

#include <math.h>
#include <stddef.h>
#include <string.h>

namespace MariaRadar {

namespace {
bool equals(const char *a, const char *b) {
  if (a == nullptr || b == nullptr) return false;
  while (*a == ' ' || *a == '\t') a++;
  size_t len = strlen(a);
  while (len > 0 && (a[len - 1] == '\r' || a[len - 1] == '\n' ||
                     a[len - 1] == ' ' || a[len - 1] == '\t')) {
    len--;
  }
  return strlen(b) == len && strncmp(a, b, len) == 0;
}
}  // namespace

SerialCommand parseSerialCommand(const char *command) {
  if (equals(command, "help")) return SerialCommand::Help;
  if (equals(command, "info")) return SerialCommand::Info;
  if (equals(command, "display")) return SerialCommand::Display;
  if (equals(command, "touch")) return SerialCommand::Touch;
  if (equals(command, "wifi")) return SerialCommand::Wifi;
  if (equals(command, "backend")) return SerialCommand::Backend;
  if (equals(command, "sd")) return SerialCommand::Sd;
  if (equals(command, "led")) return SerialCommand::Led;
  if (equals(command, "speaker")) return SerialCommand::Speaker;
  if (equals(command, "demo")) return SerialCommand::Demo;
  if (equals(command, "summary")) return SerialCommand::Summary;
  if (equals(command, "normal")) return SerialCommand::Normal;
  if (equals(command, "reboot")) return SerialCommand::Reboot;
  if (equals(command, "retest")) return SerialCommand::Retest;
  if (equals(command, "wifi-clear")) return SerialCommand::WifiClear;
  return SerialCommand::Unknown;
}

DiagnosticScreen screenForCommand(SerialCommand command) {
  switch (command) {
    case SerialCommand::Info:
      return DiagnosticScreen::BoardInfo;
    case SerialCommand::Display:
      return DiagnosticScreen::Display;
    case SerialCommand::Touch:
      return DiagnosticScreen::Touch;
    case SerialCommand::Wifi:
      return DiagnosticScreen::Wifi;
    case SerialCommand::Backend:
      return DiagnosticScreen::Backend;
    case SerialCommand::Sd:
      return DiagnosticScreen::Sd;
    case SerialCommand::Led:
      return DiagnosticScreen::Led;
    case SerialCommand::Speaker:
      return DiagnosticScreen::Speaker;
    case SerialCommand::Demo:
      return DiagnosticScreen::RadarDemo;
    case SerialCommand::Summary:
      return DiagnosticScreen::Summary;
    case SerialCommand::Normal:
      return DiagnosticScreen::Normal;
    case SerialCommand::Help:
    case SerialCommand::Reboot:
    case SerialCommand::Unknown:
    case SerialCommand::Retest:
    case SerialCommand::WifiClear:
      return DiagnosticScreen::Menu;
  }
  return DiagnosticScreen::Menu;
}

bool validCalibrationBounds(const CalibrationBounds &bounds) {
  return bounds.maxX - bounds.minX >= 500 && bounds.maxY - bounds.minY >= 500 &&
         bounds.minX >= 0 && bounds.minY >= 0 && bounds.maxX <= 4095 &&
         bounds.maxY <= 4095;
}

int16_t mapCalibrated(int16_t raw, int16_t inMin, int16_t inMax,
                      int16_t outMin, int16_t outMax) {
  if (inMax <= inMin) return outMin;
  long mapped = (static_cast<long>(raw - inMin) * (outMax - outMin)) /
                    (inMax - inMin) +
                outMin;
  if (mapped < outMin) return outMin;
  if (mapped > outMax) return outMax;
  return static_cast<int16_t>(mapped);
}

bool rgbOutputLevel(bool activeLow, bool on) {
  return activeLow ? !on : on;
}

BackendDiagnosticState classifyBackendStatus(int httpStatus, bool jsonOk,
                                             bool wifiOk, bool gpsOk,
                                             bool timedOut) {
  if (!gpsOk) return BackendDiagnosticState::GpsUnavailable;
  if (!wifiOk) return BackendDiagnosticState::WifiUnavailable;
  if (timedOut) return BackendDiagnosticState::Timeout;
  if (httpStatus < 200 || httpStatus >= 300) {
    return BackendDiagnosticState::HttpError;
  }
  return jsonOk ? BackendDiagnosticState::HttpOk
                : BackendDiagnosticState::JsonMalformed;
}

WifiDiagnosticState classifyWifiStatus(bool connected, bool portalActive,
                                       bool connecting) {
  if (connected) return WifiDiagnosticState::Connected;
  if (portalActive) return WifiDiagnosticState::Portal;
  return connecting ? WifiDiagnosticState::Connecting
                    : WifiDiagnosticState::Disconnected;
}

DemoAircraft demoAircraftAt(uint8_t index, uint32_t tickMs) {
  const float baseBearing = fmodf(index * 37.0f + tickMs * 0.006f, 360.0f);
  const float wave = sinf((tickMs * 0.001f) + index);
  DemoAircraft aircraft{};
  aircraft.bearingDeg = baseBearing;
  aircraft.distanceKm = 4.0f + index * 5.5f + wave * 1.5f;
  aircraft.altitudeMeters = 600.0f + index * 850.0f;
  aircraft.speedKmph = 160.0f + index * 35.0f;
  return aircraft;
}

const char *diagnosticStatusLabel(DiagnosticStatus status) {
  switch (status) {
    case DiagnosticStatus::NotTested:
      return "NOT";
    case DiagnosticStatus::Running:
      return "RUN";
    case DiagnosticStatus::Pass:
      return "PASS";
    case DiagnosticStatus::Fail:
      return "FAIL";
    case DiagnosticStatus::Unsupported:
      return "UNSUP";
    case DiagnosticStatus::Skipped:
      return "SKIP";
    case DiagnosticStatus::Timeout:
      return "TIME";
  }
  return "UNK";
}

const char *diagnosticItemLabel(DiagnosticItem item) {
  switch (item) {
    case DiagnosticItem::Display:
      return "Display";
    case DiagnosticItem::Touch:
      return "Touch";
    case DiagnosticItem::Board:
      return "Board";
    case DiagnosticItem::WifiScan:
      return "WiFi scan";
    case DiagnosticItem::WifiConnection:
      return "WiFi conn";
    case DiagnosticItem::Backend:
      return "Backend";
    case DiagnosticItem::Sd:
      return "SD";
    case DiagnosticItem::Rgb:
      return "RGB";
    case DiagnosticItem::Speaker:
      return "Speaker";
    case DiagnosticItem::RadarDemo:
      return "Radar";
    case DiagnosticItem::NormalMode:
      return "Normal";
    case DiagnosticItem::Count:
      return "Count";
  }
  return "Unknown";
}

bool diagnosticStatusIsComplete(DiagnosticStatus status) {
  return status == DiagnosticStatus::Pass || status == DiagnosticStatus::Fail ||
         status == DiagnosticStatus::Unsupported ||
         status == DiagnosticStatus::Skipped ||
         status == DiagnosticStatus::Timeout;
}

bool diagnosticSummaryReady(const DiagnosticStatus *statuses, uint8_t count) {
  if (statuses == nullptr || count == 0) return false;
  for (uint8_t i = 0; i < count; i++) {
    if (statuses[i] == DiagnosticStatus::Fail ||
        statuses[i] == DiagnosticStatus::Timeout) {
      return false;
    }
    if (!diagnosticStatusIsComplete(statuses[i])) return false;
  }
  return true;
}

bool diagnosticRgbSupported(bool core2Profile, bool rgbPinsAvailable) {
  return !core2Profile && rgbPinsAvailable;
}

bool core2RgbSupported() {
#if defined(MARIA_M5STACK_CORE2_RADAR_TERMINAL)
  return diagnosticRgbSupported(true, false);
#else
  return diagnosticRgbSupported(false, true);
#endif
}

}  // namespace MariaRadar
