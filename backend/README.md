# MARIA Flight Radar backend

Minimal Express server implementing the telemetry ingestion contract that
[firmware/README.md](../firmware/README.md) documents.

## Setup

```
cd backend
npm install
API_KEY=replace-with-a-random-secret PORT=8080 npm start
```

Environment variables:

- `PORT` — default `8080`
- `API_KEY` — must match `API_KEY` in the firmware's `config.h`. Development
  defaults to `change-me`; production refuses to start without an explicit key.
- `NODE_ENV` — use `production` for deployed instances
- `CORS_ORIGINS` — comma-separated allowed browser origins. Local development
  allows all origins when this is omitted; production allows none.
- `DB_PATH` — SQLite file path; defaults to `backend/data/maria.sqlite`
- `RETENTION_DAYS` — age-based telemetry and traffic retention; defaults to 30
- `TELEMETRY_HMAC_SECRET` — when set, every telemetry POST must include a
  matching SHA-256 HMAC in `X-Telemetry-Signature`
- `MARIA_SOURCE_MODE` — `auto` by default; also supports `hybrid`, `opensky`,
  `local_adsb`, and `simulation`
- `MARIA_RADAR_LATITUDE` / `MARIA_RADAR_LONGITUDE` — optional default radar
  center for clients that omit a location
- `MARIA_DEFAULT_RANGE_KM` / `MARIA_MAX_RANGE_KM` — default and maximum radar
  query ranges
- `OPENSKY_ENABLED` — set `true` to enable server-side OpenSky integration
- `OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET` — OpenSky OAuth2 client
  credentials; never expose these to the web app or firmware
- `OPENSKY_TOKEN_URL` / `OPENSKY_BASE_URL` — optional OpenSky endpoint overrides
- `LOCAL_ADSB_ENABLED` — set `true` to enable a local readsb/dump1090 receiver
- `LOCAL_ADSB_AIRCRAFT_URL` — URL for receiver `aircraft.json`

## Endpoints

- `POST /api/telemetry` — ingests a telemetry packet. Requires header
  `X-API-Key`. Returns `401` on a bad key, `400` on a malformed body, `200`
  on success. The response acknowledges the packet sequence number.
- `GET /api/telemetry/latest?device_id=MARIA-001` — most recent packet for a
  device. `404` if none received yet.
- `GET /api/telemetry/history?device_id=MARIA-001&limit=50` — last N packets
  (default 50, capped at 500).
- `GET /api/telemetry/playback?device_id=MARIA-001&from=0&to=...` — timestamped
  historical track playback, capped at 5,000 records.
- `GET /api/telemetry/stream?device_id=MARIA-001` — live server-sent telemetry
  events with heartbeat frames.
- `GET /api/devices` — discovered trackers ordered by most recent activity.
- `GET /api/airports` — bundled airport and runway overlay metadata.
- `GET /api/radar/snapshot?lat=24.7136&lon=46.6753&rangeKm=50&mode=auto` —
  normalized hybrid radar snapshot with aircraft, source health, and merge
  metadata.
- `GET /api/radar/sources` — current aircraft-source status.
- `GET /api/radar/aircraft/:icao24` — latest normalized detail for one aircraft.
- `GET /api/devices/core2/radar?lat=24.7136&lon=46.6753&rangeKm=50` — compact
  radar payload for the M5Stack Core2 firmware.
- `POST /api/radar/config/validate` — validates source mode and receiver URL
  shape without storing credentials.
- `GET /api/traffic/nearby?lat=24.7136&lon=46.6753&radius_km=50` — legacy
  nearby aircraft shape, preserved for existing clients and backed by the
  hybrid radar service.
- `GET /health` — readiness check including SQLite status and storage counts.
- `GET /metrics` — process, request, traffic, and storage counters.

Telemetry and traffic snapshots are stored in SQLite using WAL mode. The schema
is migrated automatically and expired rows are pruned hourly. Radar snapshots
are cached briefly by source mode, area, and range; concurrent matching requests
share one upstream refresh. OpenSky OAuth2 tokens are cached in backend memory
and refreshed server-side. API routes also have lightweight per-IP rate limits.
Request logs are emitted as JSON and responses include an `X-Request-ID`.
Device sequence numbers are uniquely indexed, making firmware retries
idempotent when an acknowledgement is lost in transit.

## Validation

```bash
npm test
```

## Known gaps

- No auth beyond a single shared API key on writes — fine for one prototype
  device, not for a multi-device fleet.
- Telemetry transport remains HTTP unless TLS is provided by the deployment
  environment or a reverse proxy.
