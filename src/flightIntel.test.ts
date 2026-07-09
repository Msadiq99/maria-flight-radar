import { describe, expect, it } from 'vitest';

import { distanceKm, predictFlight } from './flightIntel';
import type { AircraftTraffic } from './traffic';

const aircraft: AircraftTraffic = {
  id: 'test',
  callsign: 'TEST1',
  tail_number: '',
  aircraft_type: '',
  airline: '',
  origin: '',
  destination: '',
  lat: 0,
  lon: 0,
  altitude_m: 1000,
  velocity_kmph: 600,
  heading_deg: 90,
  vertical_rate_mps: 0,
  source: 'mock',
  updated_at: 0,
};

describe('flight intelligence', () => {
  it('computes zero distance for identical coordinates', () => {
    expect(distanceKm(24.7, 46.6, 24.7, 46.6)).toBe(0);
  });

  it('predicts a near-zero closest approach for a direct track', () => {
    const prediction = predictFlight(
      { ...aircraft, updated_at: Date.now() },
      0,
      1,
      150,
      1000
    );
    expect(prediction.closest_distance_km).toBeLessThan(0.01);
    expect(prediction.minutes_to_closest).toBeGreaterThan(10);
  });

  it('accounts for altitude and vertical motion in 3D closest approach', () => {
    const prediction = predictFlight(
      {
        ...aircraft,
        updated_at: Date.now(),
        altitude_m: 4000,
        vertical_rate_mps: -4,
      },
      0,
      1,
      150,
      1000
    );
    expect(prediction.closest_3d_distance_km).toBeGreaterThanOrEqual(
      prediction.closest_distance_km
    );
    expect(prediction.altitude_separation_m).toBeLessThan(3000);
    expect(prediction.prediction_confidence).toBeGreaterThan(90);
  });

  it('reduces confidence for stale traffic', () => {
    const prediction = predictFlight(
      { ...aircraft, updated_at: Date.now() - 120_000 },
      0,
      1,
      150
    );
    expect(prediction.prediction_confidence).toBeLessThan(40);
  });

  it('does not project a departing aircraft into the future', () => {
    const prediction = predictFlight(
      { ...aircraft, heading_deg: 270 },
      0,
      1,
      150
    );
    expect(prediction.minutes_to_closest).toBe(0);
    expect(prediction.closest_distance_km).toBeCloseTo(prediction.distance_km);
  });
});
