# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### MARIA v0.2.0-beta.1 — Radar Rendering Engine (candidate)

- Modular radar rendering engine with a shared, immutable `RadarScene`, a
  fixed layer stack, and five selectable render modes that share all data,
  geometry, selection, trails, alert zones, and source-state handling:
  Tactical (default), Mission Control, Classic Radar, Presentation (2.5D),
  and Minimal Embedded.
- Typed mode registry and theme registry (CSS-variable themes); one shared
  CSS sweep animation; `applyRenderProfile` target/label/trail caps.
- Production render-mode selector with `maria.radar.renderMode` persistence
  and change-only aria-live announcements.
- Typed, disabled-by-default overlay plugin contract and immutable
  snapshot/playback foundations (no overlays implemented, no playback UI).
- Browser-validated responsive layouts across desktop, tablet, mobile, and a
  320×240 Minimal Embedded frame; sanitized deterministic DEMO screenshots for
  all five modes.
- Corrected the selected-target SVG bracket path and constrained the Minimal
  Embedded scope to its 4:3 frame.
- Backend API contracts unchanged; OpenSky remains optional/disabled; no
  firmware behavior changed. Candidate only; not released.

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
