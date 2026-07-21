import {
  bearingDegrees,
  distanceKm as geodesicDistanceKm,
  projectTarget,
  type RadarRange,
} from '../../radarGeometry';
import {
  classifyAlertZone,
  type AlertZoneThresholds,
} from '../../radar/alertZones';
import {
  filterAircraftByAltitude,
  type AltitudeFilter,
} from '../../radar/altitudeFilter';
import { freshnessFromTimestamp } from '../../radar/aircraftMetadata';
import type { SourceState } from '../../missionControlState';
import { computeTargetPriority, compareTargetPriority } from './targetPriority';
import type { RadarScene, RadarSceneTarget } from './types';

export type SceneBuilderAircraft = {
  id: string;
  callsign?: string | null;
  icao?: string | null;
  lat: number;
  lon: number;
  altitude_m?: number | null;
  velocity_kmph?: number | null;
  heading_deg?: number;
  vertical_rate_mps?: number | null;
  distance_km: number;
  updated_at?: number;
};

export type BuildRadarSceneInput = {
  aircraft: SceneBuilderAircraft[];
  center: { lat: number; lon: number } | null;
  rangeKm: RadarRange;
  /** Screen-space viewport radius; the scene stays platform-independent — this is the only pixel value it carries. */
  viewportRadius?: number;
  altitudeFilter: AltitudeFilter;
  alertZones: AlertZoneThresholds;
  selectedTargetId: string | null;
  sourceState: SourceState;
  /** [lat, lon][] trail history per aircraft id, as tracked today by useNearbyTraffic. */
  trails?: Record<string, [number, number][]>;
  trailPointLimit?: number;
  /** Explicit clock so scenes are deterministic for tests and future playback — never Date.now() internally. */
  timestamp: number;
};

const DEFAULT_VIEWPORT_RADIUS = 220;
const DEFAULT_TRAIL_POINT_LIMIT = 30;

function projectPoint(
  center: { lat: number; lon: number },
  lat: number,
  lon: number,
  rangeKm: RadarRange,
  radius: number
) {
  return projectTarget(
    bearingDegrees(center.lat, center.lon, lat, lon),
    geodesicDistanceKm(center.lat, center.lon, lat, lon),
    rangeKm,
    radius
  );
}

/**
 * Converts normalized aircraft data into a platform-independent radar
 * scene. Pure and deterministic: identical input always yields an
 * identical scene, and the source aircraft array/objects are never
 * mutated. Every render mode consumes the same scene shape.
 */
export function buildRadarScene(input: BuildRadarSceneInput): RadarScene {
  const {
    aircraft,
    center,
    rangeKm,
    viewportRadius = DEFAULT_VIEWPORT_RADIUS,
    altitudeFilter,
    alertZones,
    selectedTargetId,
    sourceState,
    trails = {},
    trailPointLimit = DEFAULT_TRAIL_POINT_LIMIT,
    timestamp,
  } = input;

  const inRange = aircraft.filter((item) => item.distance_km <= rangeKm);
  const afterAltitudeFilter = filterAircraftByAltitude(inRange, altitudeFilter);

  const targets: RadarSceneTarget[] = afterAltitudeFilter.map((item) => {
    const projected = center
      ? projectPoint(center, item.lat, item.lon, rangeKm, viewportRadius)
      : { x: 0, y: 0, visible: false };
    const bearing = center
      ? bearingDegrees(center.lat, center.lon, item.lat, item.lon)
      : 0;
    const alertState = classifyAlertZone(item.distance_km, alertZones);
    const freshness = freshnessFromTimestamp(item.updated_at, timestamp);
    const selected = item.id === selectedTargetId;
    const priority = computeTargetPriority({ selected, alertState, freshness });

    const rawTrail = trails[item.id] || [];
    const trailPoints = center
      ? rawTrail
          .slice(-trailPointLimit)
          .map(([lat, lon]) =>
            projectPoint(center, lat, lon, rangeKm, viewportRadius)
          )
          .filter((point) => point.visible)
          .map((point) => ({ x: point.x, y: point.y }))
      : [];

    return {
      id: item.id,
      callsign: item.callsign ?? null,
      icao: item.icao ?? null,
      projectedX: projected.x,
      projectedY: projected.y,
      visible: projected.visible,
      heading: item.heading_deg ?? 0,
      altitude: item.altitude_m ?? null,
      speed: item.velocity_kmph ?? null,
      verticalRate: item.vertical_rate_mps ?? null,
      distanceKm: item.distance_km,
      bearing,
      freshness,
      sourceState,
      alertState,
      priority,
      selected,
      trailPoints,
      labelAnchor: { x: projected.x, y: projected.y },
      labelVisible: true,
    };
  });

  targets.sort(compareTargetPriority);

  const alertCount = targets.filter(
    (target) =>
      target.alertState === 'critical' || target.alertState === 'warning'
  ).length;

  return {
    viewport: { radius: viewportRadius },
    center,
    rangeKm,
    timestamp,
    sourceState,
    targets,
    alertZones,
    selectedTargetId,
    statistics: {
      totalCount: aircraft.length,
      visibleCount: targets.length,
      alertCount,
    },
    renderingHints: { altitudeFilter },
  };
}
