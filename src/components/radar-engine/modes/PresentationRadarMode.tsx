import { PRESENTATION_PROFILE } from '../../../lib/radar-engine/renderProfiles';
import { RadarViewport } from '../RadarViewport';
import type { RadarModeProps } from './types';

/**
 * Cinematic 2.5D presentation mode for demos, exhibitions, and captures —
 * not the default operational mode.
 *
 * The 2.5D effect is a pure CSS perspective/tilt applied to a wrapper
 * around the SAME RadarViewport and RadarScene every other mode uses. It
 * changes nothing about target coordinates: positions still derive from
 * the shared scene projection. No WebGL/Three.js, no second scene model,
 * no invented 3D positions or altitude geometry.
 *
 * The tilt is expressed via the `.radar-presentation-stage` class so the
 * reduced-motion media query can drop the camera drift while keeping the
 * static tilted plane and every target/control interactive.
 */
export function PresentationRadarMode(props: RadarModeProps) {
  return (
    <div className="radar-presentation-stage">
      <div className="radar-presentation-plane">
        <RadarViewport {...props} profile={PRESENTATION_PROFILE} />
      </div>
    </div>
  );
}
