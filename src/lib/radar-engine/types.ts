import type { RadarRange } from '../../radarGeometry';
import type { AlertZone, AlertZoneThresholds } from '../../radar/alertZones';
import type { AltitudeFilter } from '../../radar/altitudeFilter';
import type { Freshness } from '../../radar/aircraftMetadata';
import type { SourceState } from '../../missionControlState';

/** Five selectable visual renderers sharing one scene model. */
export type RadarRenderMode =
  'tactical' | 'mission-control' | 'classic' | 'presentation' | 'minimal';

/**
 * Neutral aviation-safe target priority. Never use hostile/friendly
 * classification — MARIA has no verified data source for that.
 */
export type RadarTargetPriority =
  | 'selected'
  | 'critical'
  | 'warning'
  | 'nearby'
  | 'normal'
  | 'stale'
  | 'hidden';

export type RadarAlertState = AlertZone;

export type RadarLayerId =
  | 'background'
  | 'grid'
  | 'map'
  | 'rangeRing'
  | 'sweep'
  | 'alertZone'
  | 'trail'
  | 'prediction'
  | 'aircraft'
  | 'leaderLine'
  | 'label'
  | 'selection'
  | 'overlay';

export type RadarAnimationLevel =
  'none' | 'restrained' | 'moderate' | 'cinematic';

export type RadarDensity = 'compact' | 'balanced' | 'rich';

/**
 * Declarative per-mode configuration. Modes differ only in these values
 * plus which renderer component reads them — never in geometry, data,
 * selection, or source-state logic.
 */
export type RadarRenderProfile = {
  id: RadarRenderMode;
  label: string;
  description: string;
  /** False until a mode's renderer is built; unimplemented modes must not be user-selectable. */
  implemented: boolean;
  density: RadarDensity;
  animationLevel: RadarAnimationLevel;
  visibleLayers: RadarLayerId[];
  labelsEnabledByDefault: boolean;
  trailsEnabledByDefault: boolean;
  predictionEnabledByDefault: boolean;
  sweepEnabledByDefault: boolean;
  mapEnabledByDefault: boolean;
  glowLevel: 'none' | 'low' | 'medium' | 'high';
  targetLimit: number | null;
  labelLimit: number | null;
  trailPointLimit: number;
  fpsTarget: number;
  reducedMotionFallback: 'static' | 'freeze-last-frame';
};

export type RadarTrailPoint = {
  x: number;
  y: number;
};

export type RadarLabelAnchor = {
  x: number;
  y: number;
};

/** A single aircraft projected into the radar scene. Platform-independent — no SVG/DOM types. */
export type RadarSceneTarget = {
  id: string;
  callsign: string | null;
  icao: string | null;
  projectedX: number;
  projectedY: number;
  visible: boolean;
  heading: number;
  altitude: number | null;
  speed: number | null;
  verticalRate: number | null;
  distanceKm: number;
  bearing: number;
  freshness: Freshness;
  sourceState: SourceState;
  alertState: RadarAlertState;
  priority: RadarTargetPriority;
  selected: boolean;
  trailPoints: RadarTrailPoint[];
  labelAnchor: RadarLabelAnchor;
  labelVisible: boolean;
};

export type RadarSceneStatistics = {
  totalCount: number;
  visibleCount: number;
  alertCount: number;
};

export type RadarSceneViewport = {
  /** SVG-viewBox-style radius in scene units; layers project onto this. */
  radius: number;
};

/**
 * Platform-independent radar scene. Built once per data update by the
 * scene builder and consumed identically by every render mode.
 */
export type RadarScene = {
  viewport: RadarSceneViewport;
  center: { lat: number; lon: number } | null;
  rangeKm: RadarRange;
  /** Explicit timestamp (not Date.now()) so scenes are reproducible for tests and future playback. */
  timestamp: number;
  sourceState: SourceState;
  targets: RadarSceneTarget[];
  alertZones: AlertZoneThresholds;
  selectedTargetId: string | null;
  statistics: RadarSceneStatistics;
  renderingHints: {
    altitudeFilter: AltitudeFilter;
  };
};
