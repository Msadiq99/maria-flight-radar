# MARIA Flight Radar v0.1.0-alpha

## Summary

The first public alpha establishes MARIA as a local-first flight-radar
ecosystem with a web console, local backend, deterministic demo mode, and
existing ESP32 firmware environments.

## Included

- Web radar, map, and dashboard.
- Local readsb/dump1090 `aircraft.json` adapter and deterministic fallback.
- Source-state reporting, compact Core2 payload, and local backend APIs.
- M5Stack Core2 and ESP32-2432S028R normal and diagnostic firmware builds.

## Data Modes

MARIA supports local receiver data, cached local snapshots, deterministic demo
data, and offline state. OpenSky is optional, disabled by default, and not
required for any alpha workflow.

## Known Limitations

Receiver hardware is not bundled. Live ADS-B and physical board validation are
not claimed without evidence. Receiver installation is user-managed and alpha
interfaces may change.

## Security and Safety

Keep MARIA on trusted local networks and never commit secrets or private
coordinates. MARIA is experimental and not certified for navigation, air traffic
control, collision avoidance, emergency response, or other safety-critical use.
Data may be delayed, incomplete, inaccurate, or unavailable. Follow local rules
for radio reception, antennas, networking, storage, and redistribution.

## Next Milestone

v0.2.0-beta focuses on live receiver validation and evidence for supported
hardware.

## Acknowledgments

Built with the open-source React, Express, PlatformIO, Arduino, and ADS-B
receiver ecosystems.
