import { useEffect } from 'react';
import {
  Circle,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import marker2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';
import type { FlightPrediction } from './flightIntel';
import type { SavedLocation } from './radarSettings';

// Vite bundles Leaflet's default marker images under hashed URLs, which
// breaks Leaflet's built-in path guessing. Point it at the bundled assets.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function aircraftIcon(heading: number, lowAltitude: boolean) {
  return L.divIcon({
    className: `aircraft-marker ${lowAltitude ? 'aircraft-marker-low' : 'aircraft-marker-high'}`,
    html: `<span style="transform: rotate(${heading}deg)">▲</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function Recenter({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lon]);
  }, [lat, lon, map]);
  return null;
}

export function DeviceMap({
  centerLat,
  centerLon,
  deviceLat,
  deviceLon,
  deviceId,
  trail,
  aircraft,
  aircraftTrails,
  radiusKm,
  airports,
  geofences,
}: {
  centerLat: number;
  centerLon: number;
  deviceLat: number | null;
  deviceLon: number | null;
  deviceId: string;
  trail: [number, number][];
  aircraft: FlightPrediction[];
  aircraftTrails: Record<string, [number, number][]>;
  radiusKm: number;
  airports: {
    code: string;
    name: string;
    lat: number;
    lon: number;
    runways: string[];
  }[];
  geofences: SavedLocation[];
}) {
  return (
    <MapContainer
      center={[centerLat, centerLon]}
      zoom={14}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Circle
        center={[centerLat, centerLon]}
        radius={radiusKm * 1000}
        pathOptions={{ color: '#38bdf8', weight: 2, fillOpacity: 0.04 }}
      />
      {geofences.map((location) => (
        <Circle
          key={location.id}
          center={[location.lat, location.lon]}
          radius={location.radiusKm * 1000}
          pathOptions={{ color: '#a855f7', weight: 1, fillOpacity: 0.02 }}
        />
      ))}
      {trail.length > 1 && (
        <Polyline
          positions={trail}
          pathOptions={{ color: '#2563eb', weight: 4 }}
        />
      )}
      {deviceLat !== null && deviceLon !== null && (
        <Marker position={[deviceLat, deviceLon]}>
          <Popup>{deviceId}</Popup>
        </Marker>
      )}
      {aircraft.map((item) => (
        <Polyline
          key={`${item.id}-projection`}
          positions={item.projected_path}
          pathOptions={{
            color: '#f97316',
            opacity: Math.max(0.18, item.flyby_probability / 100),
            weight: 3,
            dashArray: '4 8',
          }}
        />
      ))}
      {Object.entries(aircraftTrails).map(
        ([id, positions]) =>
          positions.length > 1 && (
            <Polyline
              key={`${id}-trail`}
              positions={positions}
              pathOptions={{ color: '#f59e0b', weight: 2, opacity: 0.45 }}
            />
          )
      )}
      {aircraft.map((item) => (
        <Marker
          key={item.id}
          position={[item.lat, item.lon]}
          icon={aircraftIcon(item.heading_deg, item.altitude_m < 3000)}
        >
          <Popup>
            <strong>{item.callsign}</strong>
            <br />
            {item.aircraft_type || 'Unknown type'} ·{' '}
            {item.airline || 'Unknown airline'}
            <br />
            {item.altitude_m.toLocaleString()} m ·{' '}
            {item.velocity_kmph.toFixed(0)} km/h
            <br />
            Flyby {item.flyby_probability}% · CPA{' '}
            {item.closest_distance_km.toFixed(1)} km
          </Popup>
        </Marker>
      ))}
      {airports.map((airport) => (
        <Marker key={airport.code} position={[airport.lat, airport.lon]}>
          <Popup>
            <strong>{airport.code}</strong> · {airport.name}
            <br />
            Runways: {airport.runways.join(', ')}
          </Popup>
        </Marker>
      ))}
      <Recenter lat={centerLat} lon={centerLon} />
    </MapContainer>
  );
}
