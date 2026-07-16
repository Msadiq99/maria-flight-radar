import { useMemo } from 'react';
import { DeviceMap } from './DeviceMap';
import { DEVICE_ID } from './config';
import { useAirports } from './devices';
import { predictFlight } from './flightIntel';
import { usePersistentState, type SavedLocation } from './radarSettings';
import { useTelemetry } from './telemetry';
import { useNearbyTraffic } from './traffic';

export function MapScreen() {
  const { record } = useTelemetry(DEVICE_ID);
  const airports = useAirports();
  const [savedLocations] = usePersistentState<SavedLocation[]>(
    'maria.saved-locations',
    []
  );
  const lat = record?.gps.fix ? record.gps.lat : null;
  const lon = record?.gps.fix ? record.gps.lon : null;
  const traffic = useNearbyTraffic(lat, lon, 50);
  const aircraft = useMemo(
    () =>
      lat === null || lon === null
        ? []
        : traffic.aircraft.map((item) =>
            predictFlight(item, lat, lon, 50, record?.gps.alt_m || 0)
          ),
    [lat, lon, record?.gps.alt_m, traffic.aircraft]
  );
  return (
    <main className="focused-map-screen">
      <header className="focused-map-header">
        <div>
          <strong>MARIA AIRSPACE MAP</strong>
          <span>Focused operational view</span>
        </div>
        <nav>
          <a href="/radar">Radar</a>
          <a href="/dashboard">Dashboard</a>
        </nav>
      </header>
      {lat !== null && lon !== null ? (
        <DeviceMap
          centerLat={lat}
          centerLon={lon}
          deviceLat={lat}
          deviceLon={lon}
          deviceId={DEVICE_ID}
          trail={[]}
          aircraft={aircraft}
          aircraftTrails={traffic.trails}
          radiusKm={50}
          airports={airports}
          geofences={savedLocations}
        />
      ) : (
        <div className="map-placeholder">
          <p>Waiting for tracker GPS fix</p>
          <span>
            The map will appear when the selected tracker reports a valid
            position.
          </span>
        </div>
      )}
    </main>
  );
}
