# MARIA Flight Radar

MARIA Flight Radar is an open-source, local-first flight-radar ecosystem. It
connects a local ADS-B receiver or deterministic demo data to a MARIA backend,
a web radar console, and ESP32-based display terminals including M5Stack Core2.

## Project Status

**v0.1.0-alpha**. MARIA is under active development, with weekly updates
planned. API and firmware interfaces may evolve. It is not a production
aviation system and must not be used for navigation or safety-critical
decisions.

> MARIA Flight Radar is an experimental educational and engineering project. It
> is not certified for aircraft navigation, air traffic control, collision
> avoidance, emergency response, or any safety-critical aviation function. Data
> may be delayed, incomplete, inaccurate, or unavailable. Users are responsible
> for following local regulations concerning radio reception, antenna
> installation, networking, data storage, and redistribution.

## Features

- Responsive web radar, focused map, and dashboard views.
- Deterministic demo mode for offline development.
- Local readsb/dump1090 `aircraft.json` ingestion with live, cache, demo, and
  offline source states.
- Selected-aircraft details, target trails, and range modes.
- Compact M5Stack Core2 radar payload and terminal firmware.
- ESP32-2432S028R firmware and diagnostic firmware environments.
- Source-status endpoint and local-first fallback behavior.

Live receiver and physical hardware validation are tracked separately; this
alpha does not claim either without recorded evidence.

## Architecture

```text
1090 MHz antenna
        ↓
RTL-SDR receiver
        ↓
readsb / dump1090
        ↓
MARIA backend
        ├── Web radar
        └── ESP32 / M5Stack radar terminals
```

Before receiver hardware is available, MARIA uses this fully local path:

```text
Deterministic simulator
        ↓
MARIA backend
        ├── Web radar
        └── ESP32 / M5Stack radar terminals
```

OpenSky is optional, disabled by default, and subject to its current terms,
rate limits, approval, and licensing requirements. MARIA does not contact it or
send aircraft or location data to an external provider by default.

## Live Hardware Requirements

- RTL-SDR dongle and 1090 MHz ADS-B antenna.
- Appropriate SMA cable and adapters.
- Mac, Linux computer, Raspberry Pi, or mini PC running readsb or dump1090.
- MARIA backend and web application.
- A supported ESP32 terminal, optionally.

GPS is optional when fixed receiver coordinates are configured locally.

## Quick Start: Demo Mode

```bash
git clone https://github.com/Msadiq99/maria-flight-radar.git
cd maria-flight-radar
npm install
npm run dev:all
```

Open the web radar at <http://127.0.0.1:5175/radar>. The backend health endpoint
is <http://127.0.0.1:8081/health>. In a second terminal, verify the local stack:

```bash
npm run dev:check
```

## Quick Start: Local ADS-B

1. Run readsb or dump1090 on your local network.
2. Copy `.env.example` to `.env` and set `LOCAL_ADSB_ENABLED=true`,
   `LOCAL_ADSB_BASE_URL`, and any receiver coordinates locally.
3. Start MARIA with `npm run dev:all`.
4. Validate the receiver endpoint with `npm run adsb:check` and inspect
   `/api/radar/sources` on the backend.

## Firmware

Existing PlatformIO environments are listed in
[the firmware support matrix](docs/FIRMWARE_SUPPORT_MATRIX.md). Build an
environment with:

```bash
cd firmware
pio run -e <environment>
pio run -e <environment> -t upload --upload-port /dev/cu.usbserial-*
```

Use `/dev/ttyUSB0` on many Linux systems or `COM3` on Windows where appropriate.

## Repository Structure

- `src/` - React web application and radar UI.
- `backend/` - Express API, SQLite store, and source adapters.
- `firmware/` - PlatformIO firmware, shared radar logic, board profiles, tests.
- `docs/` - Installation, architecture, hardware, and release documentation.
- `scripts/` - Local development and receiver checks.

## Documentation

- [Installation](docs/INSTALLATION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Firmware support matrix](docs/FIRMWARE_SUPPORT_MATRIX.md)
- [Board porting guide](docs/BOARD_PORTING_GUIDE.md)
- [Release process](docs/RELEASE_PROCESS.md)
- [Security policy](SECURITY.md)

## Roadmap

See [ROADMAP.md](ROADMAP.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md).

## License

Licensed under the Apache License 2.0. See [LICENSE](LICENSE).

## Author

Designed and developed by M. Sadiq.
