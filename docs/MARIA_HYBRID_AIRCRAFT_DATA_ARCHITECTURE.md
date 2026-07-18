# MARIA Hybrid Aircraft Data Architecture

MARIA now uses a zero-subscription, server-side aircraft source model. Browser
and Core2 clients request normalized radar snapshots from the backend. By
default, MARIA does not contact external aircraft-data services and does not
send aircraft or location data to a cloud provider.

## Required Local Architecture

```text
RTL-SDR + ADS-B antenna
-> readsb or dump1090
-> local aircraft.json
-> MARIA backend
-> MARIA web radar and M5Stack Core2
```

Development before SDR hardware is available:

```text
Deterministic ADS-B fixture/simulator
-> MARIA backend
-> MARIA web radar and M5Stack Core2
```

## Sources

- `local_adsb` is the primary live source and reads a local readsb/dump1090
  `aircraft.json` endpoint.
- `simulation` is the required deterministic offline fallback.
- `opensky` is optional, disabled by default, and isolated behind
  `OPENSKY_ENABLED=true`.

The backend merges tracks by ICAO where possible. Default priority is
`local_adsb,simulation`. OpenSky participates only when explicitly enabled by an
administrator. Snapshots include source health so the UI can show whether a
source is healthy, degraded, offline, or unconfigured.

In `auto` mode:

1. Use local ADS-B when healthy.
2. Use a recent cached local snapshot during a short interruption.
3. Fall back to deterministic simulation.
4. Never contact OpenSky unless an administrator explicitly enables it.

## Backend Routes

- `GET /api/radar/snapshot?lat=24.7&lon=46.6&rangeKm=100&mode=auto`
- `GET /api/radar/sources`
- `GET /api/radar/aircraft/:icao24`
- `GET /api/devices/core2/radar?lat=24.7&lon=46.6&rangeKm=50`
- `POST /api/radar/config/validate`

`/api/traffic/nearby` remains available for existing clients and now falls
through the hybrid service before using the legacy traffic fallback.

## Client Modes

- `auto`: prefer local ADS-B, then cached local ADS-B, then simulation.
- `hybrid`: merge local ADS-B and simulation; optional OpenSky only when
  `OPENSKY_ENABLED=true`.
- `opensky`: optional OpenSky only, for deployments that explicitly configure
  credentials and accept the current OpenSky terms.
- `local_adsb`: local receiver only.
- `simulation`: deterministic demo traffic only.

## Required Vs Optional

Free and required:

- MARIA source code
- local backend
- readsb/dump1090 integration
- local simulation
- Core2 firmware
- local web interface

Optional and terms-dependent:

- OpenSky
- any future cloud aircraft-data provider
