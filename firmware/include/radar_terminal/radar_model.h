#pragma once

#include <stdint.h>

namespace MariaRadar {

constexpr uint8_t kMaxAircraft = 32;
constexpr uint8_t kTrailPointsPerAircraft = 8;

enum class AltitudeFilter : uint8_t {
  All,
  GroundUnknown,
  Below10000,
  Between10000And30000,
  Above30000,
};

enum class AlertZone : uint8_t {
  Critical,
  Warning,
  Advisory,
  Normal,
};

enum class Freshness : uint8_t {
  Live,
  Delayed,
  Stale,
  Unknown,
};

enum class VerticalState : uint8_t {
  Climbing,
  Descending,
  Level,
  Unknown,
};

enum class TerminalTouchAction : uint8_t {
  None,
  Previous,
  Next,
  Range,
  Pause,
  Details,
  Status,
  Settings,
};

struct Aircraft {
  char id[16] = "";
  char callsign[16] = "";
  char registration[16] = "";
  char aircraftType[16] = "";
  char origin[8] = "";
  char destination[8] = "";
  char squawk[8] = "";
  double lat = 0;
  double lon = 0;
  float altitudeMeters = 0;
  bool altitudeValid = false;
  float speedKmph = 0;
  bool speedValid = false;
  float headingDeg = 0;
  bool headingValid = false;
  float verticalRateMps = 0;
  bool verticalRateValid = false;
  uint32_t updatedAtMs = 0;
  bool updatedAtValid = false;
  float distanceKm = 0;
  float bearingDeg = 0;
};

struct ScreenPoint {
  int16_t x = 0;
  int16_t y = 0;
  bool visible = false;
};

struct RadarScreenGeometry {
  int16_t centerX = 0;
  int16_t centerY = 0;
  int16_t radius = 0;
};

struct AlertThresholds {
  float criticalKm = 5;
  float warningKm = 15;
  float advisoryKm = 30;
};

struct RadarPreferences {
  uint8_t version = 1;
  uint16_t rangeKm = 50;
  uint8_t brightness = 180;
  bool labelsEnabled = true;
  bool trailsEnabled = true;
  bool sweepPaused = false;
  AltitudeFilter altitudeFilter = AltitudeFilter::All;
  AlertThresholds alertZones{};
  bool touchCalibrated = false;
  int16_t touchMinX = 300;
  int16_t touchMaxX = 3800;
  int16_t touchMinY = 300;
  int16_t touchMaxY = 3800;
};

bool finiteCoordinate(double lat, double lon);
float distanceKm(double fromLat, double fromLon, double toLat, double toLon);
float bearingDeg(double fromLat, double fromLon, double toLat, double toLon);
ScreenPoint projectTarget(float bearingDeg, float distanceKm, uint16_t rangeKm,
                          int16_t centerX, int16_t centerY, int16_t radius);
RadarScreenGeometry radarGeometry(uint16_t width, uint16_t height);
TerminalTouchAction terminalTouchActionAt(int16_t x, int16_t y, uint16_t width,
                                          uint16_t height);
bool altitudeMatches(const Aircraft &aircraft, AltitudeFilter filter);
AlertZone classifyAlertZone(float distanceKm, const AlertThresholds &thresholds);
Freshness freshness(uint32_t updatedAtMs, uint32_t nowMs);
VerticalState verticalState(const Aircraft &aircraft);
int selectedAfterFiltering(const Aircraft *aircraft, uint8_t count,
                           int selectedIndex, AltitudeFilter filter);
bool validPreferences(const RadarPreferences &preferences);

}  // namespace MariaRadar
