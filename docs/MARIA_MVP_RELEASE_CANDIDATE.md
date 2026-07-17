# MARIA Flight Radar MVP

This release candidate defines the local-first MARIA MVP path: a deterministic
ADS-B simulator or local readsb/dump1090 receiver feeds the MARIA backend, which
serves the web radar and M5Stack Core2 radar terminal without paid services,
API credentials, OAuth tokens, cloud aircraft-data providers, or an internet
connection.

## Included

- Local ADS-B `aircraft.json` adapter for readsb/dump1090-compatible feeds.
- Deterministic local ADS-B simulator for development before SDR hardware is
  available.
- Unified aircraft model, local source health, local source caching,
  deduplication, stale-data handling, and simulation fallback.
- Web radar consumption of the backend radar snapshot API.
- M5Stack Core2 compact radar payload endpoint.
- Core2 normal firmware build and upload target.
- OpenSky isolated behind `OPENSKY_ENABLED=false` by default.

## Not Required

- Paid services, paid subscriptions, commercial APIs, or recurring external-data
  charges.
- OpenSky account, approval, credentials, OAuth token, or internet access.
- Any cloud-hosted aircraft data provider.
- Sending aircraft or location data to an external service by default.

## Exact Start Commands

Backend on the Mac LAN:

```bash
cd backend
PORT=8081 \
API_KEY=change-me \
LOCAL_ADSB_ENABLED=true \
LOCAL_ADSB_SIMULATOR=true \
LOCAL_ADSB_BASE_URL=http://localhost:8080 \
LOCAL_ADSB_AIRCRAFT_PATH=/data/aircraft.json \
MARIA_SOURCE_MODE=auto \
MARIA_SOURCE_PRIORITY=local_adsb,simulation \
MARIA_SIMULATION_FALLBACK=true \
OPENSKY_ENABLED=false \
node -e "import('./src/server.js').then(({ app }) => app.listen(process.env.PORT, '0.0.0.0'))"
```

