import type { RadarRenderMode } from './types';

/**
 * Typed palette + animation parameters for one render mode.
 *
 * This registry is the single source of truth for radar geometry
 * colors on the web: each value is emitted as a CSS custom property
 * (see `radarThemeToCssVars`) applied at the radar console root, and
 * the layer CSS in App.css consumes those variables (`var(--radar-*)`).
 * Layer components therefore never hardcode colors — they carry class
 * names only, and the active mode's theme drives every hue.
 *
 * It is also the palette contract that future non-CSS renderers
 * (Canvas/2.5D presentation, and the firmware visual contract) read
 * from, so it must stay platform-independent (plain strings/numbers).
 *
 * A value may be a literal color or a reference to an existing design
 * token, e.g. `'var(--maria-primary)'` — both resolve correctly as an
 * inline custom-property value.
 */
export type RadarTheme = {
  /** Scope disc background. */
  background: string;
  /** Boundary + range rings. */
  rings: string;
  /** Crosshair / grid axes. */
  grid: string;
  /** Compass letters and range labels. */
  compass: string;
  /** Center point. */
  center: string;
  /** Sweep beam fill. */
  sweep: string;
  /** Sweep beam opacity (0–1). */
  sweepOpacity: number;
  /** One shared sweep rotation period, in milliseconds. */
  sweepDurationMs: number;
  /** Normal target fill and its outline. */
  normalTarget: string;
  normalTargetStroke: string;
  /** Advisory-zone target fill. */
  advisory: string;
  /** Warning-zone target / ring. */
  warning: string;
  /** Critical-zone target / ring (kept red across all modes for safety clarity). */
  critical: string;
  /** Selected target fill and outline. */
  selectedTarget: string;
  selectedTargetStroke: string;
  /** Stale-reading target tint (paired with reduced opacity, a non-color signal). */
  stale: string;
  /** Target callsign labels. */
  label: string;
  /** Trail polylines. */
  trail: string;
  /** Reserved for the future prediction/velocity vector layer. */
  prediction: string;
  /** Selection bracket stroke. */
  selectionBracket: string;
  /** Drop-shadow glow radius in px; 0 disables glow. */
  glow: number;
};

/**
 * Tactical: dark navy scope with cyan/teal geometry and green targets —
 * the base App.css palette, now expressed as the default theme.
 */
const TACTICAL_THEME: RadarTheme = {
  background: '#06141d',
  rings: '#238a94',
  grid: '#20636e',
  compass: '#65cbd2',
  center: '#f4d35e',
  sweep: '#51e6aa',
  sweepOpacity: 0.13,
  sweepDurationMs: 5000,
  normalTarget: '#55ed9a',
  normalTargetStroke: '#c9ffe2',
  advisory: '#5ed7ff',
  warning: '#f4d35e',
  critical: '#ff5e68',
  selectedTarget: '#f4d35e',
  selectedTargetStroke: '#fff4b0',
  stale: '#8fa9a0',
  label: '#a4e9b9',
  trail: '#42c9a0',
  prediction: '#7ee8f3',
  selectionBracket: '#f4d35e',
  glow: 0,
};

/**
 * Mission Control: reuses the existing MARIA mission-control design
 * tokens so the shipped command-center look is preserved exactly, with
 * a more restrained (lower-opacity) sweep.
 */
const MISSION_CONTROL_THEME: RadarTheme = {
  background: 'transparent',
  rings: 'var(--maria-primary)',
  grid: 'var(--maria-border)',
  compass: 'var(--maria-primary)',
  center: 'var(--maria-caution)',
  sweep: 'var(--maria-active)',
  sweepOpacity: 0.08,
  sweepDurationMs: 6000,
  normalTarget: 'var(--maria-active)',
  normalTargetStroke: 'var(--maria-text)',
  advisory: 'var(--maria-primary)',
  warning: 'var(--maria-caution)',
  critical: 'var(--maria-critical)',
  selectedTarget: 'var(--maria-caution)',
  selectedTargetStroke: 'var(--maria-text)',
  stale: 'var(--maria-text-muted)',
  label: 'var(--maria-text)',
  trail: 'var(--maria-active)',
  prediction: 'var(--maria-primary)',
  selectionBracket: 'var(--maria-caution)',
  glow: 0,
};

/**
 * Classic: monochrome green phosphor. Critical stays red for safety
 * clarity per the checkpoint brief; everything else is green with a
 * restrained glow and a faster, brighter sweep.
 */
