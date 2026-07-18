# MARIA Flight Radar v0.1.0-alpha

## Why This Release Exists

This first public alpha establishes MARIA as an open-source, local-first flight
radar platform. It provides a reproducible demo path while the project gathers
live receiver and physical hardware evidence.

## Included

- Web radar, map, and dashboard.
- Local backend and deterministic demo source.
- readsb/dump1090-compatible local ADS-B software integration.
- Live, cache, demo, and offline source states.
- M5Stack Core2 and ESP32-2432S028R source targets and diagnostics.
- Public CI, contribution documentation, issue forms, and security policy.

## Validation Completed

- Root tests: 28 passed.
- Backend tests: 17 passed.
- Native firmware tests: 15 passed.
- Four firmware build environments passed: Core2 normal/diagnostic and
  ESP32-2432S028R normal/diagnostic.
- Clean-clone validation passed.
- Root production audit: 0 vulnerabilities.
- Backend production audit: 0 vulnerabilities.
- Demo snapshot: 8 deterministic targets.

## Hardware Status

- **M5Stack Core2:** firmware build-validated; upload evidence available;
  physical display/touch evidence pending.
- **ESP32-2432S028R:** firmware build-validated; physical validation pending.
- **RTL-SDR:** integration software ready; receiver hardware validation pending.

## Requirements

- Node.js 22.12 or later.
- npm.
- PlatformIO for firmware work.
- Optional RTL-SDR and 1090 MHz antenna for live mode.

## Source-Only Release

This alpha is source-only. Firmware binaries are not attached because board
physical validation and universal flashing guidance are not yet complete.

## Upgrade and Compatibility Notes

This is an alpha release. Web APIs, configuration, firmware interfaces, and
board support may evolve. Preserve local configuration outside Git and consult
the [installation guide](INSTALLATION.md) before upgrading.

## Security and Privacy Notes

Do not commit credentials, receiver coordinates, raw captures, or local
configuration. OpenSky is optional and disabled by default. MARIA requires no
paid service or cloud aircraft-data provider for demo or local receiver use.

## Safety Notice

MARIA is experimental and not certified for navigation, air traffic control,
collision avoidance, emergency response, or any safety-critical aviation use.
Data may be delayed, incomplete, inaccurate, or unavailable.

## License

Apache License 2.0. See [LICENSE](../LICENSE).

## Next Milestone

v0.2.0-beta: live receiver validation.
