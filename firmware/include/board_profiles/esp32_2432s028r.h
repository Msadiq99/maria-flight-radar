#pragma once

#include <Arduino.h>

#include "radar_terminal/boards/board_interface.h"

// MARIA ESP32 2.8-inch radar terminal board profile.
//
// Confirmed from PCB photos:
// - PCB marking: "2.8 LCD Display ESP32-32E 240x320 Resistance Touch"
// - ESP32-32E module
// - 2.8-inch 240x320 display
// - resistive touch
// - USB-C, microSD, RGB LED, speaker connector, battery connector, UART header,
//   and expansion connector.
//
// Still unverified on a powered device:
// - TFT controller, touch controller, GPIO mapping, backlight active level,
//   display rotation, touch calibration, SD pins, speaker output behavior.

namespace MariaBoard {

constexpr const char *kBoardName = "ESP32-2432S028R";
constexpr const char *kPcbMarking =
    "2.8 LCD Display ESP32-32E 240x320 Resistance Touch";
constexpr const char *kValidationStatus =
    "PARTIALLY_VERIFIED_FROM_PCB_PHOTOS";
constexpr const char *kPinValidationStatus = "UNVERIFIED_UNTIL_POWERED_TEST";
constexpr uint8_t kProfileRevision = 2;

constexpr uint16_t kDisplayWidth = 320;
constexpr uint16_t kDisplayHeight = 240;
constexpr uint8_t kLandscapeRotation = 1;
constexpr const char *kTftController = "ILI9341";
constexpr const char *kTouchController = "XPT2046";
constexpr TouchKind kTouchKind = TouchKind::ResistiveXpt2046;

constexpr int kTftMiso = 12;
constexpr int kTftMosi = 13;
constexpr int kTftSclk = 14;
constexpr int kTftCs = 15;
constexpr int kTftDc = 2;
constexpr int kTftRst = -1;

constexpr int kTouchMiso = 39;
constexpr int kTouchMosi = 32;
constexpr int kTouchSclk = 25;
constexpr int kTouchCs = 33;
constexpr int kTouchIrq = 36;

constexpr int kBacklightPin = 21;
constexpr int kBacklightActiveLevel = HIGH;

constexpr int kRgbLedRed = 4;
constexpr int kRgbLedGreen = 16;
constexpr int kRgbLedBlue = 17;
constexpr int kRgbActiveLevel = HIGH;

constexpr int kSdMiso = 19;
constexpr int kSdMosi = 23;
constexpr int kSdSclk = 18;
constexpr int kSdCs = 5;

constexpr int kSpeakerPin = -1;
constexpr int kSpeakerActiveLevel = HIGH;

constexpr BoardIdentity kIdentity{kBoardName,
                                  kPcbMarking,
                                  kDisplayWidth,
                                  kDisplayHeight,
                                  "resistive touch",
                                  kValidationStatus,
                                  kProfileRevision};

}  // namespace MariaBoard
