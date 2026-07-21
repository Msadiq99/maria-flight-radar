import type { RadarScene } from '../types';
import { RADAR_SNAPSHOT_SCHEMA_VERSION, type RadarSnapshot } from './types';

export type CreateSnapshotOptions = {
  id: string;
  /** When the snapshot is taken. Explicit — never defaulted to Date.now(). */
  capturedAt: number;
  metadata?: Readonly<Record<string, string | number | boolean | null>>;
};

/**
 * Creates an immutable snapshot from a scene. Pure and deterministic:
 * the same scene + the same `capturedAt` always yields an equal snapshot.
 * Targets are deep-copied so later scene changes cannot affect the
 * snapshot, and the source scene is never mutated. No source-state
 * conversion occurs — a DEMO scene snapshots as DEMO.
 */
export function createSnapshot(
  scene: RadarScene,
  options: CreateSnapshotOptions
): RadarSnapshot {
  return Object.freeze({
    id: options.id,
    capturedAt: options.capturedAt,
    sceneTimestamp: scene.timestamp,
    sourceState: scene.sourceState,
    center: scene.center
      ? Object.freeze({ lat: scene.center.lat, lon: scene.center.lon })
      : null,
    rangeKm: scene.rangeKm,
    viewportRadius: scene.viewport.radius,
    targets: Object.freeze(
      scene.targets.map((target) =>
        Object.freeze({
          ...target,
          trailPoints: Object.freeze(
            target.trailPoints.map((point) => Object.freeze({ ...point }))
          ),
          labelAnchor: Object.freeze({ ...target.labelAnchor }),
        })
      )
    ),
    alertZones: Object.freeze({ ...scene.alertZones }),
    metadata: Object.freeze({ ...(options.metadata ?? {}) }),
    schemaVersion: RADAR_SNAPSHOT_SCHEMA_VERSION,
  }) as RadarSnapshot;
}

export function isSupportedSnapshotVersion(snapshot: RadarSnapshot): boolean {
  return snapshot.schemaVersion === RADAR_SNAPSHOT_SCHEMA_VERSION;
}

/** Throws on an unsupported schema version; otherwise returns the snapshot. */
export function assertSupportedSnapshot(
  snapshot: RadarSnapshot
): RadarSnapshot {
  if (!isSupportedSnapshotVersion(snapshot)) {
    throw new Error(
      `Unsupported radar snapshot schema version: ${snapshot.schemaVersion} (expected ${RADAR_SNAPSHOT_SCHEMA_VERSION})`
    );
  }
  return snapshot;
}

/**
 * Restores a renderable scene from a snapshot. Deterministic and lossless
 * for coordinates and target ordering: the returned scene's targets are
 * in the same order with identical projected positions. Statistics are
 * recomputed from the restored targets. Rejects unsupported schema
 * versions. The `altitudeFilter` rendering hint is not part of the
 * snapshot (it does not affect an already-projected scene) and is
 * reported as 'all'.
 */
export function restoreScene(snapshot: RadarSnapshot): RadarScene {
  assertSupportedSnapshot(snapshot);
  const targets = snapshot.targets.map((target) => ({
    ...target,
    trailPoints: target.trailPoints.map((point) => ({ ...point })),
    labelAnchor: { ...target.labelAnchor },
  }));
  const alertCount = targets.filter(
    (target) =>
      target.alertState === 'critical' || target.alertState === 'warning'
  ).length;
  const selected = targets.find((target) => target.selected) ?? null;
  return {
    viewport: { radius: snapshot.viewportRadius },
    center: snapshot.center ? { ...snapshot.center } : null,
    rangeKm: snapshot.rangeKm,
    timestamp: snapshot.sceneTimestamp,
    sourceState: snapshot.sourceState,
    targets,
    alertZones: { ...snapshot.alertZones },
    selectedTargetId: selected ? selected.id : null,
    statistics: {
      totalCount: targets.length,
      visibleCount: targets.length,
      alertCount,
    },
    renderingHints: { altitudeFilter: 'all' },
  };
}
