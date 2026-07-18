#include "radar_terminal/radar_model.h"

#include <math.h>
#include <string.h>

namespace MariaRadar {

namespace {
constexpr double kEarthRadiusKm = 6371.0;
constexpr double kDegToRad = 0.017453292519943295;
constexpr double kRadToDeg = 57.29577951308232;
constexpr float kMetersToFeet = 3.280839895f;
}

bool finiteCoordinate(double lat, double lon) {
  return isfinite(lat) && isfinite(lon) && lat >= -90 && lat <= 90 &&
         lon >= -180 && lon <= 180;
}

float distanceKm(double fromLat, double fromLon, double toLat, double toLon) {
  if (!finiteCoordinate(fromLat, fromLon) || !finiteCoordinate(toLat, toLon)) {
    return NAN;
  }
  const double dLat = (toLat - fromLat) * kDegToRad;
  const double dLon = (toLon - fromLon) * kDegToRad;
  const double lat1 = fromLat * kDegToRad;
  const double lat2 = toLat * kDegToRad;
  const double h = sin(dLat / 2) * sin(dLat / 2) +
                   cos(lat1) * cos(lat2) * sin(dLon / 2) * sin(dLon / 2);
  return static_cast<float>(2 * kEarthRadiusKm * asin(sqrt(h)));
}

float bearingDeg(double fromLat, double fromLon, double toLat, double toLon) {
  if (!finiteCoordinate(fromLat, fromLon) || !finiteCoordinate(toLat, toLon)) {
    return NAN;
  }
  const double lat1 = fromLat * kDegToRad;
  const double lat2 = toLat * kDegToRad;
  const double dLon = (toLon - fromLon) * kDegToRad;
  const double y = sin(dLon) * cos(lat2);
  const double x =
      cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLon);
  double bearing = fmod(atan2(y, x) * kRadToDeg + 360.0, 360.0);
  return static_cast<float>(bearing);
}

ScreenPoint projectTarget(float bearing, float distance, uint16_t rangeKm,
                          int16_t centerX, int16_t centerY, int16_t radius) {
  ScreenPoint point{};
  if (!isfinite(bearing) || !isfinite(distance) || rangeKm == 0 ||
      radius <= 0 || distance < 0 || distance > rangeKm) {
    point.visible = false;
    return point;
  }
  const float angle = bearing * static_cast<float>(kDegToRad);
  const float scaled = (distance / static_cast<float>(rangeKm)) * radius;
  point.x = static_cast<int16_t>(lroundf(centerX + sinf(angle) * scaled));
  point.y = static_cast<int16_t>(lroundf(centerY - cosf(angle) * scaled));
  point.visible = true;
  return point;
}

RadarScreenGeometry radarGeometry(uint16_t width, uint16_t height) {
  RadarScreenGeometry geometry{};
  const int16_t header = height >= 220 ? 22 : 18;
  const int16_t footer = height >= 220 ? 18 : 16;
  const int16_t side = width >= 300 ? 72 : 38;
  geometry.centerX = static_cast<int16_t>(width / 2);
  geometry.centerY = static_cast<int16_t>((header + height - footer) / 2);
  const int16_t horizontalLimit = static_cast<int16_t>(width / 2 - side - 8);
  const int16_t verticalLimit = static_cast<int16_t>((height - header - footer) / 2 - 5);
  geometry.radius = horizontalLimit < verticalLimit ? horizontalLimit : verticalLimit;
  if (geometry.radius < 44) geometry.radius = 44;
  return geometry;
}

TerminalTouchAction terminalTouchActionAt(int16_t x, int16_t y, uint16_t width,
                                          uint16_t height) {
  if (x < 0 || y < 0 || x >= width || y >= height) {
    return TerminalTouchAction::None;
  }
  if (y >= height - 28) {
    if (x < width / 5) return TerminalTouchAction::Previous;
    if (x < (width * 2) / 5) return TerminalTouchAction::Next;
    if (x < (width * 3) / 5) return TerminalTouchAction::Range;
    if (x < (width * 4) / 5) return TerminalTouchAction::Pause;
    return TerminalTouchAction::Details;
  }
  if (width >= 300 && y >= 22 && y < height - 18) {
    if (x < 72) {
      if (y < 62) return TerminalTouchAction::Next;
      if (y < 102) return TerminalTouchAction::Range;
      if (y < 142) return TerminalTouchAction::ToggleLabels;
      return TerminalTouchAction::Status;
    }
    if (x >= width - 76) return TerminalTouchAction::Next;
  }
  if (y < 34 && x > width - 66) return TerminalTouchAction::Settings;
  if (y < 34 && x > width - 118) return TerminalTouchAction::Status;
  return TerminalTouchAction::Details;
}

