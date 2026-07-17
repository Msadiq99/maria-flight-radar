# MARIA Hybrid Aircraft Data Architecture

MARIA now uses a server-side aircraft source model. Browser and Core2 clients
request normalized radar snapshots from the backend instead of calling external
aircraft feeds directly.

## Sources

- `opensky` uses backend-only OAuth2 client credentials.
- `local_adsb` reads a local readsb/dump1090 `aircraft.json` endpoint.
- `simulation` provides deterministic fallback traffic for demos and offline
  validation.

The backend merges tracks by ICAO where possible. Local ADS-B wins over OpenSky,
and OpenSky wins over simulation. Snapshots include source health so the UI can
show whether a source is healthy, degraded, offline, or unconfigured.

## Backend Routes

- `GET /api/radar/snapshot?lat=24.7&lon=46.6&rangeKm=100&mode=auto`
- `GET /api/radar/sources`
- `GET /api/radar/aircraft/:icao24`
- `GET /api/devices/core2/radar?lat=24.7&lon=46.6&rangeKm=50`
- `POST /api/radar/config/validate`

`/api/traffic/nearby` remains available for existing clients and now falls
through the hybrid service before using the legacy traffic fallback.

## Client Modes

- `auto`: prefer live local/OpenSky data and use simulation only when needed.
- `hybrid`: merge all enabled live sources.
- `opensky`: OpenSky only.
- `local_adsb`: local receiver only.
- `simulation`: deterministic demo traffic only.
