import { describe, expect, it } from 'vitest';
import { applyRenderProfile } from './applyRenderProfile';
import { buildRadarScene } from './sceneBuilder';
import { MINIMAL_PROFILE, TACTICAL_PROFILE } from './renderProfiles';
import { DEFAULT_ALERT_ZONES } from '../../radar/alertZones';
import type { RadarRenderProfile } from './types';

const TIMESTAMP = 1_700_000_000_000;
const CENTER = { lat: 24.7, lon: 46.7 };

// A ring of aircraft at increasing distance so priority ordering is clear.
function manyAircraft(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `AC${i}`,
    callsign: `MRA${i}`,
    lat: 24.7 + 0.002 * (i + 1),
    lon: 46.7 + 0.002 * (i + 1),
    distance_km: 1 + i, // AC0 closest
    heading_deg: 0,
    updated_at: TIMESTAMP,
  }));
}

function scene(count: number, selectedId: string | null, trailFor?: string) {
  return buildRadarScene({
    aircraft: manyAircraft(count),
    center: CENTER,
    rangeKm: 200,
    altitudeFilter: 'all',
    alertZones: DEFAULT_ALERT_ZONES,
    selectedTargetId: selectedId,
    sourceState: 'DEMO',
    trails: trailFor
      ? {
          [trailFor]: Array.from(
            { length: 20 },
            (_, i) => [24.7 + i * 0.0005, 46.7 + i * 0.0005] as [number, number]
          ),
        }
      : {},
    timestamp: TIMESTAMP,
  });
}

describe('applyRenderProfile', () => {
  it('enforces the target limit', () => {
    const rendered = applyRenderProfile(scene(20, null), MINIMAL_PROFILE);
    expect(rendered.targets).toHaveLength(
      MINIMAL_PROFILE.targetLimit as number
    );
  });

  it('enforces the label limit (labels shown ≤ labelLimit)', () => {
    const rendered = applyRenderProfile(scene(20, null), MINIMAL_PROFILE);
    const labelled = rendered.targets.filter((t) => t.labelVisible).length;
    expect(labelled).toBeLessThanOrEqual(MINIMAL_PROFILE.labelLimit as number);
  });

  it('enforces the trail-point limit, keeping the newest points', () => {
    const source = scene(3, null, 'AC0');
    const original = source.targets.find((t) => t.id === 'AC0')!;
    const rendered = applyRenderProfile(source, MINIMAL_PROFILE);
    const trimmed = rendered.targets.find((t) => t.id === 'AC0')!;
    expect(trimmed.trailPoints.length).toBeLessThanOrEqual(
      MINIMAL_PROFILE.trailPointLimit
    );
    // Newest point (last of the original) is preserved.
    expect(trimmed.trailPoints.at(-1)).toEqual(original.trailPoints.at(-1));
  });

  it('never removes the selected target, even under a tiny cap', () => {
    const tiny: RadarRenderProfile = { ...MINIMAL_PROFILE, targetLimit: 1 };
    // Select the farthest aircraft (lowest priority by distance).
    const rendered = applyRenderProfile(scene(20, 'AC19'), tiny);
    expect(rendered.targets.some((t) => t.id === 'AC19' && t.selected)).toBe(
      true
    );
  });

  it('always allows the selected target a label under a label cap', () => {
    const rendered = applyRenderProfile(scene(20, 'AC19'), MINIMAL_PROFILE);
    const selected = rendered.targets.find((t) => t.id === 'AC19');
    expect(selected?.labelVisible).toBe(true);
  });

  it('is a no-op for an uncapped profile (Tactical)', () => {
    const source = scene(20, 'AC0', 'AC0');
    const rendered = applyRenderProfile(source, TACTICAL_PROFILE);
    expect(rendered.targets).toHaveLength(source.targets.length);
  });

  it('does not mutate the source scene, its targets, or trail arrays', () => {
    const source = scene(20, 'AC0', 'AC0');
    const snapshot = JSON.parse(JSON.stringify(source));
    applyRenderProfile(source, MINIMAL_PROFILE);
    expect(JSON.parse(JSON.stringify(source))).toEqual(snapshot);
  });

  it('is deterministic', () => {
    const source = scene(20, 'AC3', 'AC3');
    expect(applyRenderProfile(source, MINIMAL_PROFILE)).toEqual(
      applyRenderProfile(source, MINIMAL_PROFILE)
    );
  });

  it('reports the rendered count as visibleCount and keeps totalCount', () => {
    const source = scene(20, null);
    const rendered = applyRenderProfile(source, MINIMAL_PROFILE);
    expect(rendered.statistics.visibleCount).toBe(MINIMAL_PROFILE.targetLimit);
    expect(rendered.statistics.totalCount).toBe(source.statistics.totalCount);
  });

  it('preserves the DEMO source state', () => {
    const rendered = applyRenderProfile(scene(20, null), MINIMAL_PROFILE);
    expect(rendered.sourceState).toBe('DEMO');
  });
});
