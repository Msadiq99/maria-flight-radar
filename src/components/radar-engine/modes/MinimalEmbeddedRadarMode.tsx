import { MINIMAL_PROFILE } from '../../../lib/radar-engine/renderProfiles';
import { RadarViewport } from '../RadarViewport';
import type { RadarModeProps } from './types';

/**
 * Lightweight web preview of the visual language intended for small
 * ESP32 displays. Renders the shared RadarViewport with the Minimal
 * profile, whose target/label/trail caps (12 / 6 / 8) are enforced by
 * the shared applyRenderProfile step — this component adds no cap logic
 * of its own. It is framed at a 320×240-equivalent aspect for preview
 * so the embedded proportions are visible on the web.
 *
 * Firmware rendering is a separate implementation; nothing here is
 * shared executable code with the device. No firmware is changed.
 */
export function MinimalEmbeddedRadarMode(props: RadarModeProps) {
  return (
    <div className="radar-minimal-frame" data-testid="radar-minimal-frame">
      <RadarViewport {...props} profile={MINIMAL_PROFILE} />
    </div>
  );
}
