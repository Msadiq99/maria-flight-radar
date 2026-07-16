#pragma once

#include "radar_terminal/radar_model.h"

namespace MariaRadar {

class RadarSettings {
 public:
  void begin();
  const RadarPreferences &get() const;
  void save(const RadarPreferences &preferences);
  void reset();

 private:
  RadarPreferences preferences_{};
};

}  // namespace MariaRadar
