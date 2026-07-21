import { TACTICAL_PROFILE } from '../../../lib/radar-engine/renderProfiles';
import type { RadarScene } from '../../../lib/radar-engine/types';
import { RadarViewport } from '../RadarViewport';

/**
 * Default everyday operational radar: dark navy/cyan geometry, moderate
 * animation, restrained alert coloring. This is the direct successor to
 * today's single radar scope render.
 */
export function TacticalRadarMode({
  scene,
  paused,
  showLabels,
  showTrails,
  onSelectTarget,
}: {
  scene: RadarScene;
  paused: boolean;
  showLabels: boolean;
  showTrails: boolean;
  onSelectTarget: (id: string) => void;
}) {
  return (
    <RadarViewport
      scene={scene}
      profile={TACTICAL_PROFILE}
      paused={paused}
      showLabels={showLabels}
      showTrails={showTrails}
      onSelectTarget={onSelectTarget}
    />
  );
}
