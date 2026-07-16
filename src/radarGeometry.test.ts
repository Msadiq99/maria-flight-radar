import { describe, expect, it } from 'vitest';
import {
  bearingDegrees,
  distanceKm,
  projectTarget,
  rangeRingValues,
} from './radarGeometry';

describe('radar geometry', () => {
  it('projects cardinal directions with north at the top', () => {
    expect(projectTarget(0, 50, 100, 100)).toMatchObject({
      x: 0,
      y: -50,
      visible: true,
    });
    expect(projectTarget(90, 50, 100, 100)).toMatchObject({
      x: 50,
      y: 0,
      visible: true,
    });
    expect(projectTarget(180, 50, 100, 100).y).toBe(50);
    expect(projectTarget(270, 50, 100, 100).x).toBe(-50);
  });
  it('handles zero distance and range boundaries', () => {
    expect(projectTarget(12, 0, 50, 100)).toMatchObject({
      x: 0,
      y: 0,
      visible: true,
    });
    expect(projectTarget(0, 50, 50, 100).visible).toBe(true);
    expect(projectTarget(0, 50.01, 50, 100).visible).toBe(false);
  });
  it('normalizes bearings and computes distances', () => {
    expect(bearingDegrees(0, 0, 0, -1)).toBeCloseTo(270);
    expect(distanceKm(0, 0, 0, 1)).toBeCloseTo(111.19, 1);
  });
  it('returns four useful ring values', () => {
    expect(rangeRingValues(25)).toEqual([6.25, 12.5, 18.75, 25]);
    expect(rangeRingValues(200)).toEqual([50, 100, 150, 200]);
  });
  it('rejects non-finite inputs', () => {
    expect(() => distanceKm(Number.NaN, 0, 0, 0)).toThrow();
  });
});
