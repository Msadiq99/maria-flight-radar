import type { RadarRenderMode } from '../../../lib/radar-engine/types';
import { TacticalRadarMode } from './TacticalRadarMode';
import { MissionControlRadarMode } from './MissionControlRadarMode';
import { ClassicRadarMode } from './ClassicRadarMode';
import type { RadarModeProps } from './types';

/**
 * Dispatches to the active render-mode component. `mode` must already be
 * resolved to an implemented mode (see resolveRadarRenderMode); any
 * not-yet-implemented value falls through to Tactical so the viewport
 * can never render blank.
 */
export function RadarModeRenderer({
  mode,
  ...props
}: RadarModeProps & { mode: RadarRenderMode }) {
  switch (mode) {
    case 'mission-control':
      return <MissionControlRadarMode {...props} />;
    case 'classic':
      return <ClassicRadarMode {...props} />;
    case 'tactical':
    default:
      return <TacticalRadarMode {...props} />;
  }
}
