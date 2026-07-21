import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RADAR_RENDER_MODE,
  RADAR_RENDER_MODE_PREFERENCE_KEY,
  RADAR_RENDER_MODES,
  loadStoredRadarRenderMode,
  listImplementedModes,
  resolveRadarRenderMode,
  saveRadarRenderMode,
} from './modeRegistry';

function memoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe('mode registry', () => {
  it('defaults to tactical', () => {
    expect(DEFAULT_RADAR_RENDER_MODE).toBe('tactical');
  });

  it('exposes tactical, mission-control, and classic as implemented', () => {
    expect(listImplementedModes().map((m) => m.id)).toEqual([
      'tactical',
      'mission-control',
      'classic',
    ]);
  });

  it('declares all five modes with their required profile fields', () => {
    for (const mode of [
      'tactical',
      'mission-control',
      'classic',
      'presentation',
      'minimal',
    ] as const) {
      const profile = RADAR_RENDER_MODES[mode];
      expect(profile.id).toBe(mode);
      expect(typeof profile.implemented).toBe('boolean');
      expect(Array.isArray(profile.visibleLayers)).toBe(true);
      expect(profile.visibleLayers.length).toBeGreaterThan(0);
    }
  });

  it('resolves an invalid stored mode to the default without crashing', () => {
    expect(resolveRadarRenderMode('not-a-real-mode')).toBe('tactical');
    expect(resolveRadarRenderMode(undefined)).toBe('tactical');
    expect(resolveRadarRenderMode(null)).toBe('tactical');
  });

  it('resolves an implemented mode to itself', () => {
    expect(resolveRadarRenderMode('mission-control')).toBe('mission-control');
    expect(resolveRadarRenderMode('classic')).toBe('classic');
  });

  it('resolves a valid but not-yet-implemented mode to the default', () => {
    expect(resolveRadarRenderMode('presentation')).toBe('tactical');
    expect(resolveRadarRenderMode('minimal')).toBe('tactical');
  });

  it('round-trips a stored preference through save/load using a namespaced key', () => {
    const storage = memoryStorage();
    saveRadarRenderMode('tactical', storage);
    expect(storage.getItem(RADAR_RENDER_MODE_PREFERENCE_KEY)).toBe('tactical');
    expect(loadStoredRadarRenderMode(storage)).toBe('tactical');
  });

  it('falls back to the default when no storage is available', () => {
    expect(loadStoredRadarRenderMode(undefined)).toBe('tactical');
  });

  it('minimal profile enforces the documented target/label/trail caps', () => {
    const minimal = RADAR_RENDER_MODES.minimal;
    expect(minimal.targetLimit).toBe(12);
    expect(minimal.labelLimit).toBe(6);
    expect(minimal.trailPointLimit).toBe(8);
    expect(minimal.glowLevel).toBe('none');
  });
});
