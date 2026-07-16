#pragma once

#include <Arduino.h>

// MARIA ESP32 2.8-inch radar terminal board profile.
//
// Expected board family: ESP32-2432S028R, often sold as a 2.8-inch integrated
// ESP32 + ILI9341 + XPT2046 display module. These pin values match common
// ESP32-2432S028R/CYD public profiles, but the exact PCB revision has not been
// physically inspected in this repository. Verify the silk-screen/PCB marking
// before treating this profile as hardware-validated.

namespace MariaBoard {

constexpr const char *kBoardName = "ESP32-2432S028R";
constexpr const char *kValidationStatus =
    "UNVERIFIED_TEMPLATE_REQUIRES_PCB_MARKING";

constexpr uint16_t kDisplayWidth = 320;
constexpr uint16_t kDisplayHeight = 240;
constexpr uint8_t kLandscapeRotation = 1;
constexpr const char *kTftController = "ILI9341";
constexpr const char *kTouchController = "XPT2046";

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

constexpr int kSdMiso = 19;
constexpr int kSdMosi = 23;
constexpr int kSdSclk = 18;
constexpr int kSdCs = 5;

constexpr uint32_t kSerialBaud = 115200;

}  // namespace MariaBoard