const CLASSIC_THEME: RadarTheme = {
  background: '#020a04',
  rings: '#1f7a34',
  grid: '#12351d',
  compass: '#3bd968',
  center: '#7dffa4',
  sweep: '#3bff77',
  sweepOpacity: 0.22,
  sweepDurationMs: 4000,
  normalTarget: '#33d15f',
  normalTargetStroke: '#0a1f0f',
  advisory: '#2f9b4c',
  warning: '#f0b429',
  critical: '#ff4d4d',
  selectedTarget: '#c8ffd6',
  selectedTargetStroke: '#eafff0',
  stale: '#1f5c30',
  label: '#5be089',
  trail: '#2aa84a',
  prediction: '#7dffa4',
  selectionBracket: '#c8ffd6',
  glow: 2,
};

export const RADAR_THEMES: Record<RadarRenderMode, RadarTheme> = {
  tactical: TACTICAL_THEME,
  'mission-control': MISSION_CONTROL_THEME,
  classic: CLASSIC_THEME,
  // Placeholders reuse Tactical until their modes are implemented.
  presentation: TACTICAL_THEME,
  minimal: TACTICAL_THEME,
};

/** CSS custom-property names consumed by the radar layer stylesheet. */
export const RADAR_THEME_VARS = {
  background: '--radar-scope-bg',
  rings: '--radar-ring',
  grid: '--radar-axis',
  compass: '--radar-compass',
  center: '--radar-center',
  sweep: '--radar-sweep-fill',
  sweepOpacity: '--radar-sweep-opacity',
  sweepDurationMs: '--radar-sweep-duration',
  normalTarget: '--radar-target',
  normalTargetStroke: '--radar-target-stroke',
  advisory: '--radar-advisory',
  warning: '--radar-warning',
  critical: '--radar-critical',
  selectedTarget: '--radar-selected',
  selectedTargetStroke: '--radar-selected-stroke',
  stale: '--radar-stale',
  label: '--radar-label',
  trail: '--radar-trail',
  prediction: '--radar-prediction',
  selectionBracket: '--radar-selection-bracket',
  glow: '--radar-glow',
} as const;

export function getRadarTheme(mode: RadarRenderMode): RadarTheme {
  return RADAR_THEMES[mode];
}

/**
 * Converts a mode's theme into the inline CSS custom properties applied
 * at the radar console root. Numeric values that feed a CSS length gain
 * their unit here (`ms`, `px`); opacity stays unitless.
 */
export function radarThemeToCssVars(
  mode: RadarRenderMode
): Record<string, string> {
  const theme = RADAR_THEMES[mode];
  return {
    [RADAR_THEME_VARS.background]: theme.background,
    [RADAR_THEME_VARS.rings]: theme.rings,
    [RADAR_THEME_VARS.grid]: theme.grid,
    [RADAR_THEME_VARS.compass]: theme.compass,
    [RADAR_THEME_VARS.center]: theme.center,
    [RADAR_THEME_VARS.sweep]: theme.sweep,
    [RADAR_THEME_VARS.sweepOpacity]: String(theme.sweepOpacity),
    [RADAR_THEME_VARS.sweepDurationMs]: `${theme.sweepDurationMs}ms`,
    [RADAR_THEME_VARS.normalTarget]: theme.normalTarget,
    [RADAR_THEME_VARS.normalTargetStroke]: theme.normalTargetStroke,
    [RADAR_THEME_VARS.advisory]: theme.advisory,
    [RADAR_THEME_VARS.warning]: theme.warning,
    [RADAR_THEME_VARS.critical]: theme.critical,
    [RADAR_THEME_VARS.selectedTarget]: theme.selectedTarget,
    [RADAR_THEME_VARS.selectedTargetStroke]: theme.selectedTargetStroke,
    [RADAR_THEME_VARS.stale]: theme.stale,
    [RADAR_THEME_VARS.label]: theme.label,
    [RADAR_THEME_VARS.trail]: theme.trail,
    [RADAR_THEME_VARS.prediction]: theme.prediction,
    [RADAR_THEME_VARS.selectionBracket]: theme.selectionBracket,
    [RADAR_THEME_VARS.glow]: `${theme.glow}px`,
  };
}

export function radarModeClassName(mode: RadarRenderMode): string {
  return `radar-mode-${mode}`;
}
