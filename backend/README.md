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
- `TRAFFIC_SOURCE` — `mock` by default; set to `opensky` to fetch nearby
  aircraft from OpenSky and fall back to mock traffic if OpenSky is unavailable
- `OPENSKY_USERNAME` / `OPENSKY_PASSWORD` — optional OpenSky credentials for
  higher API limits when `TRAFFIC_SOURCE=opensky`

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
- `GET /api/traffic/nearby?lat=24.7136&lon=46.6753&radius_km=50` — nearby
  aircraft in MARIA's normalized traffic shape. Uses mock aircraft by default;
  can use OpenSky via `TRAFFIC_SOURCE=opensky`.
- `GET /health` — readiness check including SQLite status and storage counts.
- `GET /metrics` — process, request, traffic, and storage counters.

Telemetry and traffic snapshots are stored in SQLite using WAL mode. The schema
is migrated automatically and expired rows are pruned hourly. OpenSky responses
are cached briefly by area and upstream calls time out after eight seconds. API
routes also have lightweight per-IP rate limits. Request logs are emitted as
JSON and responses include an `X-Request-ID`.
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
