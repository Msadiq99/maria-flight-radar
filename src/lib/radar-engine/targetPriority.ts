import type { Freshness } from '../../radar/aircraftMetadata';
import type { RadarAlertState, RadarTargetPriority } from './types';

const PRIORITY_ORDER: RadarTargetPriority[] = [
  'selected',
  'critical',
  'warning',
  'nearby',
  'normal',
  'stale',
  'hidden',
];

export function priorityRank(priority: RadarTargetPriority): number {
  return PRIORITY_ORDER.indexOf(priority);
}

/**
 * Deterministic, aviation-safe target priority. Derived only from
 * verified alert-zone classification, freshness, and selection state —
 * never from hostile/friendly-style classification.
 *
 * Selection always wins. A stale reading is otherwise deprioritized
 * below every alert zone, since its position can no longer be trusted
 * as current.
 */
export function computeTargetPriority({
  selected,
  alertState,
  freshness,
}: {
  selected: boolean;
  alertState: RadarAlertState;
  freshness: Freshness;
}): RadarTargetPriority {
  if (selected) return 'selected';
  if (freshness === 'stale') return 'stale';
  if (alertState === 'critical') return 'critical';
  if (alertState === 'warning') return 'warning';
  if (alertState === 'advisory') return 'nearby';
  return 'normal';
}

/** Ascending sort — highest-priority target first. Ties broken by distance, then id, for determinism. */
export function compareTargetPriority<
  T extends { priority: RadarTargetPriority; distanceKm: number; id: string },
>(a: T, b: T): number {
  const rankDelta = priorityRank(a.priority) - priorityRank(b.priority);
  if (rankDelta !== 0) return rankDelta;
  const distanceDelta = a.distanceKm - b.distanceKm;
  if (distanceDelta !== 0) return distanceDelta;
  return a.id.localeCompare(b.id);
}
