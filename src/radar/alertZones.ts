import type { RadarRange } from '../radarGeometry';
import { parseFiniteNumber } from './altitudeFilter';

export type AlertZone = 'critical' | 'warning' | 'advisory' | 'normal';

export type AlertZoneThresholds = {
  criticalKm: number;
  warningKm: number;
  advisoryKm: number;
};

export const DEFAULT_ALERT_ZONES: AlertZoneThresholds = {
  criticalKm: 5,
  warningKm: 15,
  advisoryKm: 30,
};

export const ALERT_ZONE_LABELS: Record<AlertZone, string> = {
  critical: 'Critical',
  warning: 'Warning',
  advisory: 'Advisory',
  normal: 'Normal',
};

export function classifyAlertZone(
  distanceKm: unknown,
  thresholds: AlertZoneThresholds
): AlertZone {
  const distance = parseFiniteNumber(distanceKm);
  if (distance === null || distance > thresholds.advisoryKm) return 'normal';
  if (distance <= thresholds.criticalKm) return 'critical';
  if (distance <= thresholds.warningKm) return 'warning';
  return 'advisory';
}

export function validateAlertZones(
  thresholds: AlertZoneThresholds,
  activeRangeKm: RadarRange
) {
  const critical = parseFiniteNumber(thresholds.criticalKm);
  const warning = parseFiniteNumber(thresholds.warningKm);
  const advisory = parseFiniteNumber(thresholds.advisoryKm);
  if (critical === null || warning === null || advisory === null) {
    return 'All alert-zone thresholds must be numbers.';
  }
  if (critical <= 0) return 'Critical radius must be greater than 0 km.';
  if (critical >= warning) {
    return 'Critical radius must be smaller than warning radius.';
  }
  if (warning >= advisory) {
    return 'Warning radius must be smaller than advisory radius.';
  }
  if (advisory > activeRangeKm) {
    return 'Advisory radius must fit within the active radar range.';
  }
  return null;
}

export function sanitizeAlertZones(
  value: unknown,
  activeRangeKm: RadarRange,
  fallback: AlertZoneThresholds = DEFAULT_ALERT_ZONES
) {
  if (!value || typeof value !== 'object') return fallback;
  const candidate = value as Partial<AlertZoneThresholds>;
  const thresholds = {
    criticalKm: parseFiniteNumber(candidate.criticalKm) ?? fallback.criticalKm,
    warningKm: parseFiniteNumber(candidate.warningKm) ?? fallback.warningKm,
    advisoryKm: parseFiniteNumber(candidate.advisoryKm) ?? fallback.advisoryKm,
  };
  return validateAlertZones(thresholds, activeRangeKm) ? fallback : thresholds;
}
