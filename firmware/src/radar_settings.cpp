#ifdef MARIA_ESP32_28_RADAR_TERMINAL

#include "radar_terminal/radar_settings.h"

#include <Preferences.h>

namespace MariaRadar {

namespace {
constexpr const char *kNamespace = "maria-radar";
constexpr const char *kBlob = "prefs";
}

void RadarSettings::begin() {
  Preferences store;
  store.begin(kNamespace, true);
  RadarPreferences loaded{};
  const size_t read = store.getBytes(kBlob, &loaded, sizeof(loaded));
  store.end();
  preferences_ =
      read == sizeof(loaded) && validPreferences(loaded) ? loaded : RadarPreferences{};
}

const RadarPreferences &RadarSettings::get() const {
  return preferences_;
}

void RadarSettings::save(const RadarPreferences &preferences) {
  preferences_ = validPreferences(preferences) ? preferences : RadarPreferences{};
  Preferences store;
  store.begin(kNamespace, false);
  store.putBytes(kBlob, &preferences_, sizeof(preferences_));
  store.end();
}

void RadarSettings::reset() {
  preferences_ = RadarPreferences{};
  Preferences store;
  store.begin(kNamespace, false);
  store.clear();
  store.end();
}

}  // namespace MariaRadar

#endif
