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
LOCAL_ADSB_BASE_URL=http://localhost:8080
LOCAL_ADSB_AIRCRAFT_PATH=/data/aircraft.json
MARIA_SOURCE_PRIORITY=local_adsb,simulation
MARIA_SIMULATION_FALLBACK=true
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
