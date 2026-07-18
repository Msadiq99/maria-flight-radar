#pragma once

#include <stdint.h>

#include "gps_reader.h"
#include "radar_terminal/radar_model.h"
#include "radar_terminal/traffic_client.h"

namespace MariaRadar {

enum class TerminalScreen : uint8_t {
  Radar,
  Details,
  Status,
  Settings,
};

class RadarScreen {
 public:
  void begin();
  void draw(TerminalScreen screen, const RadarPreferences &preferences,
            const Aircraft *aircraft, uint8_t count, int selectedIndex,
            const GpsFix &fix, FeedState feedState, uint32_t nowMs);

 private:
  void drawRadar(const RadarPreferences &preferences, const Aircraft *aircraft,
                 uint8_t count, int selectedIndex, FeedState feedState,
                 uint32_t nowMs);
  void drawDetails(const Aircraft *aircraft, uint8_t count, int selectedIndex,
                   const RadarPreferences &preferences, uint32_t nowMs);
  void drawStatus(const GpsFix &fix, FeedState feedState,
                  const RadarPreferences &preferences);
  void drawSettings(const RadarPreferences &preferences);
  void drawButton(int16_t x, int16_t y, int16_t w, const char *label);
  void formatAircraftLine(char *buffer, size_t size, const Aircraft &aircraft,
                          const RadarPreferences &preferences, uint32_t nowMs);
  TerminalScreen lastScreen_ = TerminalScreen::Radar;
  uint32_t lastDrawMs_ = 0;
};

const char *feedStateLabel(FeedState state);
const char *verticalStateLabel(VerticalState state);
const char *alertZoneLabel(AlertZone zone);

}  // namespace MariaRadar
