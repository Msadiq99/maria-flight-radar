import type { RadarRange } from '../radarGeometry';
import { DEFAULT_ALERT_ZONES, sanitizeAlertZones, type AlertZoneThresholds } from './alertZones';
import { isAltitudeFilter, type AltitudeFilter } from './altitudeFilter';

export type RadarPreferencesV2 = {
  version: 2;
  rangeKm: RadarRange;
  showLabels: boolean;
  showTrails: boolean;
  sweepPaused: boolean;
  autoSelect: boolean;
  altitudeFilter: AltitudeFilter;
  alertZones: AlertZoneThresholds;
};

export const RADAR_PREFERENCES_KEY = 'maria.radar.preferences';

export const DEFAULT_RADAR_PREFERENCES: RadarPreferencesV2 = {
  version: 2,
  rangeKm: 50,
  showLabels: true,
  showTrails: true,
  sweepPaused: false,
  autoSelect: true,
  altitudeFilter: 'all',
  alertZones: DEFAULT_ALERT_ZONES,
};

function isRange(value: unknown): value is RadarRange {
  return value === 25 || value === 50 || value === 100 || value === 200;
}

function readLegacy<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function normalizeRadarPreferences(
  value: unknown,
  legacy: Partial<RadarPreferencesV2> = {}
): RadarPreferencesV2 {
  const source =
    value && typeof value === 'object'
      ? (value as Partial<RadarPreferencesV2>)
      : {};
  const rangeKm = isRange(source.rangeKm)
    ? source.rangeKm
    : isRange(legacy.rangeKm)
      ? legacy.rangeKm
      : DEFAULT_RADAR_PREFERENCES.rangeKm;
  return {
    version: 2,
    rangeKm,
    showLabels:
      typeof source.showLabels === 'boolean'
        ? source.showLabels
        : legacy.showLabels ?? DEFAULT_RADAR_PREFERENCES.showLabels,
    showTrails:
      typeof source.showTrails === 'boolean'
        ? source.showTrails
        : legacy.showTrails ?? DEFAULT_RADAR_PREFERENCES.showTrails,
    sweepPaused:
      typeof source.sweepPaused === 'boolean'
        ? source.sweepPaused
        : legacy.sweepPaused ?? DEFAULT_RADAR_PREFERENCES.sweepPaused,
    autoSelect:
      typeof source.autoSelect === 'boolean'
        ? source.autoSelect
        : legacy.autoSelect ?? DEFAULT_RADAR_PREFERENCES.autoSelect,
    altitudeFilter: isAltitudeFilter(source.altitudeFilter)
      ? source.altitudeFilter
      : DEFAULT_RADAR_PREFERENCES.altitudeFilter,
    alertZones: sanitizeAlertZones(source.alertZones, rangeKm),
  };
}

export function loadRadarPreferences(): RadarPreferencesV2 {
  const legacy = {
    rangeKm: readLegacy<RadarRange>('maria.radar.range', DEFAULT_RADAR_PREFERENCES.rangeKm),
    showLabels: readLegacy('maria.radar.labels', DEFAULT_RADAR_PREFERENCES.showLabels),
    showTrails: readLegacy('maria.radar.trails', DEFAULT_RADAR_PREFERENCES.showTrails),
    sweepPaused: readLegacy('maria.radar.paused', DEFAULT_RADAR_PREFERENCES.sweepPaused),
    autoSelect: readLegacy('maria.radar.auto-select', DEFAULT_RADAR_PREFERENCES.autoSelect),
  };
  try {
    return normalizeRadarPreferences(
      JSON.parse(localStorage.getItem(RADAR_PREFERENCES_KEY) || 'null'),
      legacy
    );
  } catch {
    return normalizeRadarPreferences(null, legacy);
  }
}

export function saveRadarPreferences(preferences: RadarPreferencesV2) {
  localStorage.setItem(RADAR_PREFERENCES_KEY, JSON.stringify(preferences));
}
