import type { RadarScene } from '../../../lib/radar-engine/types';

/**
 * Shared props for every render-mode component. Modes are rendering-only
 * consumers of the shared scene — they receive the already-built
 * RadarScene and interaction callbacks, never data-fetching concerns.
 */
export type RadarModeProps = {
  scene: RadarScene;
  paused: boolean;
  showLabels: boolean;
  showTrails: boolean;
  onSelectTarget: (id: string) => void;
};
