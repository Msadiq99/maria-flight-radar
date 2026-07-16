import { describe, expect, it } from 'vitest';
import {
  freshnessFromTimestamp,
  selectedAircraftMetadata,
  verticalState,
} from './aircraftMetadata';
import type { FlightPrediction } from '../flightIntel';

const baseAircraft = {
  id: 'abc123',
  callsign: ' MARIA1 ',
  tail_number: '',
  aircraft_type: 'C172',
  airline: 'Test Air',
  origin: '',
  destination: 'OMDB',
  lat: 25,
  lon: 55,
  altitude_m: '3048',
  velocity_kmph: '240',
  heading_deg: '90',
  vertical_rate_mps: 1,
  source: 'mock',
  updated_at: 1_000,
  distance_km: 12,
  closest_distance_km: 10,
  closest_3d_distance_km: 10,
  altitude_separation_m: 0,
  minutes_to_closest: 3,
  flyby_probability: 50,
  prediction_confidence: 90,
  approach_direction: 'E',
  projected_path: [],
  fr24_url: '',
  skybrary_url: '',
} as unknown as FlightPrediction & Record<string, unknown>;

describe('aircraft metadata', () => {
  it('normalizes display values and numeric strings', () => {
    const metadata = selectedAircraftMetadata(
      baseAircraft,
      25,
      54.9,
      'warning',
      11_000
    );
    expect(metadata.title).toBe('MARIA1');
    expect(metadata.altitude).toBe('10,000 ft');
    expect(metadata.groundSpeed).toBe('240 km/h');
    expect(metadata.alertZone).toBe('Warning');
    expect(metadata.updateAge).toBe(10);
  });

  it('handles missing fields without broken placeholders', () => {
    const metadata = selectedAircraftMetadata(
      {
        ...baseAircraft,
        callsign: '',
        altitude_m: 'bad',
        updated_at: 'bad',
      } as unknown as FlightPrediction & Record<string, unknown>,
      null,
      null,
      'normal'
    );
    expect(metadata.title).toBe('abc123');
    expect(metadata.altitude).toBeNull();
    expect(metadata.freshness).toBe('Unknown');
  });

  it('calculates vertical state', () => {
    expect(verticalState(1)).toBe('Climbing');
    expect(verticalState(-1)).toBe('Descending');
    expect(verticalState(0.2)).toBe('Level');
    expect(verticalState('bad')).toBe('Unknown');
  });

  it('calculates freshness from timestamps', () => {
    expect(freshnessFromTimestamp(90_000, 100_000)).toBe('live');
    expect(freshnessFromTimestamp(50_000, 100_000)).toBe('delayed');
    expect(freshnessFromTimestamp(1, 100_000)).toBe('stale');
    expect(freshnessFromTimestamp('bad', 100_000)).toBe('unknown');
  });
});
