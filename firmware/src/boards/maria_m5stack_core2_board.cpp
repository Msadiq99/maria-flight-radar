#ifdef MARIA_M5STACK_CORE2_RADAR_TERMINAL

#include "board_profiles/m5stack_core2.h"

#include <M5Unified.h>
#include <SD.h>

namespace MariaBoard {

namespace {
bool initialized = false;
}

void begin() {
  if (initialized) return;
  auto cfg = M5.config();
  cfg.serial_baudrate = kSerialBaud;
  cfg.output_power = true;
  cfg.internal_spk = true;
  cfg.internal_imu = true;
  M5.begin(cfg);
  M5.Display.setRotation(kLandscapeRotation);
  M5.Display.setBrightness(180);
  initialized = true;
}

void setBrightness(uint8_t brightness) {
  begin();
  M5.Display.setBrightness(brightness);
}

void beep(uint16_t hz, uint16_t ms) {
#if !MARIA_DISABLE_AUDIO
  begin();
  M5.Speaker.tone(hz, ms);
#else
  (void)hz;
  (void)ms;
#endif
}

bool sdBegin() {
#if MARIA_DISABLE_SD
  return false;
#else
  begin();
  return SD.begin(GPIO_NUM_4);
#endif
}

void restart() { ESP.restart(); }

const BoardIdentity &identity() { return kIdentity; }
const char *boardName() { return kBoardName; }
const char *validationStatus() { return kValidationStatus; }

}  // namespace MariaBoard

#endif
