# MARIA Local ADS-B Receiver

MARIA can read a local receiver that exposes readsb or dump1090-compatible
`aircraft.json`.

Example backend configuration:

```env
LOCAL_ADSB_ENABLED=true
LOCAL_ADSB_AIRCRAFT_URL=http://127.0.0.1/tar1090/data/aircraft.json
```

Supported fields include ICAO, callsign, latitude, longitude, barometric or
geometric altitude, ground speed, track, vertical rate, squawk, category, and
message age. The backend normalizes units to meters, meters per second,
degrees, and kilometers.

Keep receiver URLs and exact station coordinates out of committed files when
they identify a private installation.
