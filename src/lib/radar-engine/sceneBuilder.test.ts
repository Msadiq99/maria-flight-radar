import { describe, expect, it } from 'vitest';
import { buildRadarScene, type SceneBuilderAircraft } from './sceneBuilder';
import { DEFAULT_ALERT_ZONES } from '../../radar/alertZones';

const CENTER = { lat: 24.7, lon: 46.7 };
const TIMESTAMP = 1_700_000_000_000;

function aircraft(
  overrides: Partial<SceneBuilderAircraft> = {}
): SceneBuilderAircraft {
  return {
    id: 'AC1',
    callsign: 'MRA123',
    lat: 24.71,
    lon: 46.71,
    altitude_m: 3000,
    velocity_kmph: 400,
    heading_deg: 90,
    vertical_rate_mps: 0,
    distance_km: 2,
    updated_at: TIMESTAMP,
    ...overrides,
  };
}

const baseInput = {
  center: CENTER,
  rangeKm: 50 as const,
  altitudeFilter: 'all' as const,
  alertZones: DEFAULT_ALERT_ZONES,
  selectedTargetId: null,
  sourceState: 'DEMO' as const,
  timestamp: TIMESTAMP,
};

describe('buildRadarScene', () => {
  it('is deterministic for identical input', () => {
    const input = { ...baseInput, aircraft: [aircraft()] };
    expect(buildRadarScene(input)).toEqual(buildRadarScene(input));
  });

  it('never mutates the source aircraft array or its items', () => {
    const source = [aircraft()];
    const snapshot = JSON.parse(JSON.stringify(source));
    buildRadarScene({ ...baseInput, aircraft: source });
    expect(source).toEqual(snapshot);
  });

  it('excludes aircraft beyond the active range', () => {
    const scene = buildRadarScene({
      ...baseInput,
      aircraft: [aircraft({ id: 'far', distance_km: 999 })],
    });
    expect(scene.targets).toHaveLength(0);
    expect(scene.statistics.totalCount).toBe(1);
    expect(scene.statistics.visibleCount).toBe(0);
  });

  it('classifies alert state from distance using the existing alert-zone thresholds', () => {
    const scene = buildRadarScene({
      ...baseInput,
      aircraft: [aircraft({ id: 'critical', distance_km: 1 })],
    });
    expect(scene.targets[0].alertState).toBe('critical');
  });

  it('marks the selected target and gives it top priority', () => {
    const scene = buildRadarScene({
      ...baseInput,
      selectedTargetId: 'AC1',
      aircraft: [
        aircraft({ id: 'AC1', distance_km: 40 }),
        aircraft({ id: 'AC2', distance_km: 1 }),
      ],
    });
    expect(scene.targets[0].id).toBe('AC1');
    expect(scene.targets[0].selected).toBe(true);
    expect(scene.targets[0].priority).toBe('selected');
  });

  it('propagates the caller-provided source state onto every target', () => {
    const scene = buildRadarScene({
      ...baseInput,
      sourceState: 'DEMO',
      aircraft: [aircraft()],
    });
    expect(scene.sourceState).toBe('DEMO');
    expect(scene.targets.every((t) => t.sourceState === 'DEMO')).toBe(true);
  });

  it('never labels a DEMO scene as LIVE', () => {
    const scene = buildRadarScene({
      ...baseInput,
      sourceState: 'DEMO',
      aircraft: [aircraft()],
    });
    expect(scene.sourceState).not.toBe('LIVE');
  });

  it('returns an empty scene without a center, without throwing', () => {
    const scene = buildRadarScene({
      ...baseInput,
      center: null,
      aircraft: [aircraft()],
    });
    expect(scene.targets[0].visible).toBe(false);
    expect(scene.center).toBeNull();
  });

  it('uses the explicit timestamp for freshness, not the wall clock', () => {
    const scene = buildRadarScene({
      ...baseInput,
      timestamp: TIMESTAMP,
      aircraft: [aircraft({ updated_at: TIMESTAMP - 5_000 })],
    });
    expect(scene.targets[0].freshness).toBe('live');
  });
});
