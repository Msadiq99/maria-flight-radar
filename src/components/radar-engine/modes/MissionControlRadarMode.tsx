import { MISSION_CONTROL_PROFILE } from '../../../lib/radar-engine/renderProfiles';
import { RadarViewport } from '../RadarViewport';
import type { RadarModeProps } from './types';

/**
 * Dense desktop command-center view. It renders the same RadarViewport
 * and RadarScene as every other mode; the surrounding operational chrome
 * (control panel, selected-aircraft panel, system status strip) is the
 * existing MARIA mission-control shell provided by RadarScreen, and the
 * `mission-control` theme maps its palette back to the `--maria-*`
 * design tokens. Its sweep is more restrained than Tactical's.
 *
 * All operational values it surfaces (source state, target/visible
 * counts, freshness, backend status, alert count) already exist in the
 * shared scene/telemetry — no receiver-specific metrics are invented.
 */
export function MissionControlRadarMode(props: RadarModeProps) {
  return <RadarViewport {...props} profile={MISSION_CONTROL_PROFILE} />;
}
