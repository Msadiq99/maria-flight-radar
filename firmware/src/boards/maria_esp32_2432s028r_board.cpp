#ifdef MARIA_ESP32_28_RADAR_TERMINAL

#include "board_profiles/esp32_2432s028r.h"

#include <SD.h>
#include <SPI.h>

namespace MariaBoard {

void begin() {}

void setBrightness(uint8_t brightness) {
  (void)brightness;
  if (kBacklightPin >= 0) {
    pinMode(kBacklightPin, OUTPUT);
    digitalWrite(kBacklightPin, kBacklightActiveLevel);
  }
}

void beep(uint16_t hz, uint16_t ms) {
#if !MARIA_DISABLE_AUDIO
  if (kSpeakerPin >= 0) tone(kSpeakerPin, hz, ms);
#else
  (void)hz;
  (void)ms;
#endif
}

bool sdBegin() {
#if MARIA_DISABLE_SD
  return false;
#else
  SPI.begin(kSdSclk, kSdMiso, kSdMosi, kSdCs);
  return SD.begin(kSdCs);
#endif
}

void restart() { ESP.restart(); }

const BoardIdentity &identity() { return kIdentity; }
const char *boardName() { return kBoardName; }
const char *validationStatus() { return kValidationStatus; }

}  // namespace MariaBoard

#endif
