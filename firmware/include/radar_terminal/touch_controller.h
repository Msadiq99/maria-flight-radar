#pragma once

#include <stdint.h>

#include "radar_terminal/radar_model.h"

namespace MariaRadar {

enum class TouchAction : uint8_t {
  None,
  Previous,
  Next,
  Range,
  Pause,
  Details,
  Status,
  Settings,
  Back,
  ToggleLabels,
  ToggleTrails,
  FactoryReset,
};

struct TouchEvent {
  TouchAction action = TouchAction::None;
  int16_t x = 0;
  int16_t y = 0;
};

class TouchController {
 public:
  void begin();
  TouchEvent poll(const RadarPreferences &preferences);

 private:
  TouchAction hitTest(int16_t x, int16_t y) const;
  uint32_t lastTouchMs_ = 0;
};

}  // namespace MariaRadar
