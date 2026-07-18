#pragma once

#include <Arduino.h>

#include "radar_terminal/boards/board_interface.h"

namespace MariaBoard {

constexpr const char *kBoardName = "M5Stack Core2";
constexpr const char *kPcbMarking = "M5Stack Core2 ESP32 320x240";
constexpr const char *kValidationStatus = "M5STACK_CORE2_PROFILE_UNVERIFIED";
constexpr const char *kPinValidationStatus = "M5STACK_CORE2_LIBRARY_ABSTRACTION";
constexpr uint8_t kProfileRevision = 1;

constexpr uint16_t kDisplayWidth = 320;
constexpr uint16_t kDisplayHeight = 240;
constexpr uint8_t kLandscapeRotation = 1;
constexpr const char *kTftController = "ILI9342C";
constexpr const char *kTouchController = "FT6336U";
constexpr TouchKind kTouchKind = TouchKind::CapacitiveFt6336u;

constexpr int kTftMiso = -1;
constexpr int kTftMosi = -1;
constexpr int kTftSclk = -1;
constexpr int kTftCs = -1;
constexpr int kTftDc = -1;
constexpr int kTftRst = -1;

constexpr int kTouchMiso = -1;
constexpr int kTouchMosi = -1;
constexpr int kTouchSclk = -1;
constexpr int kTouchCs = -1;
constexpr int kTouchIrq = -1;

constexpr int kBacklightPin = -1;
constexpr int kBacklightActiveLevel = HIGH;

constexpr int kRgbLedRed = -1;
constexpr int kRgbLedGreen = -1;
constexpr int kRgbLedBlue = -1;
constexpr int kRgbActiveLevel = HIGH;

constexpr int kSdMiso = -1;
constexpr int kSdMosi = -1;
constexpr int kSdSclk = -1;
constexpr int kSdCs = -1;

constexpr int kSpeakerPin = -1;
constexpr int kSpeakerActiveLevel = HIGH;

constexpr BoardIdentity kIdentity{kBoardName,
                                  kPcbMarking,
                                  kDisplayWidth,
                                  kDisplayHeight,
                                  "capacitive touch",
                                  kValidationStatus,
                                  kProfileRevision};

}  // namespace MariaBoard
