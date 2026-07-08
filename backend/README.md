# MARIA Flight Radar backend

Minimal Express server implementing the telemetry ingestion contract that
[firmware/README.md](../firmware/README.md) documents.

## Setup

```
cd backend
npm install
API_KEY=change-me PORT=8080 npm start
```

Env vars (both optional):
- `PORT` — default `8080`
- `API_KEY` — must match `API_KEY` in the firmware's `config.h`; default `change-me`
- `TRAFFIC_SOURCE` — `mock` by default; set to `opensky` to fetch nearby
  aircraft from OpenSky and fall back to mock traffic if OpenSky is unavailable
- `OPENSKY_USERNAME` / `OPENSKY_PASSWORD` — optional OpenSky credentials for
  higher API limits when `TRAFFIC_SOURCE=opensky`

## Endpoints

- `POST /api/telemetry` — ingests a telemetry packet. Requires header
  `X-API-Key`. Returns `401` on a bad key, `400` on a malformed body, `200`
  on success.
- `GET /api/telemetry/latest?device_id=MARIA-001` — most recent packet for a
  device. `404` if none received yet.
- `GET /api/telemetry/history?device_id=MARIA-001&limit=50` — last N packets
  (default 50, capped at 500).
- `GET /api/traffic/nearby?lat=24.7136&lon=46.6753&radius_km=50` — nearby
  aircraft in MARIA's normalized traffic shape. Uses mock aircraft by default;
  can use OpenSky via `TRAFFIC_SOURCE=opensky`.
- `GET /health` — liveness check.

## Known gaps

- Storage is in-memory only (a `Map`, capped at 500 records per device) —
  everything is lost on restart. Swap in a real datastore before relying on
  this for anything durable.
- No auth beyond a single shared API key on writes — fine for one prototype
  device, not for a multi-device fleet.
- CORS is wide open (any origin can read `GET` telemetry) to keep local
  dashboard development simple. Restrict this before deploying anywhere
  public.
