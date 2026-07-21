import type { RadarRenderMode } from '../../../lib/radar-engine/types';
import { TacticalRadarMode } from './TacticalRadarMode';
import { MissionControlRadarMode } from './MissionControlRadarMode';
import { ClassicRadarMode } from './ClassicRadarMode';
import { PresentationRadarMode } from './PresentationRadarMode';
import { MinimalEmbeddedRadarMode } from './MinimalEmbeddedRadarMode';
import type { RadarModeProps } from './types';

/**
 * Dispatches to the active render-mode component. `mode` must already be
 * resolved to an implemented mode (see resolveRadarRenderMode); any
 * unknown value falls through to Tactical so the viewport can never
 * render blank.
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
    case 'presentation':
      return <PresentationRadarMode {...props} />;
    case 'minimal':
      return <MinimalEmbeddedRadarMode {...props} />;
    case 'tactical':
    default:
      return <TacticalRadarMode {...props} />;
  }
}
