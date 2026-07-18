import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_RADAR_PREFERENCES,
  RADAR_PREFERENCES_KEY,
  loadRadarPreferences,
  normalizeRadarPreferences,
  saveRadarPreferences,
} from './radarPreferences';

describe('radar preferences', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    });
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('migrates RC UI-1 preferences', () => {
    localStorage.setItem('maria.radar.range', '100');
    localStorage.setItem('maria.radar.labels', 'false');
    localStorage.setItem('maria.radar.trails', 'false');
    localStorage.setItem('maria.radar.paused', 'true');
    const preferences = loadRadarPreferences();
    expect(preferences.rangeKm).toBe(100);
    expect(preferences.showLabels).toBe(false);
    expect(preferences.showTrails).toBe(false);
    expect(preferences.sweepPaused).toBe(true);
  });

  it('recovers from corrupt local storage', () => {
    localStorage.setItem(RADAR_PREFERENCES_KEY, '{');
    expect(loadRadarPreferences()).toMatchObject(DEFAULT_RADAR_PREFERENCES);
  });

  it('persists valid RC UI-2 preferences', () => {
    const preferences = normalizeRadarPreferences({
      version: 2,
      rangeKm: 200,
      showLabels: false,
      showTrails: true,
      sweepPaused: true,
      autoSelect: false,
      altitudeFilter: 'above30000',
      alertZones: { criticalKm: 10, warningKm: 40, advisoryKm: 100 },
    });
    saveRadarPreferences(preferences);
    expect(loadRadarPreferences()).toEqual(preferences);
  });
});
