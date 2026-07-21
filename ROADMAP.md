# Roadmap

## v0.1.0-alpha: Public foundation

- Public documentation, demo mode, existing web/backend, existing firmware
  targets, public CI, and contribution system.

## v0.2: Radar rendering engine (in development)

- Modular rendering engine with five render modes (Tactical, Mission
  Control, Classic Radar, Presentation, Minimal Embedded) sharing one
  scene model, mode/theme registries, profile-based density caps, a
  production mode selector with persistence, overlay extension points,
  and snapshot/playback readiness. Not released.

## v0.2.1: Live receiver integration validation

- RTL-SDR/readsb live feed, target-volume performance, stale-data
  transitions, receiver disconnect/reconnect behavior, renderer profiling,
  and hardware-terminal parity review.

## v0.2.0-beta: Live receiver validation

- RTL-SDR validation, readsb/dump1090 guide, live web and Core2 evidence,
  source-transition testing, and release binaries for validated boards.

## v0.3.0: Multi-firmware framework

- Board abstraction refinement, maintainer-selected ESP32 variants, a board
  porting workflow, and build matrix expansion.

## Future

- Historical playback, airport metadata, optional weather overlays, local
  receiver diagnostics, Raspberry Pi appliance mode, more embedded displays,
  and a mobile companion application.
