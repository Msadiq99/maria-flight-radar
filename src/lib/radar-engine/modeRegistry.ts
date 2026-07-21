import {
  CLASSIC_PROFILE,
  MINIMAL_PROFILE,
  MISSION_CONTROL_PROFILE,
  PRESENTATION_PROFILE,
  TACTICAL_PROFILE,
} from './renderProfiles';
import type { RadarRenderMode, RadarRenderProfile } from './types';

export const RADAR_RENDER_MODES: Record<RadarRenderMode, RadarRenderProfile> = {
  tactical: TACTICAL_PROFILE,
  'mission-control': MISSION_CONTROL_PROFILE,
  classic: CLASSIC_PROFILE,
  presentation: PRESENTATION_PROFILE,
  minimal: MINIMAL_PROFILE,
};

export const DEFAULT_RADAR_RENDER_MODE: RadarRenderMode = 'tactical';

export const RADAR_RENDER_MODE_PREFERENCE_KEY = 'maria.radar.renderMode';

export function isRadarRenderMode(value: unknown): value is RadarRenderMode {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(RADAR_RENDER_MODES, value)
  );
}

export function getRenderProfile(mode: RadarRenderMode): RadarRenderProfile {
  return RADAR_RENDER_MODES[mode];
}

/** Only implemented modes may be offered to users; unfinished modes stay hidden. */
export function listImplementedModes(): RadarRenderProfile[] {
  return Object.values(RADAR_RENDER_MODES).filter(
    (profile) => profile.implemented
  );
}

/**
 * Resolves a stored/URL-provided mode id to a safe, implemented mode.
 * Falls back to the default rather than throwing on invalid or
 * not-yet-implemented values, per the "must not crash" requirement.
 */
export function resolveRadarRenderMode(value: unknown): RadarRenderMode {
  if (isRadarRenderMode(value) && RADAR_RENDER_MODES[value].implemented) {
    return value;
  }
  return DEFAULT_RADAR_RENDER_MODE;
}

export function loadStoredRadarRenderMode(
  storage: Pick<Storage, 'getItem'> | undefined = typeof localStorage ===
  'undefined'
    ? undefined
    : localStorage
): RadarRenderMode {
  if (!storage) return DEFAULT_RADAR_RENDER_MODE;
  try {
    return resolveRadarRenderMode(
      storage.getItem(RADAR_RENDER_MODE_PREFERENCE_KEY)
    );
  } catch {
    return DEFAULT_RADAR_RENDER_MODE;
  }
}

export function saveRadarRenderMode(
  mode: RadarRenderMode,
  storage: Pick<Storage, 'setItem'> | undefined = typeof localStorage ===
  'undefined'
    ? undefined
    : localStorage
) {
  if (!storage) return;
  try {
    storage.setItem(RADAR_RENDER_MODE_PREFERENCE_KEY, mode);
  } catch {
    // Storage may be unavailable (private browsing, quota); mode still works for this session.
  }
}
