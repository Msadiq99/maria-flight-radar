# MARIA Local ADS-B Receiver

MARIA's required live aircraft source is a local receiver that exposes readsb or
dump1090-compatible `aircraft.json`. No paid service, cloud aircraft-data
provider, OpenSky account, OAuth token, or internet connection is required.

```text
RTL-SDR + ADS-B antenna
-> readsb or dump1090
-> local aircraft.json
-> MARIA backend
-> MARIA web radar and M5Stack Core2
```

Example backend configuration:

```env
LOCAL_ADSB_ENABLED=true
LOCAL_ADSB_BASE_URL=http://127.0.0.1:8080
LOCAL_ADSB_AIRCRAFT_PATH=/data/aircraft.json
LOCAL_ADSB_TIMEOUT_MS=2000
LOCAL_ADSB_POLL_INTERVAL_MS=1000
LOCAL_ADSB_STALE_AFTER_MS=10000
LOCAL_ADSB_RECEIVER_LAT=
LOCAL_ADSB_RECEIVER_LON=
LOCAL_ADSB_MAX_RANGE_NM=250
MARIA_SOURCE_PRIORITY=local_adsb,simulation
MARIA_SIMULATION_FALLBACK=true
CORE2_MAX_TARGETS=12
```

Before SDR hardware is available, enable deterministic local ADS-B-shaped
development data:

```env
LOCAL_ADSB_SIMULATOR=true
```

Supported fields include ICAO, callsign, latitude, longitude, barometric or
geometric altitude, ground speed, track, vertical rate, squawk, category, and
message age. The backend normalizes units to meters, meters per second,
degrees, and kilometers.

Keep receiver URLs and exact station coordinates out of committed files when
they identify a private installation.

## Verify the receiver

MARIA supports common readsb and dump1090 JSON endpoints:

```bash
curl http://127.0.0.1:8080/data/aircraft.json
npm run adsb:check
curl http://127.0.0.1:8081/api/radar/source-status
```

The diagnostic checks only configured localhost endpoints. Without a receiver,
it reports the receiver as unavailable and MARIA uses deterministic simulation
fallback. When valid fresh aircraft are received, Auto mode uses local ADS-B
only and does not merge simulated targets.

The receiver is receive-only. Do not transmit radio signals.
