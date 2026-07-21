import { describe, expect, it } from 'vitest';
import {
  RADAR_THEMES,
  RADAR_THEME_VARS,
  getRadarTheme,
  radarModeClassName,
  radarThemeToCssVars,
} from './themeRegistry';
import type { RadarRenderMode } from './types';

const ALL_MODES: RadarRenderMode[] = [
  'tactical',
  'mission-control',
  'classic',
  'presentation',
  'minimal',
];

describe('radar theme registry', () => {
  it('defines a theme for every render mode', () => {
    for (const mode of ALL_MODES) {
      expect(getRadarTheme(mode)).toBeDefined();
    }
  });

  it('emits a CSS custom property for every themed value', () => {
    const vars = radarThemeToCssVars('tactical');
    for (const name of Object.values(RADAR_THEME_VARS)) {
      expect(vars[name]).toBeDefined();
    }
  });

  it('gives the sweep duration a ms unit and glow a px unit', () => {
    const vars = radarThemeToCssVars('classic');
    expect(vars[RADAR_THEME_VARS.sweepDurationMs]).toMatch(/^\d+ms$/);
    expect(vars[RADAR_THEME_VARS.glow]).toMatch(/^\d+px$/);
    expect(vars[RADAR_THEME_VARS.sweepOpacity]).toMatch(/^[\d.]+$/);
  });

  it('maps Mission Control back to the existing MARIA design tokens', () => {
    const vars = radarThemeToCssVars('mission-control');
    expect(vars[RADAR_THEME_VARS.rings]).toBe('var(--maria-primary)');
    expect(vars[RADAR_THEME_VARS.normalTarget]).toBe('var(--maria-active)');
    expect(vars[RADAR_THEME_VARS.critical]).toBe('var(--maria-critical)');
  });

  it('keeps Classic critical distinguishable from its normal green target', () => {
    const classic = RADAR_THEMES.classic;
    expect(classic.critical).not.toBe(classic.normalTarget);
    // Critical stays a red channel-dominant color for safety clarity.
    expect(classic.critical.toLowerCase()).toMatch(/^#f|^#e|^#d/);
    // Normal targets are green phosphor.
    expect(classic.normalTarget.toLowerCase()).toMatch(/^#[0-3]/);
  });

  it('Classic enables a restrained glow while Tactical/Mission Control do not', () => {
    expect(RADAR_THEMES.classic.glow).toBeGreaterThan(0);
    expect(RADAR_THEMES.tactical.glow).toBe(0);
    expect(RADAR_THEMES['mission-control'].glow).toBe(0);
  });

  it('namespaces the mode class', () => {
    expect(radarModeClassName('mission-control')).toBe(
      'radar-mode-mission-control'
    );
  });
});
