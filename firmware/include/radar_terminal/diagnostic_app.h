#pragma once

#include <Arduino.h>

#include "gps_reader.h"
#include "radar_terminal/diagnostic_model.h"
#include "radar_terminal/radar_model.h"
#include "wifi_manager.h"

namespace MariaRadar {

class DiagnosticApp {
 public:
  void begin(WifiManager *wifiManager);
  bool poll(const GpsFix &fix);
  DiagnosticScreen screen() const;

 private:
  void drawMenu();
  void drawDisplayTest();
  void drawTouchTest();
  void drawBoardInfo();
  void drawWifiTest();
  void drawBackendTest(const GpsFix &fix);
  void drawSdTest();
  void drawLedTest();
  void drawSpeakerTest();
  void drawRadarDemo();
  void drawHeader(const char *title);
  void drawButton(int16_t x, int16_t y, int16_t w, const char *label);
  void printBoardInfo();
  void handleSerial();
  void setScreen(DiagnosticScreen screen);
  void runBackendTest(const GpsFix &fix);
  void runSdTest();
  void runLedStep();
  void beep(uint16_t hz, uint16_t ms);

  WifiManager *wifiManager_ = nullptr;
  DiagnosticScreen screen_ = DiagnosticScreen::Menu;
  uint32_t lastDrawMs_ = 0;
  uint8_t displayStep_ = 0;
  uint8_t ledStep_ = 0;
  int backendStatus_ = 0;
  uint32_t backendDurationMs_ = 0;
  char backendMessage_[64] = "untested";
  char sdMessage_[80] = "untested";
  char serialBuffer_[24]{};
  uint8_t serialLength_ = 0;
  uint16_t demoRangeKm_ = 50;
  int8_t demoSelected_ = 0;
  bool demoPaused_ = false;
};

bool diagnosticBootRequested();

}  // namespace MariaRadar
