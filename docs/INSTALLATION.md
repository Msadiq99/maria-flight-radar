# Installation

## Prerequisites

- Node.js 22 or newer and npm.
- Python and PlatformIO for firmware builds.
- Optional: a local readsb or dump1090 receiver and compatible RTL-SDR setup.

## Web and Backend

```bash
git clone https://github.com/Msadiq99/maria-flight-radar.git
cd maria-flight-radar
npm install
npm run dev:all
```

The web application listens at `http://127.0.0.1:5175` and the backend at
`http://127.0.0.1:8081`. Run `npm run dev:check` to validate both services.

Copy `.env.example` to `.env` only when local configuration is required. Never
commit it. Backend-specific values can be placed in `backend/.env` when your
startup method loads them.

## Demo Mode

Set `LOCAL_ADSB_SIMULATOR=true` and leave `OPENSKY_ENABLED=false`. The backend
then supplies deterministic demo targets without a receiver, credentials, or an
internet connection.

## Local ADS-B

Run readsb or dump1090, then set `LOCAL_ADSB_ENABLED=true`,
`LOCAL_ADSB_BASE_URL=http://127.0.0.1:8080`, and
`LOCAL_ADSB_AIRCRAFT_PATH=/data/aircraft.json` in your local environment.
Optionally set `LOCAL_ADSB_RECEIVER_LAT` and `LOCAL_ADSB_RECEIVER_LON`; do not
commit private receiver coordinates. Validate the receiver with
`npm run adsb:check`.

## Firmware

```bash
cd firmware
cp include/config.example.h include/config.h
pio run -e maria-m5stack-core2
```

Set `API_HOST` in local `config.h` to `http://<MARIA_BACKEND_HOST>:8081` before
flashing. Use an explicit serial port only after identifying the connected
device, for example `/dev/cu.usbserial-*`, `/dev/ttyUSB0`, or `COM3`.

## Common Problems

- Port conflict: `npm run dev:preflight` identifies conflicts on 5175 and 8081.
- Web offline state: confirm `http://127.0.0.1:8081/health` and API base URL.
- LAN access: use the host computer's LAN address in local firmware config; do
  not expose the backend to the public internet without hardening.
- Firewall: allow local-network access only when the device must reach the
  backend.
- Core2: its backend URL must be reachable from the same Wi-Fi network.

> MARIA is experimental, not safety-certified, and not for navigation or other
> safety-critical aviation use. Data can be delayed, incomplete, inaccurate, or
> unavailable. Follow local rules for radio reception, antennas, networking,
> storage, and redistribution.
