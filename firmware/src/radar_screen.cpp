#if defined(MARIA_ESP32_28_RADAR_TERMINAL) || \
    defined(MARIA_M5STACK_CORE2_RADAR_TERMINAL)

#include "radar_terminal/radar_screen.h"

#if defined(MARIA_M5STACK_CORE2_RADAR_TERMINAL)
#include <M5Unified.h>
#include "board_profiles/m5stack_core2.h"
#define tft M5.Display
#else
#include <TFT_eSPI.h>
#include "board_profiles/esp32_2432s028r.h"
#endif

namespace MariaRadar {

namespace {
#if defined(MARIA_ESP32_28_RADAR_TERMINAL)
TFT_eSPI tft;
#endif
constexpr uint16_t kBg = TFT_BLACK;
constexpr uint16_t kPanel = 0x0861;
constexpr uint16_t kCyan = 0x07ff;
constexpr uint16_t kGreen = 0x07e0;
constexpr uint16_t kAmber = 0xffc0;
constexpr uint16_t kRed = 0xf800;
constexpr uint16_t kWhite = TFT_WHITE;

uint16_t zoneColor(AlertZone zone) {
  if (zone == AlertZone::Critical) return kRed;
  if (zone == AlertZone::Warning) return kAmber;
  if (zone == AlertZone::Advisory) return kCyan;
  return kGreen;
}
}  // namespace

const char *feedStateLabel(FeedState state) {
  switch (state) {
    case FeedState::WifiDisconnected:
      return "WiFi off";
    case FeedState::Connecting:
      return "Connecting";
    case FeedState::BackendUnavailable:
      return "Backend off";
    case FeedState::GpsUnavailable:
      return "GPS off";
    case FeedState::NoTraffic:
      return "No traffic";
    case FeedState::LiveTraffic:
      return "Live";
    case FeedState::StaleTraffic:
      return "Stale";
  }
  return "Unknown";
}

const char *verticalStateLabel(VerticalState state) {
  switch (state) {
    case VerticalState::Climbing:
      return "Climbing";
    case VerticalState::Descending:
      return "Descending";
    case VerticalState::Level:
      return "Level";
    case VerticalState::Unknown:
      return "Unknown";
  }
  return "Unknown";
}

const char *alertZoneLabel(AlertZone zone) {
  switch (zone) {
    case AlertZone::Critical:
      return "Critical";
    case AlertZone::Warning:
      return "Warning";
    case AlertZone::Advisory:
      return "Advisory";
    case AlertZone::Normal:
      return "Normal";
  }
  return "Normal";
}

void RadarScreen::begin() {
#if defined(MARIA_M5STACK_CORE2_RADAR_TERMINAL)
  MariaBoard::begin();
#else
  pinMode(MariaBoard::kBacklightPin, OUTPUT);
  digitalWrite(MariaBoard::kBacklightPin, MariaBoard::kBacklightActiveLevel);
  tft.init();
#endif
  MariaBoard::setBrightness(180);
  tft.setRotation(MariaBoard::kLandscapeRotation);
  tft.fillScreen(kBg);
  tft.setTextFont(2);
  tft.setTextDatum(TL_DATUM);
}

void RadarScreen::draw(TerminalScreen screen,
                       const RadarPreferences &preferences,
                       const Aircraft *aircraft, uint8_t count,
                       int selectedIndex, const GpsFix &fix,
                       FeedState feedState, uint32_t nowMs) {
  if (screen != lastScreen_ || nowMs - lastDrawMs_ > 1000 ||
      screen == TerminalScreen::Radar) {
    lastScreen_ = screen;
    lastDrawMs_ = nowMs;
    if (screen == TerminalScreen::Radar) {
      drawRadar(preferences, aircraft, count, selectedIndex, feedState, nowMs);
    } else if (screen == TerminalScreen::Details) {
      drawDetails(aircraft, count, selectedIndex, preferences, nowMs);
    } else if (screen == TerminalScreen::Status) {
      drawStatus(fix, feedState, preferences);
    } else {
      drawSettings(preferences);
    }
  }
}

void RadarScreen::drawButton(int16_t x, int16_t y, int16_t w,
                             const char *label) {
  tft.drawRoundRect(x, y, w, 34, 4, 0x39e7);
  tft.setTextColor(kWhite, kBg);
  tft.drawString(label, x + 7, y + 9);
}

void RadarScreen::drawRadar(const RadarPreferences &preferences,
                            const Aircraft *aircraft, uint8_t count,
                            int selectedIndex, FeedState feedState,
                            uint32_t nowMs) {
  tft.fillScreen(kBg);
  const RadarSourceBadge badge = radarSourceBadge(
      aircraft, count, feedState == FeedState::StaleTraffic,
      feedState == FeedState::BackendUnavailable ||
          feedState == FeedState::WifiDisconnected);
  const RadarScreenGeometry geometry =
      radarGeometry(MariaBoard::kDisplayWidth, MariaBoard::kDisplayHeight);
  const uint16_t badgeColor =
      badge == RadarSourceBadge::Live ? kGreen :
      badge == RadarSourceBadge::Demo ? kCyan :
      badge == RadarSourceBadge::Cache ? kAmber : kRed;

  tft.setTextColor(kCyan, kBg);
  tft.drawString("MARIA FLIGHT RADAR", 5, 3);
  tft.setTextColor(badgeColor, kBg);
  tft.drawString(radarSourceBadgeLabel(badge), 207, 3);
  char line[24];
  snprintf(line, sizeof(line), "%u AC", count);
  tft.drawString(line, 275, 3);
  tft.drawFastHLine(0, 20, MariaBoard::kDisplayWidth, 0x03ef);

  tft.setTextColor(kCyan, kBg);
  tft.drawString("OVERVIEW", 4, 26);
  tft.setTextColor(kWhite, kBg);
  snprintf(line, sizeof(line), "AC  %u", count);
  tft.drawString(line, 5, 46);
  snprintf(line, sizeof(line), "RNG %uk", preferences.rangeKm);
  tft.drawString(line, 5, 72);
  snprintf(line, sizeof(line), "LAB %s", preferences.labelsEnabled ? "ON" : "OFF");
  tft.drawString(line, 5, 98);
  tft.setTextColor(badgeColor, kBg);
  tft.drawString(radarSourceBadgeLabel(badge), 5, 124);
  tft.setTextColor(0x39e7, kBg);
  tft.drawFastVLine(71, 23, 196, 0x0861);
  tft.drawFastVLine(248, 23, 196, 0x0861);

  tft.setTextColor(kCyan, kBg);
  tft.drawString("SELECTED", 252, 26);
  const Aircraft *selected =
      selectedIndex >= 0 && selectedIndex < count ? &aircraft[selectedIndex] : nullptr;
  if (selected == nullptr) {
    tft.setTextColor(kWhite, kBg);
    tft.drawString("NONE", 252, 48);
  } else {
    const char *name = selected->callsign[0] ? selected->callsign : selected->id;
    char shortName[7];
    strlcpy(shortName, name, sizeof(shortName));
    tft.setTextColor(kWhite, kBg);
    tft.drawString(shortName, 252, 48);
    snprintf(line, sizeof(line), "A %.0f", selected->altitudeValid
                 ? selected->altitudeMeters * 3.281f : -1.0f);
    tft.drawString(line, 252, 72);
    snprintf(line, sizeof(line), "S %.0f", selected->speedValid
                 ? selected->speedKmph * 0.540f : -1.0f);
    tft.drawString(line, 252, 94);
    snprintf(line, sizeof(line), "H %.0f", selected->headingValid
                 ? selected->headingDeg : -1.0f);
    tft.drawString(line, 252, 116);
    snprintf(line, sizeof(line), "D %.1f", selected->distanceKm * 0.540f);
    tft.drawString(line, 252, 138);
    if (selected->squawk[0]) {
      snprintf(line, sizeof(line), "SQ %s", selected->squawk);
      tft.setTextColor(kAmber, kBg);
      tft.drawString(line, 252, 160);
    }
  }

  tft.drawCircle(geometry.centerX, geometry.centerY, geometry.radius, kCyan);
  tft.drawCircle(geometry.centerX, geometry.centerY, geometry.radius / 2,
                 0x03ef);
  tft.drawCircle(geometry.centerX, geometry.centerY, geometry.radius / 4,
                 0x03ef);
  tft.drawFastHLine(geometry.centerX - geometry.radius, geometry.centerY,
                    geometry.radius * 2, 0x03ef);
  tft.drawFastVLine(geometry.centerX, geometry.centerY - geometry.radius,
                    geometry.radius * 2, 0x03ef);
  tft.setTextColor(kCyan, kBg);
  tft.drawString("N", geometry.centerX - 4, geometry.centerY - geometry.radius - 13);
  tft.drawString("E", geometry.centerX + geometry.radius + 3, geometry.centerY - 5);
  tft.drawString("S", geometry.centerX - 4, geometry.centerY + geometry.radius + 3);
  tft.drawString("W", geometry.centerX - geometry.radius - 12, geometry.centerY - 5);
  tft.fillCircle(geometry.centerX, geometry.centerY, 3, kWhite);

  if (!preferences.sweepPaused) {
    const float sweep = (nowMs % 4000) * 0.09f;
    ScreenPoint tip = projectTarget(sweep, preferences.rangeKm,
                                    preferences.rangeKm, geometry.centerX,
                                    geometry.centerY, geometry.radius);
    tft.drawLine(geometry.centerX, geometry.centerY, tip.x, tip.y, 0x07e0);
  }

  uint8_t labels = 0;
  for (uint8_t i = 0; i < count; i++) {
    const Aircraft &target = aircraft[i];
    if (!altitudeMatches(target, preferences.altitudeFilter)) continue;
    ScreenPoint p =
        projectTarget(target.bearingDeg, target.distanceKm, preferences.rangeKm,
                      geometry.centerX, geometry.centerY, geometry.radius);
    if (!p.visible) continue;
    AlertZone zone = classifyAlertZone(target.distanceKm, preferences.alertZones);
    uint16_t color = zoneColor(zone);
    const bool selected = i == selectedIndex;
    tft.fillTriangle(p.x, p.y - 5, p.x + 4, p.y + 4, p.x - 4, p.y + 4,
                     selected ? kWhite : color);
    if (selected) tft.drawCircle(p.x, p.y, 9, kWhite);
    if (preferences.labelsEnabled && (selected || labels < 6)) {
      const char *label = target.callsign[0] ? target.callsign : target.id;
      tft.setTextColor(selected ? kWhite : color, kBg);
      const int16_t labelX = p.x < geometry.centerX ? p.x + 6 : p.x - 30;
      const int16_t labelY = p.y < geometry.centerY ? p.y + 4 : p.y - 12;
      if (labelX > geometry.centerX - geometry.radius &&
          labelX < geometry.centerX + geometry.radius - 20 &&
          labelY > geometry.centerY - geometry.radius &&
          labelY < geometry.centerY + geometry.radius - 8) {
        char shortLabel[8];
        strlcpy(shortLabel, label, sizeof(shortLabel));
        tft.drawString(shortLabel, labelX, labelY);
      }
      labels++;
    }
  }
  tft.setTextColor(feedState == FeedState::LiveTraffic ? kGreen : badgeColor, kBg);
  snprintf(line, sizeof(line), "WIFI %s | API %s | %s | %us",
           feedState == FeedState::WifiDisconnected ? "OFF" : "OK",
           feedState == FeedState::BackendUnavailable ? "FAIL" : "OK",
           radarSourceBadgeLabel(badge),
           count ? static_cast<unsigned>((nowMs - aircraft[0].updatedAtMs) / 1000) : 0);
  tft.drawString(line, 4, 222);
}

void RadarScreen::formatAircraftLine(char *buffer, size_t size,
                                     const Aircraft &aircraft,
                                     const RadarPreferences &preferences,
                                     uint32_t nowMs) {
  AlertZone zone = classifyAlertZone(aircraft.distanceKm, preferences.alertZones);
  Freshness fresh = freshness(aircraft.updatedAtMs, nowMs);
  const char *name = aircraft.callsign[0] ? aircraft.callsign : aircraft.id;
  snprintf(buffer, size, "%s  %.1fkm %.0fdeg %s %s", name, aircraft.distanceKm,
           aircraft.bearingDeg, alertZoneLabel(zone),
           fresh == Freshness::Stale ? "stale" : "");
}

void RadarScreen::drawDetails(const Aircraft *aircraft, uint8_t count,
                              int selectedIndex,
                              const RadarPreferences &preferences,
                              uint32_t nowMs) {
  tft.fillScreen(kBg);
  tft.setTextColor(kCyan, kBg);
  tft.drawString("AIRCRAFT DETAILS", 6, 4);
  if (selectedIndex < 0 || selectedIndex >= count) {
    tft.setTextColor(kWhite, kBg);
    tft.drawString("No aircraft selected", 10, 54);
    drawButton(4, 204, 76, "Back");
    return;
  }
  const Aircraft &target = aircraft[selectedIndex];
  char line[80];
  formatAircraftLine(line, sizeof(line), target, preferences, nowMs);
  tft.setTextColor(kWhite, kBg);
  tft.drawString(line, 8, 32);
  snprintf(line, sizeof(line), "Alt: %s %.0fm",
           target.altitudeValid ? "" : "-", target.altitudeMeters);
  tft.drawString(line, 8, 58);
  snprintf(line, sizeof(line), "Speed: %s %.0f km/h",
           target.speedValid ? "" : "-", target.speedKmph);
  tft.drawString(line, 8, 82);
  snprintf(line, sizeof(line), "Heading: %s %.0f deg",
           target.headingValid ? "" : "-", target.headingDeg);
  tft.drawString(line, 8, 106);
  snprintf(line, sizeof(line), "Vertical: %s",
           verticalStateLabel(verticalState(target)));
  tft.drawString(line, 8, 130);
  snprintf(line, sizeof(line), "Reg:%s Type:%s", target.registration,
           target.aircraftType);
  tft.drawString(line, 8, 154);
  snprintf(line, sizeof(line), "%s -> %s Squawk:%s", target.origin,
           target.destination, target.squawk);
  tft.drawString(line, 8, 178);
  drawButton(4, 204, 76, "Back");
}

void RadarScreen::drawStatus(const GpsFix &fix, FeedState feedState,
                             const RadarPreferences &preferences) {
  tft.fillScreen(kBg);
  tft.setTextColor(kCyan, kBg);
  tft.drawString("SYSTEM STATUS", 6, 4);
  tft.setTextColor(kWhite, kBg);
  char line[64];
  snprintf(line, sizeof(line), "Feed: %s", feedStateLabel(feedState));
  tft.drawString(line, 8, 36);
  snprintf(line, sizeof(line), "GPS: %s sats=%lu", fix.valid ? "fix" : "none",
           static_cast<unsigned long>(fix.satellites));
  tft.drawString(line, 8, 62);
  snprintf(line, sizeof(line), "Range: %u km", preferences.rangeKm);
  tft.drawString(line, 8, 88);
  snprintf(line, sizeof(line), "Labels:%s Trails:%s",
           preferences.labelsEnabled ? "on" : "off",
           preferences.trailsEnabled ? "on" : "off");
  tft.drawString(line, 8, 114);
  snprintf(line, sizeof(line), "Sweep: %s",
           preferences.sweepPaused ? "paused" : "running");
  tft.drawString(line, 8, 140);
  drawButton(4, 204, 76, "Back");
}

void RadarScreen::drawSettings(const RadarPreferences &preferences) {
  tft.fillScreen(kBg);
  tft.setTextColor(kCyan, kBg);
  tft.drawString("SETTINGS", 6, 4);
  tft.setTextColor(kWhite, kBg);
  char line[64];
  snprintf(line, sizeof(line), "Brightness: %u", preferences.brightness);
  tft.drawString(line, 8, 38);
  snprintf(line, sizeof(line), "Critical %.1f  Warning %.1f",
           preferences.alertZones.criticalKm, preferences.alertZones.warningKm);
  tft.drawString(line, 8, 64);
  snprintf(line, sizeof(line), "Advisory %.1f km",
           preferences.alertZones.advisoryKm);
  tft.drawString(line, 8, 90);
  tft.drawString("Factory reset: hold action", 8, 128);
  tft.drawString(MariaBoard::kValidationStatus, 8, 154);
  drawButton(4, 204, 76, "Back");
  drawButton(92, 204, 76, "Labels");
  drawButton(180, 204, 76, "Trails");
}

}  // namespace MariaRadar

#if defined(MARIA_M5STACK_CORE2_RADAR_TERMINAL)
#undef tft
#endif

#endif
