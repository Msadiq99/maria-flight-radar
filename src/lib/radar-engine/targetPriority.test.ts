import { describe, expect, it } from 'vitest';
import { compareTargetPriority, computeTargetPriority } from './targetPriority';

describe('computeTargetPriority', () => {
  it('selected always wins, even over a critical alert zone', () => {
    expect(
      computeTargetPriority({
        selected: true,
        alertState: 'critical',
        freshness: 'live',
      })
    ).toBe('selected');
  });

  it('critical beats warning', () => {
    const critical = computeTargetPriority({
      selected: false,
      alertState: 'critical',
      freshness: 'live',
    });
    const warning = computeTargetPriority({
      selected: false,
      alertState: 'warning',
      freshness: 'live',
    });
    expect(critical).toBe('critical');
    expect(warning).toBe('warning');
  });

  it('advisory zone maps to nearby', () => {
    expect(
      computeTargetPriority({
        selected: false,
        alertState: 'advisory',
        freshness: 'live',
      })
    ).toBe('nearby');
  });

  it('normal zone maps to normal when fresh', () => {
    expect(
      computeTargetPriority({
        selected: false,
        alertState: 'normal',
        freshness: 'live',
      })
    ).toBe('normal');
  });

  it('a stale reading is deprioritized below every alert zone, unless selected', () => {
    expect(
      computeTargetPriority({
        selected: false,
        alertState: 'critical',
        freshness: 'stale',
      })
    ).toBe('stale');
    expect(
      computeTargetPriority({
        selected: true,
        alertState: 'critical',
        freshness: 'stale',
      })
    ).toBe('selected');
  });
});

describe('compareTargetPriority', () => {
  it('orders selected > critical > warning > nearby > normal > stale', () => {
    const targets = [
      { id: 'a', priority: 'stale' as const, distanceKm: 1 },
      { id: 'b', priority: 'normal' as const, distanceKm: 1 },
      { id: 'c', priority: 'nearby' as const, distanceKm: 1 },
      { id: 'd', priority: 'warning' as const, distanceKm: 1 },
      { id: 'e', priority: 'critical' as const, distanceKm: 1 },
      { id: 'f', priority: 'selected' as const, distanceKm: 1 },
    ];
    const sorted = [...targets].sort(compareTargetPriority).map((t) => t.id);
    expect(sorted).toEqual(['f', 'e', 'd', 'c', 'b', 'a']);
  });

  it('breaks ties by distance, then id, deterministically', () => {
    const targets = [
      { id: 'z', priority: 'normal' as const, distanceKm: 5 },
      { id: 'a', priority: 'normal' as const, distanceKm: 2 },
      { id: 'b', priority: 'normal' as const, distanceKm: 2 },
    ];
    const sorted = [...targets].sort(compareTargetPriority).map((t) => t.id);
    expect(sorted).toEqual(['a', 'b', 'z']);
  });

  it('does not mutate the input array elements', () => {
    const target = { id: 'a', priority: 'normal' as const, distanceKm: 2 };
    const targets = [target];
    [...targets].sort(compareTargetPriority);
    expect(target).toEqual({ id: 'a', priority: 'normal', distanceKm: 2 });
  });
});
