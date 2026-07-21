import type {
  RadarRenderProfile,
  RadarScene,
} from '../../../lib/radar-engine/types';

/**
 * Shared contract every radar layer implements. Layers receive an
 * already-built scene and profile — they must not fetch data, own
 * global state, or recompute projection. Each layer is independently
 * enabled/disabled by whether the mode profile lists its id in
 * visibleLayers, and independently testable in isolation.
 */
export type RadarLayerProps = {
  scene: RadarScene;
  profile: RadarRenderProfile;
};
