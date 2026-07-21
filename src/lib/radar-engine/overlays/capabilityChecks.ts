import type { RadarOverlayCapability, RadarOverlayPlugin } from './types';

/**
 * Data capabilities currently available to the renderer. Empty: the
 * current build has no weather, airport, coverage, history, airspace,
 * route, or media data source, so no overlay's requirements can be met.
 */
export const DEFAULT_AVAILABLE_CAPABILITIES: readonly RadarOverlayCapability[] =
  Object.freeze([]);

export function hasCapabilities(
  required: readonly RadarOverlayCapability[],
  available: readonly RadarOverlayCapability[] = DEFAULT_AVAILABLE_CAPABILITIES
): boolean {
  return required.every((capability) => available.includes(capability));
}

/** True only if every capability an overlay requires is available. */
export function overlayCapabilitiesMet(
  plugin: RadarOverlayPlugin,
  available: readonly RadarOverlayCapability[] = DEFAULT_AVAILABLE_CAPABILITIES
): boolean {
  return hasCapabilities(plugin.requiredCapabilities, available);
}
