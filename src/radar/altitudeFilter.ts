export type AltitudeFilter =
  | 'all'
  | 'groundUnknown'
  | 'below10000'
  | 'between10000And30000'
  | 'above30000';

export type AltitudeAircraft = {
  id: string;
  altitude_m?: unknown;
  distance_km?: unknown;
};

export const ALTITUDE_FILTER_LABELS: Record<AltitudeFilter, string> = {
  all: 'All',
  groundUnknown: 'Ground / unknown',
  below10000: 'Below 10,000 ft',
  between10000And30000: '10,000-30,000 ft',
  above30000: 'Above 30,000 ft',
};

const METERS_TO_FEET = 3.280839895;

export function parseFiniteNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : null;
  }
  return null;
}

export function altitudeFeet(value: unknown) {
  const meters = parseFiniteNumber(value);
  return meters === null ? null : meters * METERS_TO_FEET;
}

export function matchesAltitudeFilter(
  aircraft: AltitudeAircraft,
  filter: AltitudeFilter
) {
  if (filter === 'all') return true;
  const feet = altitudeFeet(aircraft.altitude_m);
  if (filter === 'groundUnknown') return feet === null || feet <= 0;
  if (feet === null || feet <= 0) return false;
  if (filter === 'below10000') return feet < 10_000;
  if (filter === 'between10000And30000') {
    return feet >= 10_000 && feet <= 30_000;
  }
  return feet > 30_000;
}

export function filterAircraftByAltitude<T extends AltitudeAircraft>(
  aircraft: T[],
  filter: AltitudeFilter
) {
  return aircraft.filter((item) => matchesAltitudeFilter(item, filter));
}

export function nearestVisibleAircraft<T extends AltitudeAircraft>(
  aircraft: T[]
): T | null {
  return (
    [...aircraft].sort((a, b) => {
      const aDistance = parseFiniteNumber(a.distance_km) ?? Number.POSITIVE_INFINITY;
      const bDistance = parseFiniteNumber(b.distance_km) ?? Number.POSITIVE_INFINITY;
      return aDistance - bDistance;
    })[0] || null
  );
}

export function isAltitudeFilter(value: unknown): value is AltitudeFilter {
  return (
    value === 'all' ||
    value === 'groundUnknown' ||
    value === 'below10000' ||
    value === 'between10000And30000' ||
    value === 'above30000'
  );
}
