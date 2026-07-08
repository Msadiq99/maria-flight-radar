import type { AircraftTraffic } from './traffic'

const EARTH_RADIUS_KM = 6371
const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI

export type FlightPrediction = AircraftTraffic & {
  distance_km: number
  closest_distance_km: number
  minutes_to_closest: number
  flyby_probability: number
  approach_direction: string
  projected_path: [number, number][]
  fr24_url: string
  skybrary_url: string
}

function toRad(value: number) {
  return value * DEG_TO_RAD
}

function toDeg(value: number) {
  return value * RAD_TO_DEG
}

export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const dLat = toRad(bLat - aLat)
  const dLon = toRad(bLon - aLon)
  const lat1 = toRad(aLat)
  const lat2 = toRad(bLat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

function bearingToCardinal(bearing: number) {
  const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return labels[Math.round((((bearing % 360) + 360) % 360) / 45) % 8]
}

function bearingDeg(fromLat: number, fromLon: number, toLat: number, toLon: number) {
  const lat1 = toRad(fromLat)
  const lat2 = toRad(toLat)
  const dLon = toRad(toLon - fromLon)
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

function destinationPoint(lat: number, lon: number, heading: number, distance: number): [number, number] {
  const bearing = toRad(heading)
  const angular = distance / EARTH_RADIUS_KM
  const lat1 = toRad(lat)
  const lon1 = toRad(lon)
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  )
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    )
  return [toDeg(lat2), ((toDeg(lon2) + 540) % 360) - 180]
}

export function predictFlight(
  aircraft: AircraftTraffic,
  targetLat: number,
  targetLon: number,
  radiusKm: number,
): FlightPrediction {
  const currentDistance = distanceKm(aircraft.lat, aircraft.lon, targetLat, targetLon)
  const eastKm = (targetLon - aircraft.lon) * 111.32 * Math.cos(toRad((targetLat + aircraft.lat) / 2))
  const northKm = (targetLat - aircraft.lat) * 111.32
  const heading = toRad(aircraft.heading_deg)
  const velocityEast = Math.sin(heading)
  const velocityNorth = Math.cos(heading)
  const alongTrackKm = eastKm * velocityEast + northKm * velocityNorth
  const speedKmMin = Math.max(aircraft.velocity_kmph / 60, 0.1)
  const minutesToClosest = Math.max(0, alongTrackKm / speedKmMin)
  const crossTrackSq = Math.max(0, currentDistance ** 2 - Math.max(0, alongTrackKm) ** 2)
  const closestDistance = alongTrackKm > 0 ? Math.sqrt(crossTrackSq) : currentDistance
  const distanceScore = Math.max(0, 1 - closestDistance / Math.max(radiusKm, 1))
  const timeScore = Math.max(0, 1 - minutesToClosest / 60)
  const probability = Math.round(Math.min(100, distanceScore * 75 + timeScore * 25))
  const approachBearing = bearingDeg(targetLat, targetLon, aircraft.lat, aircraft.lon)
  const pathDistance = Math.max(20, Math.min(120, aircraft.velocity_kmph / 12))

  return {
    ...aircraft,
    distance_km: currentDistance,
    closest_distance_km: closestDistance,
    minutes_to_closest: minutesToClosest,
    flyby_probability: probability,
    approach_direction: bearingToCardinal(approachBearing),
    projected_path: [
      [aircraft.lat, aircraft.lon],
      destinationPoint(aircraft.lat, aircraft.lon, aircraft.heading_deg, pathDistance),
    ],
    fr24_url: `https://www.flightradar24.com/${encodeURIComponent(aircraft.callsign.trim())}`,
    skybrary_url: aircraft.aircraft_type
      ? `https://skybrary.aero/aircraft/${encodeURIComponent(aircraft.aircraft_type)}`
      : 'https://skybrary.aero/aircraft',
  }
}
