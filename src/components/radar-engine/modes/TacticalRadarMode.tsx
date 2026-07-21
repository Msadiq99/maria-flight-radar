import { TACTICAL_PROFILE } from '../../../lib/radar-engine/renderProfiles';
import { RadarViewport } from '../RadarViewport';
import type { RadarModeProps } from './types';

/**
 * Default everyday operational radar: dark navy/cyan geometry, moderate
 * animation, restrained alert coloring. This is the direct successor to
 * today's single radar scope render.
 */
export function TacticalRadarMode(props: RadarModeProps) {
  return <RadarViewport {...props} profile={TACTICAL_PROFILE} />;
}
