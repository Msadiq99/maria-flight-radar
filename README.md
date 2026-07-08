# MARIA Flight Radar

MARIA Flight Radar is a live GPS/IMU tracker dashboard with nearby-aircraft
awareness. It includes ESP32 firmware, a local Express telemetry backend, and a
React/Leaflet web dashboard.

## Current features

- Live tracker telemetry from the M5StickC PLUS2 firmware
- Simulated GPS mode for testing before the physical GPS module is installed
- Interactive Leaflet map with tracker trail and aircraft overlay
- Nearby aircraft feed with mock traffic by default and OpenSky-ready backend
- Flyby prediction based on heading, speed, distance, and monitoring radius
- Closest-approach ETA, closest distance, and approach direction
- Detailed flight table with callsign, tail number, aircraft type, airline,
  route, altitude, speed, heading, distance, and flyby probability
- Sortable aircraft list
- Flyby schedule focused on likely nearby passes
- Custom monitoring latitude, longitude, and radius
- External links to Flightradar24 and Skybrary
- Auto-refreshing telemetry and traffic data

## Local development

Backend:

```bash
cd backend
PORT=8081 API_KEY=change-me TRAFFIC_SOURCE=mock npm start
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

## Traffic sources

Use mock traffic for offline/local testing:

```bash
TRAFFIC_SOURCE=mock
```

Use OpenSky when credentials/network are available:

```bash
TRAFFIC_SOURCE=opensky
OPENSKY_USERNAME=...
OPENSKY_PASSWORD=...
```

The frontend reads the same normalized traffic shape either way.

## Planned extension modes

- Streamlit interface: reuse the backend API for a Python dashboard with
  organized pages and interactive controls.
- Terminal export mode: call the backend traffic endpoint and generate Folium
  HTML maps plus CSV exports for offline viewing.
- SQLite persistence: replace or supplement the in-memory backend `Map` with a
  SQLite store for telemetry, traffic snapshots, and historical flyby analysis.
