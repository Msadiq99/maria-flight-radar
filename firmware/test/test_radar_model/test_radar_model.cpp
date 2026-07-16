#include <unity.h>

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

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_cardinal_projection);
  RUN_TEST(test_range_clipping_and_invalid_coordinates);
  RUN_TEST(test_distance_and_bearing);
  RUN_TEST(test_altitude_filtering_and_selection);
  RUN_TEST(test_alert_boundaries_and_freshness);
  RUN_TEST(test_vertical_state_and_preferences);
  return UNITY_END();
}
