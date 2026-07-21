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

  it('exposes exactly five implemented modes', () => {
    expect(listImplementedModes().map((m) => m.id)).toEqual([
      'tactical',
      'mission-control',
      'classic',
      'presentation',
      'minimal',
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

  it('resolves every implemented mode to itself', () => {
    for (const mode of [
      'tactical',
      'mission-control',
      'classic',
      'presentation',
      'minimal',
    ] as const) {
      expect(resolveRadarRenderMode(mode)).toBe(mode);
    }
  });

  it('round-trips each mode through save/load using a namespaced key', () => {
    const storage = memoryStorage();
    for (const mode of ['presentation', 'minimal', 'tactical'] as const) {
      saveRadarRenderMode(mode, storage);
      expect(storage.getItem(RADAR_RENDER_MODE_PREFERENCE_KEY)).toBe(mode);
      expect(loadStoredRadarRenderMode(storage)).toBe(mode);
    }
  });

  it('loads Tactical when the stored value is invalid', () => {
    const storage = memoryStorage();
    storage.setItem(RADAR_RENDER_MODE_PREFERENCE_KEY, 'bogus-mode');
    expect(loadStoredRadarRenderMode(storage)).toBe('tactical');
  });

  it('falls back to the default when no storage is available', () => {
    expect(loadStoredRadarRenderMode(undefined)).toBe('tactical');
  });

  it('does not throw when storage getItem throws (storage unavailable)', () => {
    const throwing = {
      getItem: () => {
        throw new Error('storage blocked');
      },
    };
    expect(loadStoredRadarRenderMode(throwing)).toBe('tactical');
  });

  it('minimal profile enforces the documented target/label/trail caps', () => {
    const minimal = RADAR_RENDER_MODES.minimal;
    expect(minimal.targetLimit).toBe(12);
    expect(minimal.labelLimit).toBe(6);
    expect(minimal.trailPointLimit).toBe(8);
    expect(minimal.glowLevel).toBe('none');
  });
});
