import { useEffect } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import marker2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'
import type { FlightPrediction } from './flightIntel'

// Vite bundles Leaflet's default marker images under hashed URLs, which
// breaks Leaflet's built-in path guessing. Point it at the bundled assets.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

function aircraftIcon(heading: number, lowAltitude: boolean) {
  return L.divIcon({
    className: `aircraft-marker ${lowAltitude ? 'aircraft-marker-low' : 'aircraft-marker-high'}`,
    html: `<span style="transform: rotate(${heading}deg)">▲</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function Recenter({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lon])
  }, [lat, lon, map])
  return null
}

export function DeviceMap({
  lat,
  lon,
  deviceId,
  trail,
  aircraft,
}: {
  lat: number
  lon: number
  deviceId: string
  trail: [number, number][]
  aircraft: FlightPrediction[]
}) {
  return (
    <MapContainer
      center={[lat, lon]}
      zoom={14}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {trail.length > 1 && <Polyline positions={trail} pathOptions={{ color: '#2563eb', weight: 4 }} />}
      <Marker position={[lat, lon]}>
        <Popup>{deviceId}</Popup>
      </Marker>
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
      {aircraft.map((item) => (
        <Marker
          key={item.id}
          position={[item.lat, item.lon]}
          icon={aircraftIcon(item.heading_deg, item.altitude_m < 3000)}
        >
          <Popup>
            <strong>{item.callsign}</strong>
            <br />
            {item.aircraft_type || 'Unknown type'} · {item.airline || 'Unknown airline'}
            <br />
            {item.altitude_m.toLocaleString()} m · {item.velocity_kmph.toFixed(0)} km/h
            <br />
            Flyby {item.flyby_probability}% · CPA {item.closest_distance_km.toFixed(1)} km
          </Popup>
        </Marker>
      ))}
      <Recenter lat={lat} lon={lon} />
    </MapContainer>
  )
}
