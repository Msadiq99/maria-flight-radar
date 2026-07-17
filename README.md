# MARIA Flight Radar

MARIA Flight Radar is a live GPS/IMU tracker dashboard with nearby-aircraft
awareness. It includes ESP32 firmware, a local Express telemetry backend, and a
React/Leaflet web dashboard.

## Current features

- Live tracker telemetry from the M5StickC PLUS2 firmware
- Simulated GPS mode for testing before the physical GPS module is installed
- Interactive Leaflet map with tracker trail and aircraft overlay
- Nearby aircraft feed designed for local ADS-B first, with deterministic
  simulation fallback and optional OpenSky integration disabled by default
- Flyby prediction based on heading, speed, distance, and monitoring radius
- 3D closest-approach prediction with vertical separation and confidence
- Configurable browser alerts with callsign, airline, altitude, score, and
  quiet-hour filters
- Multi-tracker discovery and historical track playback
- Saved monitoring geofences, aircraft trails, and airport/runway overlays
- Detailed flight table with callsign, tail number, aircraft type, airline,
  route, altitude, speed, heading, distance, and flyby probability
- Sortable aircraft list
- Flyby schedule focused on likely nearby passes
- Custom monitoring latitude, longitude, and radius
- External links to Flightradar24 and Skybrary
- Auto-refreshing telemetry and traffic data
- Server-sent live telemetry with polling fallback
- English and Arabic layouts, light/dark/system themes, and high contrast mode
- CSV and GeoJSON exports plus shareable monitoring URLs
- Installable PWA shell with offline caching

## MARIA MVP Quick Start

For the zero-subscription MVP startup sequence, validation status, and Core2
release-candidate notes, see
[docs/MARIA_MVP_RELEASE_CANDIDATE.md](docs/MARIA_MVP_RELEASE_CANDIDATE.md).

## Local development

Backend:

```bash
cd backend
PORT=8081 API_KEY=change-me MARIA_SOURCE_MODE=auto npm start
```

Frontend:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8081 npm run dev -- --host 127.0.0.1
```

Firmware:

```bash
cd firmware
pio run -t upload --upload-port /dev/cu.usbserial-5B1E0424571
pio device monitor --port /dev/cu.usbserial-5B1E0424571 --baud 115200
```

## Zero-Subscription Traffic Sources

MARIA does not require a paid service, paid subscription, commercial aircraft
API, cloud data provider, OpenSky account, OAuth token, or internet connection.
The required live path is:

```text
RTL-SDR + ADS-B antenna
-> readsb or dump1090
-> local aircraft.json
-> MARIA backend
-> MARIA web radar and M5Stack Core2
```

Before SDR hardware is available, use the deterministic local receiver
simulator or normal simulation fallback:

```bash
LOCAL_ADSB_SIMULATOR=true MARIA_SIMULATION_FALLBACK=true
```

OpenSky is optional, disabled by default, and terms-dependent. MARIA never sends
aircraft or location data to OpenSky or any external aircraft-data provider by
default.

## Optional future extensions

- Streamlit interface: reuse the backend API for a Python dashboard with
  organized pages and interactive controls.
- Terminal export mode: call the backend traffic endpoint and generate Folium
  HTML maps plus CSV exports for offline viewing.
  Telemetry, traffic snapshots, and historical flyby data are already persisted
  by the backend SQLite store.
