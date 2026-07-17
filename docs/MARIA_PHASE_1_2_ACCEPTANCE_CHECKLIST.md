# MARIA Phase 1 and 2 Acceptance Checklist

- Backend starts without aircraft-source credentials.
- OpenSky credentials are backend-only and absent from frontend bundles.
- `/api/radar/snapshot` returns normalized aircraft and source health.
- `/api/radar/sources` reports configured source state.
- `/api/devices/core2/radar` returns the compact Core2 payload.
- `/api/traffic/nearby` remains compatible with existing clients.
- `/radar` can switch source modes.
- `/map` and `/dashboard` remain available.
- Core2 diagnostic and normal firmware builds still compile.
- Local ADS-B can be tested with a readsb/dump1090 fixture or receiver.
- No private receiver coordinates, secrets, tokens, screenshots, or generated
  artifacts are committed.
