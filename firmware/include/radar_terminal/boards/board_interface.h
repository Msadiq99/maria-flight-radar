#pragma once

#include <stdint.h>

namespace MariaBoard {

struct BoardIdentity {
  const char *family;
  const char *pcbMarking;
  uint16_t width;
  uint16_t height;
  const char *touchType;
  const char *validationStatus;
  uint8_t profileRevision;
};

enum class TouchKind : uint8_t {
  None,
  ResistiveXpt2046,
  CapacitiveFt6336u,
};

constexpr uint32_t kSerialBaud = 115200;

void begin();
void setBrightness(uint8_t brightness);
void beep(uint16_t hz, uint16_t ms);
bool sdBegin();
void restart();
const BoardIdentity &identity();
const char *boardName();
const char *validationStatus();

}  // namespace MariaBoard
