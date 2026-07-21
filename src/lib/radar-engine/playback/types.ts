import type { RadarRange } from '../../../radarGeometry';
import type { AlertZoneThresholds } from '../../../radar/alertZones';
import type { SourceState } from '../../../missionControlState';
import type { RadarSceneTarget } from '../types';

/** Bumped when the snapshot shape changes incompatibly. */
export const RADAR_SNAPSHOT_SCHEMA_VERSION = 1;

/**
 * An immutable capture of a radar scene at one instant, sufficient to
 * re-render it deterministically later (playback, tests, screenshots).
 * `sceneTimestamp` is the scene's own explicit clock; `capturedAt` is
 * when the snapshot was taken — both are provided by the caller, never
 * read from Date.now() inside a helper.
 */
export type RadarSnapshot = {
  readonly id: string;
  readonly capturedAt: number;
  readonly sceneTimestamp: number;
  readonly sourceState: SourceState;
  readonly center: { readonly lat: number; readonly lon: number } | null;
  readonly rangeKm: RadarRange;
  readonly viewportRadius: number;
  readonly targets: readonly RadarSceneTarget[];
  readonly alertZones: AlertZoneThresholds;
  readonly metadata: Readonly<Record<string, string | number | boolean | null>>;
  readonly schemaVersion: number;
};

export type RadarTimelineFrame = {
  readonly index: number;
  readonly timestamp: number;
  readonly snapshot: RadarSnapshot;
  readonly durationMs: number;
};

export type RadarPlaybackStatus =
  'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'ended' | 'error';

export type RadarPlaybackState = {
  readonly status: RadarPlaybackStatus;
  readonly currentFrameIndex: number;
  readonly speed: number;
  readonly loop: boolean;
  readonly startedAt: number | null;
  readonly pausedAt: number | null;
};

export const INITIAL_PLAYBACK_STATE: RadarPlaybackState = Object.freeze({
  status: 'idle',
  currentFrameIndex: 0,
  speed: 1,
  loop: false,
  startedAt: null,
  pausedAt: null,
});
