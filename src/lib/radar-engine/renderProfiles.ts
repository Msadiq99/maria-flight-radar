import type { RadarLayerId, RadarRenderProfile } from './types';

const TACTICAL_LAYERS: RadarLayerId[] = [
  'background',
  'grid',
  'rangeRing',
  'sweep',
  'alertZone',
  'trail',
  'aircraft',
  'label',
  'selection',
];

/**
 * Future-mode layer stacks are declared now so the registry/UI can
 * describe them, even though only Tactical renders in this checkpoint.
 */
const MISSION_CONTROL_LAYERS: RadarLayerId[] = [...TACTICAL_LAYERS, 'overlay'];
const CLASSIC_LAYERS: RadarLayerId[] = [
  'background',
  'rangeRing',
  'sweep',
  'trail',
  'aircraft',
  'label',
  'selection',
];
// Presentation uses the full implemented stack plus the overlay slot for
// its cinematic status overlay. The prediction/leaderLine layers are not
// yet implemented, so they are intentionally omitted until Checkpoint 5.
const PRESENTATION_LAYERS: RadarLayerId[] = [...TACTICAL_LAYERS, 'overlay'];
const MINIMAL_LAYERS: RadarLayerId[] = [
  'background',
  'rangeRing',
  'aircraft',
  'label',
  'selection',
];

export const TACTICAL_PROFILE: RadarRenderProfile = {
  id: 'tactical',
  label: 'Tactical',
  description: 'Default everyday operational radar with moderate animation.',
  implemented: true,
  density: 'balanced',
  animationLevel: 'moderate',
  visibleLayers: TACTICAL_LAYERS,
  labelsEnabledByDefault: true,
  trailsEnabledByDefault: true,
  predictionEnabledByDefault: true,
  sweepEnabledByDefault: true,
  mapEnabledByDefault: false,
  glowLevel: 'low',
  targetLimit: null,
  labelLimit: null,
  trailPointLimit: 30,
  fpsTarget: 60,
  reducedMotionFallback: 'static',
};

export const MISSION_CONTROL_PROFILE: RadarRenderProfile = {
  id: 'mission-control',
  label: 'Mission Control',
  description: 'Dense desktop command-center layout with telemetry panels.',
  implemented: true,
  density: 'rich',
  animationLevel: 'restrained',
  visibleLayers: MISSION_CONTROL_LAYERS,
  labelsEnabledByDefault: true,
  trailsEnabledByDefault: true,
  predictionEnabledByDefault: true,
  sweepEnabledByDefault: true,
  mapEnabledByDefault: false,
  glowLevel: 'low',
  targetLimit: null,
  labelLimit: null,
  trailPointLimit: 30,
  fpsTarget: 60,
  reducedMotionFallback: 'static',
};

export const CLASSIC_PROFILE: RadarRenderProfile = {
  id: 'classic',
  label: 'Classic Radar',
  description: 'Traditional green phosphor radar with a rotating sweep.',
  implemented: true,
  density: 'compact',
  animationLevel: 'moderate',
  visibleLayers: CLASSIC_LAYERS,
  labelsEnabledByDefault: false,
  trailsEnabledByDefault: true,
  predictionEnabledByDefault: false,
  sweepEnabledByDefault: true,
  mapEnabledByDefault: false,
  glowLevel: 'medium',
  targetLimit: null,
  labelLimit: null,
  trailPointLimit: 20,
  fpsTarget: 30,
  reducedMotionFallback: 'static',
};

export const PRESENTATION_PROFILE: RadarRenderProfile = {
  id: 'presentation',
  label: 'Presentation',
  description: 'Cinematic 2.5D mode for demos, screenshots, and exhibitions.',
  implemented: true,
  density: 'rich',
  animationLevel: 'cinematic',
  visibleLayers: PRESENTATION_LAYERS,
  labelsEnabledByDefault: true,
  trailsEnabledByDefault: true,
  // No prediction/map layers exist yet; keep the hints off so they match
  // what actually renders.
  predictionEnabledByDefault: false,
  sweepEnabledByDefault: true,
  mapEnabledByDefault: false,
  glowLevel: 'high',
  targetLimit: null,
  labelLimit: null,
  trailPointLimit: 40,
  fpsTarget: 60,
  reducedMotionFallback: 'freeze-last-frame',
};

/**
 * Mirrors the visual language planned for ESP32/small touch displays.
 * Web and firmware share this palette of limits and concepts, not
 * rendering code. See docs/MARIA_RADAR_VISUAL_CONTRACT.md (Checkpoint 5).
 */
export const MINIMAL_PROFILE: RadarRenderProfile = {
  id: 'minimal',
  label: 'Minimal Embedded',
  description:
    'Compact, high-contrast preview of the embedded terminal design.',
  implemented: true,
  density: 'compact',
  animationLevel: 'none',
  visibleLayers: MINIMAL_LAYERS,
  labelsEnabledByDefault: false,
  trailsEnabledByDefault: false,
  predictionEnabledByDefault: false,
  sweepEnabledByDefault: false,
  mapEnabledByDefault: false,
  glowLevel: 'none',
  targetLimit: 12,
  labelLimit: 6,
  trailPointLimit: 8,
  fpsTarget: 30,
  reducedMotionFallback: 'static',
};
