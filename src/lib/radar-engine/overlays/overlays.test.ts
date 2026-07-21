import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AVAILABLE_CAPABILITIES,
  DEFAULT_OVERLAY_FLAGS,
  PLANNED_RADAR_OVERLAYS,
  RADAR_OVERLAY_SLOTS,
  hasCapabilities,
  isOverlayActive,
  isOverlayEnabled,
  listOverlays,
  selectOverlaysForSlot,
} from './index';
import type { RadarRenderMode } from '../types';

const ALL_MODES: RadarRenderMode[] = [
  'tactical',
  'mission-control',
  'classic',
  'presentation',
  'minimal',
];

describe('radar overlay registry', () => {
  it('declares the eight planned overlays', () => {
    expect(
      listOverlays()
        .map((o) => o.id)
        .sort()
    ).toEqual(
      [
        'airports',
        'airspace-boundaries',
        'aircraft-media',
        'heat-map',
        'historical-playback',
        'receiver-coverage',
        'route-projection',
        'weather',
      ].sort()
    );
  });

  it('keeps every planned overlay unimplemented, disabled, and renderer-less', () => {
    for (const overlay of PLANNED_RADAR_OVERLAYS) {
      expect(overlay.implemented).toBe(false);
      expect(overlay.enabledByDefault).toBe(false);
      expect(overlay.renderLayer).toBeUndefined();
      expect(overlay.requiredCapabilities.length).toBeGreaterThan(0);
    }
  });

  it('has no available capabilities and no enabled flags by default', () => {
    expect(DEFAULT_AVAILABLE_CAPABILITIES).toHaveLength(0);
    expect(Object.keys(DEFAULT_OVERLAY_FLAGS)).toHaveLength(0);
  });

  it('reports every overlay inactive in every mode with shipped defaults', () => {
    for (const overlay of PLANNED_RADAR_OVERLAYS) {
      for (const mode of ALL_MODES) {
        expect(isOverlayActive(overlay, mode)).toBe(false);
        expect(isOverlayEnabled(overlay)).toBe(false);
      }
    }
  });

  it('returns no active overlays for any slot in any mode', () => {
    for (const slot of RADAR_OVERLAY_SLOTS) {
      for (const mode of ALL_MODES) {
        expect(selectOverlaysForSlot(slot, mode)).toHaveLength(0);
      }
    }
  });

  it('stays inactive even if a flag is forced on, because it is unimplemented and lacks capabilities', () => {
    const weather = PLANNED_RADAR_OVERLAYS.find((o) => o.id === 'weather')!;
    expect(
      isOverlayActive(weather, 'tactical', {
        flags: { weather: true },
        capabilities: ['weather-data'],
      })
    ).toBe(false);
  });

  it('capability gate requires all capabilities present', () => {
    expect(hasCapabilities([], [])).toBe(true);
    expect(hasCapabilities(['weather-data'], [])).toBe(false);
    expect(hasCapabilities(['weather-data'], ['weather-data'])).toBe(true);
  });
});
