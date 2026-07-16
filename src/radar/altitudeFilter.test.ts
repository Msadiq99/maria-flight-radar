import { describe, expect, it } from 'vitest';
import {
  filterAircraftByAltitude,
  nearestVisibleAircraft,
  altitudeFeet,
} from './altitudeFilter';

const aircraft = [
  { id: 'unknown', altitude_m: null, distance_km: 9 },
  { id: 'ground', altitude_m: 0, distance_km: 8 },
  { id: 'low', altitude_m: '1500', distance_km: 7 },
  { id: 'mid', altitude_m: 6000, distance_km: 6 },
  { id: 'high', altitude_m: 11_000, distance_km: 5 },
  { id: 'bad', altitude_m: 'nope', distance_km: 4 },
];

describe('altitude filtering', () => {
  it('converts numeric strings safely', () => {
    expect(altitudeFeet('1000')).toBeCloseTo(3280.84);
  });

  it('matches every filter category', () => {
    expect(filterAircraftByAltitude(aircraft, 'all')).toHaveLength(6);
    expect(filterAircraftByAltitude(aircraft, 'groundUnknown').map((item) => item.id)).toEqual([
      'unknown',
      'ground',
      'bad',
    ]);
    expect(filterAircraftByAltitude(aircraft, 'below10000').map((item) => item.id)).toEqual([
      'low',
    ]);
    expect(filterAircraftByAltitude(aircraft, 'between10000And30000').map((item) => item.id)).toEqual([
      'mid',
    ]);
    expect(filterAircraftByAltitude(aircraft, 'above30000').map((item) => item.id)).toEqual([
      'high',
    ]);
  });

  it('selects the nearest visible target when filtering hides the current one', () => {
    const visible = filterAircraftByAltitude(aircraft, 'between10000And30000');
    expect(nearestVisibleAircraft(visible)?.id).toBe('mid');
  });

  it('supports visible counts without mutating the input', () => {
    const before = [...aircraft];
    const visible = filterAircraftByAltitude(aircraft, 'below10000');
    expect(visible).toHaveLength(1);
    expect(aircraft).toEqual(before);
  });
});
