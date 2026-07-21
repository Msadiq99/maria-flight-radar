import type { RadarOverlayPlugin } from './types';

/**
 * Per-overlay enablement flags. Every planned overlay defaults to false —
 * nothing is exposed to normal users until a capability and an
 * implementation exist. Flags are a plain map so they can later be
 * persisted or driven by an internal/debug settings surface without
 * changing this contract.
 */
export type RadarOverlayFeatureFlags = Readonly<Record<string, boolean>>;

/** All overlays disabled. The only default the production build ships. */
export const DEFAULT_OVERLAY_FLAGS: RadarOverlayFeatureFlags = Object.freeze(
  {}
);

export function isOverlayFlagEnabled(
  id: string,
  flags: RadarOverlayFeatureFlags = DEFAULT_OVERLAY_FLAGS
): boolean {
  return flags[id] === true;
}

/**
 * An overlay is considered "flag-enabled" only if it is implemented and
 * either enabled by default or explicitly turned on. Planned overlays
 * (implemented: false) can never be flag-enabled.
 */
export function isOverlayEnabled(
  plugin: RadarOverlayPlugin,
  flags: RadarOverlayFeatureFlags = DEFAULT_OVERLAY_FLAGS
): boolean {
  if (!plugin.implemented) return false;
  return plugin.enabledByDefault || isOverlayFlagEnabled(plugin.id, flags);
}
