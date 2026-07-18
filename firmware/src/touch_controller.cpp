#if defined(MARIA_ESP32_28_RADAR_TERMINAL) || \
    defined(MARIA_M5STACK_CORE2_RADAR_TERMINAL)

#include "radar_terminal/touch_controller.h"

#if defined(MARIA_M5STACK_CORE2_RADAR_TERMINAL)
#include <M5Unified.h>
#include "board_profiles/m5stack_core2.h"
#else
#include <SPI.h>
#include <XPT2046_Touchscreen.h>
#include "board_profiles/esp32_2432s028r.h"
#endif

namespace MariaRadar {

namespace {
#if defined(MARIA_ESP32_28_RADAR_TERMINAL)
XPT2046_Touchscreen touch(MariaBoard::kTouchCs, MariaBoard::kTouchIrq);
#endif
constexpr uint32_t kDebounceMs = 180;

int16_t mapTouch(int32_t raw, int16_t inMin, int16_t inMax, int16_t outMin,
                 int16_t outMax) {
  if (inMax <= inMin) return outMin;
  long value = map(raw, inMin, inMax, outMin, outMax);
  return static_cast<int16_t>(constrain(value, outMin, outMax));
}
}  // namespace

void TouchController::begin() {
#if defined(MARIA_M5STACK_CORE2_RADAR_TERMINAL)
  MariaBoard::begin();
#else
  SPI.begin(MariaBoard::kTouchSclk, MariaBoard::kTouchMiso,
            MariaBoard::kTouchMosi, MariaBoard::kTouchCs);
  touch.begin();
  touch.setRotation(MariaBoard::kLandscapeRotation);
#endif
}

TouchEvent TouchController::poll(const RadarPreferences &preferences) {
  TouchEvent event{};
#if defined(MARIA_M5STACK_CORE2_RADAR_TERMINAL)
  (void)preferences;
  M5.update();
  auto detail = M5.Touch.getDetail();
  if (!detail.isPressed()) return event;
  const uint32_t now = millis();
  if (now - lastTouchMs_ < kDebounceMs) return event;
  lastTouchMs_ = now;
  event.x = constrain(detail.x, 0, MariaBoard::kDisplayWidth - 1);
  event.y = constrain(detail.y, 0, MariaBoard::kDisplayHeight - 1);
  event.action = hitTest(event.x, event.y);
  return event;
#else
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
#endif
}

TouchAction TouchController::hitTest(int16_t x, int16_t y) const {
  switch (terminalTouchActionAt(x, y, MariaBoard::kDisplayWidth,
                                MariaBoard::kDisplayHeight)) {
    case TerminalTouchAction::Previous:
      return TouchAction::Previous;
    case TerminalTouchAction::Next:
      return TouchAction::Next;
    case TerminalTouchAction::Range:
      return TouchAction::Range;
    case TerminalTouchAction::Pause:
      return TouchAction::Pause;
    case TerminalTouchAction::Details:
      return TouchAction::Details;
    case TerminalTouchAction::Status:
      return TouchAction::Status;
    case TerminalTouchAction::Settings:
      return TouchAction::Settings;
    case TerminalTouchAction::ToggleLabels:
      return TouchAction::ToggleLabels;
    case TerminalTouchAction::None:
      return TouchAction::None;
  }
  return TouchAction::None;
}

}  // namespace MariaRadar

#endif
