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
  tft.setTextColor(kCyan, kBg);
  tft.drawString("MARIA RADAR", 6, 4);
  char header[56];
  snprintf(header, sizeof(header), "%u km  %u targets  %s",
           preferences.rangeKm, count, feedStateLabel(feedState));
  tft.drawString(header, 6, 21);
  if (count > 0 && aircraft != nullptr && aircraft[0].source[0] != '\0') {
    tft.drawString(strstr(aircraft[0].source, "sim") != nullptr ? "DEMO" :
                       "LIVE",
                   170, 4);
  }
  tft.drawString("STAT", 214, 4);
  tft.drawString("SET", 268, 4);

  const RadarScreenGeometry geometry =
      radarGeometry(MariaBoard::kDisplayWidth, MariaBoard::kDisplayHeight);
  tft.drawCircle(geometry.centerX, geometry.centerY, geometry.radius, kCyan);
  tft.drawCircle(geometry.centerX, geometry.centerY, geometry.radius / 2,
                 0x03ef);
  tft.drawCircle(geometry.centerX, geometry.centerY, geometry.radius / 4,
                 0x03ef);
  tft.drawFastHLine(geometry.centerX - geometry.radius, geometry.centerY,
                    geometry.radius * 2, 0x03ef);
  tft.drawFastVLine(geometry.centerX, geometry.centerY - geometry.radius,
                    geometry.radius * 2, 0x03ef);
  tft.drawString("N", geometry.centerX - 4,
                 geometry.centerY - geometry.radius - 16);

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
    if (preferences.labelsEnabled && (selected || labels < 3)) {
      const char *label = target.callsign[0] ? target.callsign : target.id;
      tft.setTextColor(selected ? kWhite : color, kBg);
      tft.drawString(label, p.x + 7, p.y - 6);
      labels++;
    }
  }

  drawButton(4, 204, 58, "Prev");
  drawButton(66, 204, 58, "Next");
  drawButton(128, 204, 58, "Range");
  drawButton(190, 204, 58, preferences.sweepPaused ? "Run" : "Pause");
  drawButton(252, 204, 64, "Open");
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
