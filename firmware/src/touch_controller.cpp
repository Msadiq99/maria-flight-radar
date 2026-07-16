#ifdef MARIA_ESP32_28_RADAR_TERMINAL

#include "radar_terminal/touch_controller.h"

#include <SPI.h>
#include <XPT2046_Touchscreen.h>

#include "board_profiles/esp32_2432s028r.h"

namespace MariaRadar {

namespace {
XPT2046_Touchscreen touch(MariaBoard::kTouchCs, MariaBoard::kTouchIrq);
constexpr uint32_t kDebounceMs = 180;

int16_t mapTouch(int32_t raw, int16_t inMin, int16_t inMax, int16_t outMin,
                 int16_t outMax) {
  if (inMax <= inMin) return outMin;
  long value = map(raw, inMin, inMax, outMin, outMax);
  return static_cast<int16_t>(constrain(value, outMin, outMax));
}
}  // namespace

void TouchController::begin() {
  SPI.begin(MariaBoard::kTouchSclk, MariaBoard::kTouchMiso,
            MariaBoard::kTouchMosi, MariaBoard::kTouchCs);
  touch.begin();
  touch.setRotation(MariaBoard::kLandscapeRotation);
}

TouchEvent TouchController::poll(const RadarPreferences &preferences) {
  TouchEvent event{};
  if (!touch.touched()) return event;
  const uint32_t now = millis();
  if (now - lastTouchMs_ < kDebounceMs) return event;
  lastTouchMs_ = now;

  TS_Point raw = touch.getPoint();
  if (raw.x <= 0 || raw.y <= 0) return event;
  event.x = mapTouch(raw.x, preferences.touchMinX, preferences.touchMaxX, 0,
                     319);
  event.y = mapTouch(raw.y, preferences.touchMinY, preferences.touchMaxY, 0,
                     239);
  event.action = hitTest(event.x, event.y);
  return event;
}

TouchAction TouchController::hitTest(int16_t x, int16_t y) const {
  if (x < 0 || x >= 320 || y < 0 || y >= 240) return TouchAction::None;
  if (y >= 202) {
    if (x < 64) return TouchAction::Previous;
    if (x < 128) return TouchAction::Next;
    if (x < 192) return TouchAction::Range;
    if (x < 256) return TouchAction::Pause;
    return TouchAction::Details;
  }
  if (y < 34 && x > 254) return TouchAction::Settings;
  if (y < 34 && x > 204) return TouchAction::Status;
  return TouchAction::Details;
}

}  // namespace MariaRadar

#endif
