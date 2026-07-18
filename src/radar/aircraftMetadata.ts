import { bearingDegrees } from '../radarGeometry';
import type { FlightPrediction } from '../flightIntel';
import { ALERT_ZONE_LABELS, type AlertZone } from './alertZones';
import { altitudeFeet, parseFiniteNumber } from './altitudeFilter';

export type Freshness = 'live' | 'delayed' | 'stale' | 'unknown';
export type VerticalState = 'Climbing' | 'Descending' | 'Level' | 'Unknown';

export const FRESHNESS_THRESHOLDS_MS = {
  live: 15_000,
  delayed: 60_000,
};

export function normalizeString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function formatNumber(value: unknown, digits = 0) {
  const number = parseFiniteNumber(value);
  return number === null ? null : number.toFixed(digits);
}

export function verticalState(value: unknown): VerticalState {
  const rate = parseFiniteNumber(value);
  if (rate === null) return 'Unknown';
  if (rate > 0.5) return 'Climbing';
  if (rate < -0.5) return 'Descending';
  return 'Level';
}

export function freshnessFromTimestamp(
  value: unknown,
  now = Date.now()
): Freshness {
  const timestamp = parseFiniteNumber(value);
  if (timestamp === null || timestamp <= 0) return 'unknown';
  const age = Math.max(0, now - timestamp);
  if (age <= FRESHNESS_THRESHOLDS_MS.live) return 'live';
  if (age <= FRESHNESS_THRESHOLDS_MS.delayed) return 'delayed';
  return 'stale';
}

export function freshnessLabel(freshness: Freshness) {
  if (freshness === 'live') return 'Live';
  if (freshness === 'delayed') return 'Delayed';
  if (freshness === 'stale') return 'Stale';
  return 'Unknown';
}

export function updateAgeSeconds(value: unknown, now = Date.now()) {
  const timestamp = parseFiniteNumber(value);
  return timestamp === null || timestamp <= 0
    ? null
    : Math.max(0, Math.round((now - timestamp) / 1000));
}

function readOptional(aircraft: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = normalizeString(aircraft[key]);
    if (value) return value;
  }
  return null;
}

export function selectedAircraftMetadata(
  aircraft: FlightPrediction & Record<string, unknown>,
  centerLat: number | null,
  centerLon: number | null,
  alertZone: AlertZone,
  now = Date.now()
) {
  const feet = altitudeFeet(aircraft.altitude_m);
  const bearing =
    centerLat === null || centerLon === null
      ? null
      : bearingDegrees(centerLat, centerLon, aircraft.lat, aircraft.lon);

  return {
    title:
      normalizeString(aircraft.callsign) ||
      normalizeString(aircraft.id) ||
      'Unknown aircraft',
    icao:
      readOptional(aircraft, ['icao', 'icao24', 'hex', 'id']) ||
      normalizeString(aircraft.id),
    callsign: normalizeString(aircraft.callsign),
    registration: readOptional(aircraft, ['registration', 'tail_number']),
    type: readOptional(aircraft, ['aircraft_type', 'type', 'model']),
    operator: readOptional(aircraft, ['operator', 'airline']),
    origin: normalizeString(aircraft.origin),
    destination: normalizeString(aircraft.destination),
    squawk: readOptional(aircraft, ['squawk']),
    altitude: feet === null ? null : `${Math.round(feet).toLocaleString()} ft`,
    groundSpeed:
      formatNumber(aircraft.velocity_kmph, 0) === null
        ? null
        : `${formatNumber(aircraft.velocity_kmph, 0)} km/h`,
    verticalSpeed:
      formatNumber(aircraft.vertical_rate_mps, 1) === null
        ? null
        : `${formatNumber(aircraft.vertical_rate_mps, 1)} m/s`,
    verticalState: verticalState(aircraft.vertical_rate_mps),
    heading:
      formatNumber(aircraft.heading_deg, 0) === null
        ? null
        : `${formatNumber(aircraft.heading_deg, 0)} deg`,
    distance:
      formatNumber(aircraft.distance_km, 1) === null
        ? null
        : `${formatNumber(aircraft.distance_km, 1)} km`,
    bearing:
      bearing === null || !Number.isFinite(bearing)
        ? null
        : `${bearing.toFixed(0)} deg`,
    updateAge: updateAgeSeconds(aircraft.updated_at, now),
    freshness: freshnessLabel(freshnessFromTimestamp(aircraft.updated_at, now)),
    alertZone: ALERT_ZONE_LABELS[alertZone],
  };
}
