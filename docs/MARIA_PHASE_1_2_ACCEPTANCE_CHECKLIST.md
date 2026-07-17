# MARIA Phase 1 and 2 Acceptance Checklist

- Backend starts without aircraft-source credentials.
- Entire repository builds with `OPENSKY_ENABLED=false`.
- All tests pass without internet access or API credentials.
- Web radar works using simulated local ADS-B data.
- Core2 works using backend simulation data.
- No paid or external aircraft-data service is required.
- No aircraft or location data is sent to an external provider by default.
- OpenSky remains optional, disabled by default, and isolated behind
  `OPENSKY_ENABLED=true`.
- `/api/radar/snapshot` returns normalized aircraft and source health.
- `/api/radar/sources` reports configured source state.
- `/api/devices/core2/radar` returns the compact Core2 payload.
- `/api/traffic/nearby` remains compatible with existing clients.
- `/radar` can switch source modes.
- `/map` and `/dashboard` remain available.
- Core2 diagnostic and normal firmware builds still compile.
- Local readsb/dump1090 fixtures are normalized correctly.
- Switching from simulation to a future local receiver requires configuration,
  not application rewrites.
- No private receiver coordinates, secrets, tokens, screenshots, or generated
  artifacts are committed.
