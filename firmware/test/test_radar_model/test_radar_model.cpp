#include <unity.h>

#include "radar_terminal/diagnostic_model.h"
#include "radar_terminal/radar_model.h"

using namespace MariaRadar;

void test_cardinal_projection() {
  ScreenPoint north = projectTarget(0, 10, 50, 160, 120, 100);
  TEST_ASSERT_TRUE(north.visible);
  TEST_ASSERT_EQUAL_INT16(160, north.x);
  TEST_ASSERT_EQUAL_INT16(100, north.y);

  ScreenPoint east = projectTarget(90, 25, 50, 160, 120, 100);
  TEST_ASSERT_TRUE(east.visible);
  TEST_ASSERT_EQUAL_INT16(210, east.x);
  TEST_ASSERT_EQUAL_INT16(120, east.y);
}

void test_range_clipping_and_invalid_coordinates() {
  TEST_ASSERT_FALSE(projectTarget(0, 51, 50, 160, 120, 100).visible);
  TEST_ASSERT_FALSE(projectTarget(NAN, 10, 50, 160, 120, 100).visible);
  TEST_ASSERT_FALSE(finiteCoordinate(91, 0));
  TEST_ASSERT_TRUE(isnan(distanceKm(91, 0, 0, 0)));
}

void test_distance_and_bearing() {
  TEST_ASSERT_FLOAT_WITHIN(0.01f, 0.0f, distanceKm(25, 55, 25, 55));
  TEST_ASSERT_FLOAT_WITHIN(1.0f, 90.0f, bearingDeg(25, 55, 25, 56));
}

void test_altitude_filtering_and_selection() {
  Aircraft aircraft[3]{};
  aircraft[0].altitudeValid = false;
  aircraft[0].distanceKm = 8;
  aircraft[1].altitudeValid = true;
  aircraft[1].altitudeMeters = 1500;
  aircraft[1].distanceKm = 4;
  aircraft[2].altitudeValid = true;
  aircraft[2].altitudeMeters = 11000;
  aircraft[2].distanceKm = 2;

  TEST_ASSERT_TRUE(altitudeMatches(aircraft[0], AltitudeFilter::GroundUnknown));
  TEST_ASSERT_TRUE(altitudeMatches(aircraft[1], AltitudeFilter::Below10000));
  TEST_ASSERT_TRUE(altitudeMatches(aircraft[2], AltitudeFilter::Above30000));
  TEST_ASSERT_EQUAL_INT(1, selectedAfterFiltering(aircraft, 3, 2,
                                                  AltitudeFilter::Below10000));
}

void test_alert_boundaries_and_freshness() {
  AlertThresholds zones{};
  TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(AlertZone::Critical),
                          static_cast<uint8_t>(classifyAlertZone(5, zones)));
  TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(AlertZone::Warning),
                          static_cast<uint8_t>(classifyAlertZone(15, zones)));
  TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(AlertZone::Advisory),
                          static_cast<uint8_t>(classifyAlertZone(30, zones)));
  TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(AlertZone::Normal),
                          static_cast<uint8_t>(classifyAlertZone(31, zones)));

  TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(Freshness::Live),
                          static_cast<uint8_t>(freshness(90'000, 100'000)));
  TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(Freshness::Delayed),
                          static_cast<uint8_t>(freshness(50'000, 100'000)));
  TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(Freshness::Stale),
                          static_cast<uint8_t>(freshness(1, 100'000)));
}

void test_vertical_state_and_preferences() {
  Aircraft aircraft{};
  aircraft.verticalRateValid = true;
  aircraft.verticalRateMps = 1;
  TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(VerticalState::Climbing),
                          static_cast<uint8_t>(verticalState(aircraft)));
  aircraft.verticalRateMps = -1;
  TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(VerticalState::Descending),
                          static_cast<uint8_t>(verticalState(aircraft)));
  aircraft.verticalRateMps = 0.1f;
  TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(VerticalState::Level),
                          static_cast<uint8_t>(verticalState(aircraft)));

  RadarPreferences preferences{};
  TEST_ASSERT_TRUE(validPreferences(preferences));
  preferences.alertZones.warningKm = 4;
  TEST_ASSERT_FALSE(validPreferences(preferences));
  preferences.alertZones.warningKm = 15;
  preferences.rangeKm = 10;
  TEST_ASSERT_FALSE(validPreferences(preferences));
}

void test_diagnostic_calibration_and_commands() {
  CalibrationBounds bounds{};
  TEST_ASSERT_TRUE(validCalibrationBounds(bounds));
  bounds.maxX = 500;
  TEST_ASSERT_FALSE(validCalibrationBounds(bounds));
  TEST_ASSERT_EQUAL_INT16(159, mapCalibrated(2050, 300, 3800, 0, 319));
  TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(SerialCommand::Display),
                          static_cast<uint8_t>(parseSerialCommand("display\n")));
  TEST_ASSERT_EQUAL_UINT8(static_cast<uint8_t>(DiagnosticScreen::RadarDemo),
                          static_cast<uint8_t>(screenForCommand(SerialCommand::Demo)));
}

void test_diagnostic_status_classification_and_rgb() {
  TEST_ASSERT_EQUAL_UINT8(
      static_cast<uint8_t>(BackendDiagnosticState::GpsUnavailable),
      static_cast<uint8_t>(classifyBackendStatus(0, false, true, false, false)));
  TEST_ASSERT_EQUAL_UINT8(
      static_cast<uint8_t>(BackendDiagnosticState::HttpOk),
      static_cast<uint8_t>(classifyBackendStatus(200, true, true, true, false)));
  TEST_ASSERT_EQUAL_UINT8(
      static_cast<uint8_t>(BackendDiagnosticState::JsonMalformed),
      static_cast<uint8_t>(classifyBackendStatus(200, false, true, true, false)));
  TEST_ASSERT_EQUAL_UINT8(
      static_cast<uint8_t>(WifiDiagnosticState::Connected),
      static_cast<uint8_t>(classifyWifiStatus(true, false, false)));
  TEST_ASSERT_FALSE(rgbOutputLevel(true, true));
  TEST_ASSERT_TRUE(rgbOutputLevel(false, true));
}

void test_demo_aircraft_motion_is_bounded() {
  DemoAircraft first = demoAircraftAt(3, 0);
  DemoAircraft moved = demoAircraftAt(3, 1000);
  TEST_ASSERT_NOT_EQUAL(first.bearingDeg, moved.bearingDeg);
  TEST_ASSERT_TRUE(moved.distanceKm > 0);
  ScreenPoint clipped = projectTarget(moved.bearingDeg, 250, 50, 160, 120, 80);
  TEST_ASSERT_FALSE(clipped.visible);
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_cardinal_projection);
  RUN_TEST(test_range_clipping_and_invalid_coordinates);
  RUN_TEST(test_distance_and_bearing);
  RUN_TEST(test_altitude_filtering_and_selection);
  RUN_TEST(test_alert_boundaries_and_freshness);
  RUN_TEST(test_vertical_state_and_preferences);
  RUN_TEST(test_diagnostic_calibration_and_commands);
  RUN_TEST(test_diagnostic_status_classification_and_rgb);
  RUN_TEST(test_demo_aircraft_motion_is_bounded);
  return UNITY_END();
}
