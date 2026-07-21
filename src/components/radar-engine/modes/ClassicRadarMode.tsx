import { CLASSIC_PROFILE } from '../../../lib/radar-engine/renderProfiles';
import { RadarViewport } from '../RadarViewport';
import type { RadarModeProps } from './types';

/**
 * Traditional monochrome green phosphor radar. Uses the same scene and
 * layer stack as the other modes; the `classic` theme supplies the
 * green palette, a brighter/faster sweep, and a restrained phosphor
 * glow (a small drop-shadow — never a full-screen blur).
 *
 * The sweep is purely decorative: it only changes brightness. Every
 * current target stays rendered and selectable regardless of the beam's
 * angle — no target is ever hidden because the sweep has not reached it.
 */
export function ClassicRadarMode(props: RadarModeProps) {
  return <RadarViewport {...props} profile={CLASSIC_PROFILE} />;
}
