# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [0.1.0-alpha] - 2026-07-18

### Added

- Local-first web radar, backend source selection, and deterministic demo mode.
- readsb/dump1090-compatible `aircraft.json` normalization and source status.
- M5Stack Core2 and ESP32-2432S028R firmware environments with diagnostics.
- Responsive radar console, compact Core2 payload, and source-state indicators.

### Changed

- OpenSky remains isolated behind a disabled-by-default optional feature flag.

### Fixed

- Core2 radar UI touch mapping and shared-build guards are covered by native
  tests.

### Known Limitations

- Real ADS-B receiver hardware is not bundled or validated in this release.
- Physical validation varies by board; receiver setup is user-managed.
- Alpha interfaces may evolve.
