import { describe, expect, it } from 'vitest';
import {
  RADAR_SNAPSHOT_SCHEMA_VERSION,
  assertSupportedSnapshot,
  createSnapshot,
  createTimeline,
  isSupportedSnapshotVersion,
  nearestFrameIndex,
  restoreScene,
  sortTimelineFrames,
} from './index';
import { buildRadarScene } from '../sceneBuilder';
import { DEFAULT_ALERT_ZONES } from '../../../radar/alertZones';
import type { RadarSnapshot } from './types';

const CENTER = { lat: 24.7, lon: 46.7 };
const T = 1_700_000_000_000;

function scene(ts = T, selectedId: string | null = 'AC1') {
  return buildRadarScene({
    aircraft: [
      {
        id: 'AC1',
        callsign: 'MRA1',
        lat: 24.71,
        lon: 46.71,
        distance_km: 2,
        heading_deg: 90,
        updated_at: ts,
      },
      {
        id: 'AC2',
        callsign: 'MRA2',
        lat: 24.66,
        lon: 46.72,
        distance_km: 8,
        heading_deg: 180,
        updated_at: ts,
      },
    ],
    center: CENTER,
    rangeKm: 50,
    altitudeFilter: 'all',
    alertZones: DEFAULT_ALERT_ZONES,
    selectedTargetId: selectedId,
    sourceState: 'DEMO',
    timestamp: ts,
  });
}

describe('snapshots', () => {
  it('same scene + same capturedAt yields an identical snapshot', () => {
    const s = scene();
    const a = createSnapshot(s, { id: 'snap', capturedAt: T });
    const b = createSnapshot(s, { id: 'snap', capturedAt: T });
    expect(a).toEqual(b);
  });

  it('does not mutate the source scene', () => {
    const s = scene();
    const snapshot = JSON.parse(JSON.stringify(s));
    createSnapshot(s, { id: 'snap', capturedAt: T });
    expect(JSON.parse(JSON.stringify(s))).toEqual(snapshot);
  });

  it('restores coordinates and target ordering losslessly', () => {
    const s = scene();
    const restored = restoreScene(
      createSnapshot(s, { id: 'snap', capturedAt: T })
    );
    expect(restored.targets.map((t) => t.id)).toEqual(
      s.targets.map((t) => t.id)
    );
    expect(restored.targets.map((t) => [t.projectedX, t.projectedY])).toEqual(
      s.targets.map((t) => [t.projectedX, t.projectedY])
    );
    expect(restored.rangeKm).toBe(s.rangeKm);
    expect(restored.timestamp).toBe(s.timestamp);
  });

  it('a DEMO snapshot restores as DEMO (no source-state conversion)', () => {
    const snapshot = createSnapshot(scene(), { id: 'snap', capturedAt: T });
    expect(snapshot.sourceState).toBe('DEMO');
    expect(restoreScene(snapshot).sourceState).toBe('DEMO');
  });

  it('preserves the selected target through capture and restore', () => {
    const restored = restoreScene(
      createSnapshot(scene(T, 'AC2'), { id: 's', capturedAt: T })
    );
    expect(restored.selectedTargetId).toBe('AC2');
  });

  it('rejects an unsupported schema version', () => {
    const bad = {
      ...createSnapshot(scene(), { id: 'snap', capturedAt: T }),
      schemaVersion: RADAR_SNAPSHOT_SCHEMA_VERSION + 1,
    } as RadarSnapshot;
    expect(isSupportedSnapshotVersion(bad)).toBe(false);
    expect(() => assertSupportedSnapshot(bad)).toThrow();
    expect(() => restoreScene(bad)).toThrow();
  });
});

describe('timeline', () => {
  const frames = () =>
    createTimeline([
      createSnapshot(scene(T + 2000), { id: 'c', capturedAt: T + 2000 }),
      createSnapshot(scene(T), { id: 'a', capturedAt: T }),
      createSnapshot(scene(T + 1000), { id: 'b', capturedAt: T + 1000 }),
    ]);

  it('sorts frames by timestamp, stably and deterministically', () => {
    const sorted = sortTimelineFrames(frames());
    expect(sorted.map((f) => f.timestamp)).toEqual([T, T + 1000, T + 2000]);
    expect(sortTimelineFrames(frames())).toEqual(sorted);
  });

  it('selects the nearest frame deterministically, earlier frame on a tie', () => {
    const sorted = sortTimelineFrames(frames());
    expect(nearestFrameIndex(sorted, T + 100)).toBe(0);
    expect(nearestFrameIndex(sorted, T + 900)).toBe(1);
    // Exact midpoint between frame 0 (T) and frame 1 (T+1000): earlier wins.
    expect(nearestFrameIndex(sorted, T + 500)).toBe(0);
    expect(nearestFrameIndex([], T)).toBe(-1);
  });
});
