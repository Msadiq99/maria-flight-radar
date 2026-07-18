export type RadarRange = 25 | 50 | 100 | 200;

const EARTH_RADIUS_KM = 6371;

function finite(value: number, name: string) {
  if (!Number.isFinite(value)) throw new Error(`${name} must be finite`);
}

export function bearingDegrees(
  centerLat: number,
  centerLon: number,
  targetLat: number,
  targetLon: number
) {
  [centerLat, centerLon, targetLat, targetLon].forEach((value, index) =>
    finite(value, ['centerLat', 'centerLon', 'targetLat', 'targetLon'][index])
  );
  const lat1 = (centerLat * Math.PI) / 180;
  const lat2 = (targetLat * Math.PI) / 180;
  const deltaLon = ((targetLon - centerLon) * Math.PI) / 180;
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function distanceKm(
  centerLat: number,
  centerLon: number,
  targetLat: number,
  targetLon: number
) {
  [centerLat, centerLon, targetLat, targetLon].forEach((value, index) =>
    finite(value, ['centerLat', 'centerLon', 'targetLat', 'targetLon'][index])
  );
  const dLat = ((targetLat - centerLat) * Math.PI) / 180;
  const dLon = ((targetLon - centerLon) * Math.PI) / 180;
  const lat1 = (centerLat * Math.PI) / 180;
  const lat2 = (targetLat * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function projectTarget(
  bearing: number,
  distance: number,
  range: RadarRange,
  radius: number
) {
  [bearing, distance, radius].forEach((value, index) =>
    finite(value, ['bearing', 'distance', 'radius'][index])
  );
  finite(range, 'range');
  const visible = distance <= range;
  const clampedDistance = Math.min(distance, range);
  const angle = (bearing * Math.PI) / 180;
  const x = Math.sin(angle) * (clampedDistance / range) * radius;
  const y = -Math.cos(angle) * (clampedDistance / range) * radius;
  return {
    x: Math.abs(x) < 1e-10 ? 0 : x,
    y: Math.abs(y) < 1e-10 ? 0 : y,
    visible,
  };
}

export function rangeRingValues(range: RadarRange) {
  return [range / 4, range / 2, (range * 3) / 4, range];
}
