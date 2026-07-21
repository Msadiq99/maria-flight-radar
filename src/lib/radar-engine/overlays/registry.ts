import type { RadarRenderMode } from '../types';
import type {
  RadarOverlayCapability,
  RadarOverlayPlugin,
  RadarOverlaySlot,
} from './types';
import {
  DEFAULT_OVERLAY_FLAGS,
  isOverlayEnabled,
  type RadarOverlayFeatureFlags,
} from './featureFlags';
import {
  DEFAULT_AVAILABLE_CAPABILITIES,
  overlayCapabilitiesMet,
} from './capabilityChecks';

const ALL_MODES: readonly RadarRenderMode[] = [
  'tactical',
  'mission-control',
  'classic',
  'presentation',
  'minimal',
];

/**
 * Planned overlays. Every entry is a typed contract only:
 * `implemented: false`, `enabledByDefault: false`, no `renderLayer`, and
 * a required capability that the current build does not provide. They
 * describe intended future features (for docs and extension work) while
 * rendering nothing and staying hidden from normal production UI.
 *
 * Do not add production controls for these, and do not fabricate their
 * data. Turning one on is a future, deliberate step that requires an
 * implementation, a capability source, and a feature flag.
 */
export const PLANNED_RADAR_OVERLAYS: readonly RadarOverlayPlugin[] =
  Object.freeze([
    planned({
      id: 'weather',
      label: 'Weather',
      description: 'Precipitation / cloud overlay behind the radar picture.',
      slot: 'below-rings',
      requiredCapabilities: ['weather-data'],
    }),
    planned({
      id: 'airports',
      label: 'Airports',
      description: 'Nearby airport and runway markers.',
      slot: 'below-targets',
      requiredCapabilities: ['airport-database'],
    }),
    planned({
      id: 'receiver-coverage',
      label: 'Receiver coverage',
      description: 'Estimated coverage footprint of configured receivers.',
      slot: 'below-rings',
      requiredCapabilities: ['receiver-coverage'],
    }),
    planned({
      id: 'heat-map',
      label: 'Heat map',
      description: 'Accumulated traffic-density heat map.',
      slot: 'below-targets',
      requiredCapabilities: ['historical-snapshots'],
    }),
    planned({
      id: 'historical-playback',
      label: 'Historical playback',
      description: 'Replay of recorded radar snapshots over time.',
      slot: 'system-overlay',
      requiredCapabilities: ['historical-snapshots'],
    }),
    planned({
      id: 'airspace-boundaries',
      label: 'Airspace boundaries',
      description: 'Controlled-airspace and boundary outlines.',
      slot: 'below-targets',
      requiredCapabilities: ['airspace-boundaries'],
    }),
    planned({
      id: 'route-projection',
      label: 'Route projection',
      description: 'Projected route/flight-plan intelligence for a target.',
      slot: 'above-targets',
      requiredCapabilities: ['route-intelligence'],
    }),
    planned({
      id: 'aircraft-media',
      label: 'Aircraft photos',
      description: 'Photo/metadata card for the selected aircraft.',
      slot: 'system-overlay',
      requiredCapabilities: ['aircraft-media'],
    }),
  ]);

function planned(config: {
  id: string;
  label: string;
  description: string;
  slot: RadarOverlaySlot;
  requiredCapabilities: readonly RadarOverlayCapability[];
}): RadarOverlayPlugin {
  return {
    ...config,
    zIndex: 0,
    implemented: false,
    enabledByDefault: false,
    supportedModes: ALL_MODES,
    legendItems: [],
    settingsSchema: [],
    dataFreshnessPolicy: {
      maxAgeMs: null,
      note: 'Planned overlay — no data source yet.',
    },
    // No renderLayer: planned overlays render nothing.
  };
}

export function listOverlays(): readonly RadarOverlayPlugin[] {
  return PLANNED_RADAR_OVERLAYS;
}

/**
 * Whether an overlay would actually render, given the active mode,
 * feature flags, and available capabilities. It must be implemented,
 * enabled, support the mode, and have all required capabilities. With the
 * shipped defaults this is always false for every overlay.
 */
export function isOverlayActive(
  plugin: RadarOverlayPlugin,
  mode: RadarRenderMode,
  {
    flags = DEFAULT_OVERLAY_FLAGS,
    capabilities = DEFAULT_AVAILABLE_CAPABILITIES,
  }: {
    flags?: RadarOverlayFeatureFlags;
    capabilities?: readonly RadarOverlayCapability[];
  } = {}
): boolean {
  return (
    plugin.implemented &&
    isOverlayEnabled(plugin, flags) &&
    plugin.supportedModes.includes(mode) &&
    overlayCapabilitiesMet(plugin, capabilities) &&
    typeof plugin.renderLayer === 'function'
  );
}

/** Active overlays for one slot, sorted by zIndex then id for stable order. */
export function selectOverlaysForSlot(
  slot: RadarOverlaySlot,
  mode: RadarRenderMode,
  options: {
    flags?: RadarOverlayFeatureFlags;
    capabilities?: readonly RadarOverlayCapability[];
  } = {}
): readonly RadarOverlayPlugin[] {
  return PLANNED_RADAR_OVERLAYS.filter(
    (plugin) => plugin.slot === slot && isOverlayActive(plugin, mode, options)
  )
    .slice()
    .sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id));
}