bool altitudeMatches(const Aircraft &aircraft, AltitudeFilter filter) {
  if (filter == AltitudeFilter::All) return true;
  if (!aircraft.altitudeValid || !isfinite(aircraft.altitudeMeters) ||
      aircraft.altitudeMeters <= 0) {
    return filter == AltitudeFilter::GroundUnknown;
  }
  const float feet = aircraft.altitudeMeters * kMetersToFeet;
  switch (filter) {
    case AltitudeFilter::Below10000:
      return feet < 10000;
    case AltitudeFilter::Between10000And30000:
      return feet >= 10000 && feet <= 30000;
    case AltitudeFilter::Above30000:
      return feet > 30000;
    case AltitudeFilter::GroundUnknown:
      return false;
    case AltitudeFilter::All:
      return true;
  }
  return true;
}

AlertZone classifyAlertZone(float distance,
                            const AlertThresholds &thresholds) {
  if (!isfinite(distance) || distance > thresholds.advisoryKm) {
    return AlertZone::Normal;
  }
  if (distance <= thresholds.criticalKm) return AlertZone::Critical;
  if (distance <= thresholds.warningKm) return AlertZone::Warning;
  return AlertZone::Advisory;
}

Freshness freshness(uint32_t updatedAtMs, uint32_t nowMs) {
  if (updatedAtMs == 0 || updatedAtMs > nowMs) return Freshness::Unknown;
  const uint32_t age = nowMs - updatedAtMs;
  if (age <= 15000) return Freshness::Live;
  if (age <= 60000) return Freshness::Delayed;
  return Freshness::Stale;
}

VerticalState verticalState(const Aircraft &aircraft) {
  if (!aircraft.verticalRateValid || !isfinite(aircraft.verticalRateMps)) {
    return VerticalState::Unknown;
  }
  if (aircraft.verticalRateMps > 0.5f) return VerticalState::Climbing;
  if (aircraft.verticalRateMps < -0.5f) return VerticalState::Descending;
  return VerticalState::Level;
}

int selectedAfterFiltering(const Aircraft *aircraft, uint8_t count,
                           int selectedIndex, AltitudeFilter filter) {
  if (aircraft == nullptr || count == 0) return -1;
  if (selectedIndex >= 0 && selectedIndex < count &&
      altitudeMatches(aircraft[selectedIndex], filter)) {
    return selectedIndex;
  }
  int best = -1;
  float bestDistance = INFINITY;
  for (uint8_t i = 0; i < count; i++) {
    if (!altitudeMatches(aircraft[i], filter)) continue;
    if (aircraft[i].distanceKm < bestDistance) {
      bestDistance = aircraft[i].distanceKm;
      best = i;
    }
  }
  return best;
}

bool validPreferences(const RadarPreferences &preferences) {
  const bool rangeOk = preferences.rangeKm == 25 || preferences.rangeKm == 50 ||
                       preferences.rangeKm == 100 || preferences.rangeKm == 200;
  const AlertThresholds &z = preferences.alertZones;
  return preferences.version == 1 && rangeOk && preferences.brightness <= 255 &&
         z.criticalKm > 0 && z.criticalKm < z.warningKm &&
         z.warningKm < z.advisoryKm && z.advisoryKm <= preferences.rangeKm &&
         preferences.touchMinX < preferences.touchMaxX &&
         preferences.touchMinY < preferences.touchMaxY;
}

RadarSourceBadge radarSourceBadge(const Aircraft *aircraft, uint8_t count,
                                  bool stale, bool offline) {
  if (count > 0 && aircraft != nullptr) {
    if (strstr(aircraft[0].source, "sim") != nullptr) {
      return RadarSourceBadge::Demo;
    }
    if (stale) return RadarSourceBadge::Cache;
    return RadarSourceBadge::Live;
  }
  if (offline) return RadarSourceBadge::Offline;
  return RadarSourceBadge::Demo;
}

const char *radarSourceBadgeLabel(RadarSourceBadge badge) {
  switch (badge) {
    case RadarSourceBadge::Live:
      return "LIVE";
    case RadarSourceBadge::Cache:
      return "CACHE";
    case RadarSourceBadge::Demo:
      return "DEMO";
    case RadarSourceBadge::Offline:
      return "OFFLINE";
  }
  return "OFFLINE";
}

}  // namespace MariaRadar