Web radar:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8081 npm run dev -- --host 127.0.0.1
```

Then open:

```text
http://127.0.0.1:5175/radar?lat=24.7136&lon=46.6753
```

If Vite selects another port, use the port printed by `npm run dev`.

## Exact Core2 Commands

Build normal Core2 firmware:

```bash
cd firmware
pio run -e maria-m5stack-core2
```

Upload to the validated Core2 serial port:

```bash
pio run -e maria-m5stack-core2 -t upload --upload-port /dev/cu.usbserial-537A0079331
```

Open the monitor:

```bash
pio device monitor --port /dev/cu.usbserial-537A0079331 --baud 115200
```

The Core2 backend URL for the current Mac LAN run was:

```text
http://172.16.194.79:8081
```

## Setup Instructions

1. Keep `OPENSKY_ENABLED=false`.
2. Start the backend with `LOCAL_ADSB_SIMULATOR=true` until SDR hardware is
   available.
3. Start the web radar with `VITE_API_BASE_URL` pointed at the backend.
4. Build and upload `maria-m5stack-core2`.
5. Use the Core2 Wi-Fi setup flow or existing saved Wi-Fi credentials so the
   device can reach the backend LAN URL.
6. When SDR hardware is available, run readsb or dump1090 locally and switch
   only configuration:
   - `LOCAL_ADSB_SIMULATOR=false`
   - `LOCAL_ADSB_BASE_URL=<local receiver base URL>`
   - `LOCAL_ADSB_AIRCRAFT_PATH=/data/aircraft.json`

## Verified

Automated and API-level verification from this RC pass:

- Branch: `feature/maria-m5stack-core2-radar-terminal`.
- Local backend started on `0.0.0.0:8081`.
- Localhost and LAN health checks returned HTTP 200.
- `/api/radar/snapshot` returned HTTP 200 with source mode `auto`.
- Active source was `local_adsb`.
- Deterministic simulator returned 8 aircraft.
- First normalized simulator aircraft: `SIM1`, source `local_adsb`, category
  `simulator`, not stale.
- `/api/devices/core2/radar` returned HTTP 200 with 8 compact aircraft targets.
- Web app loaded `/radar` through Vite and polled `/api/radar/snapshot`.
- Core2 normal firmware built successfully.
- Core2 upload succeeded on `/dev/cu.usbserial-537A0079331`.
- Detected Core2 upload chip: `ESP32-D0WDQ6-V3 (revision v3.0)`.
- Normal-runtime observability fix committed as `211df5a`.

## Core2 Runtime Evidence

- Firmware environment: `maria-m5stack-core2`.
- Serial port: `/dev/cu.usbserial-537A0079331`.
- Upload result: successful; bootloader, partition table, and application
  hashes verified.
- Chip: `ESP32-D0WDQ6-V3`, revision `v3.0`.
- Serial-log result: PlatformIO monitor could not allocate a macOS TTY
  (`termios: Operation not supported by device`); a direct 30-second serial
  capture after reset received no bytes.
- Visible screen result: not captured by the software environment; physical
  confirmation is still required.
- Runtime mode: not established. The new firmware is designed to show `SETUP`
  when Wi-Fi is unconfigured and `DEMO` fallback when live transport is
  unavailable.
- Aircraft count: not physically observed. Deterministic fallback is four
  targets; the backend simulator previously provided eight targets.
- Remaining hardware checks: confirm a nonblank boot/radar or setup screen,
  stable runtime without reboot loops, and optionally live backend transition.

Real hardware verified in this pass:

- Core2 serial port detection.
- Core2 firmware upload and hash verification.

Visually confirmed:

- No new visual confirmation was captured during this RC pass.
- Previous diagnostic-menu checks remain separate from this MVP runtime review.

## Pending

- Core2 runtime boot logs were not received after the successful normal-firmware
  upload, and the physical screen has not yet been confirmed.
- Core2 display, touch, Wi-Fi association, backend polling, and radar rendering
  still require physical confirmation on the device.
- Full browser visual automation was not available because the offline
  environment could not install the Playwright CLI package.
- SDR hardware readsb/dump1090 integration still requires receiver hardware
  validation.

## Zero-Subscription Statement

## Real ADS-B Readiness

- Adapter implementation: IMPLEMENTED for readsb/dump1090 aircraft.json.
- Supported output: VALIDATED WITH FIXTURE for position, altitude, speed, track,
  vertical rate, callsign, squawk, category, emergency, signal, and age fields.
- Simulator fallback: IMPLEMENTED and remains enabled for development.
- Web readiness: IMPLEMENTED through the existing radar snapshot polling path.
- Core2 readiness: IMPLEMENTED through the bounded compact payload endpoint.
- Physical RTL-SDR validation: PENDING HARDWARE.

No real RTL-SDR payload has been observed in this environment.

MARIA MVP is designed to run fully locally. The required live data path is:

```text
RTL-SDR + ADS-B antenna
-> readsb or dump1090
-> local aircraft.json
-> MARIA backend
-> MARIA web radar and M5Stack Core2
```

The development path before SDR hardware is available is:

```text
Deterministic ADS-B fixture/simulator
-> MARIA backend
-> MARIA web radar and M5Stack Core2
```

OpenSky is optional, disabled by default, and not required for building,
testing, first setup, Core2 operation, web radar operation, or backend
operation. OpenSky usage is subject to its current terms, rate limits, approval,
and licensing requirements, and is not described as guaranteed free.

## Known Limitations

- The current RC cannot claim Core2 runtime success until boot logs or physical
  device behavior confirm that normal firmware starts and renders a nonblank
  setup, fallback, or live radar state.
- The current RC cannot claim browser pixel-level verification because Playwright
  installation was blocked by offline package resolution.
- The upload log reported a non-fatal crystal-frequency warning during esptool
  connection; upload and hash verification still completed successfully.
- No paid or external service is required, and no credentials or private
  coordinates should be committed.
