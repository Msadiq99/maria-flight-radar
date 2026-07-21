import type { ReactNode } from 'react';
import type { RadarRenderMode, RadarScene } from '../types';

/**
 * Named data capabilities an overlay may require before it can render.
 * None of these are available in the current build — every planned
 * overlay stays inactive until its capability is provided by a real
 * data source. Capability names are contracts, not implementations.
 */
export type RadarOverlayCapability =
  | 'weather-data'
  | 'airport-database'
  | 'receiver-coverage'
  | 'historical-snapshots'
  | 'airspace-boundaries'
  | 'route-intelligence'
  | 'aircraft-media';

/**
 * Fixed insertion points in the layer stack. Their order relative to the
 * core layers is stable (see RADAR_OVERLAY_SLOT_ORDER); overlays never
 * reorder the base radar layers.
 */
export type RadarOverlaySlot =
  'below-rings' | 'below-targets' | 'above-targets' | 'system-overlay';

export type RadarOverlayLegendItem = {
  readonly label: string;
  readonly color?: string;
  readonly symbol?: string;
};

export type RadarOverlaySettingsField = {
  readonly key: string;
  readonly label: string;
  readonly type: 'boolean' | 'number' | 'enum' | 'string';
  readonly defaultValue?: boolean | number | string | null;
  readonly options?: readonly string[];
};

export type RadarOverlayDataFreshnessPolicy = {
  /** Maximum tolerated data age in ms; null means "not time-sensitive / not yet defined". */
  readonly maxAgeMs: number | null;
  readonly note: string;
};

/**
 * Context handed to an overlay's renderer. Overlays receive the DERIVED
 * render scene (post applyRenderProfile) as read-only data. They must not
 * fetch data or mutate the scene — the type enforces read-only access.
 */
export type RadarOverlayRenderContext = {
  readonly scene: Readonly<RadarScene>;
  readonly mode: RadarRenderMode;
};

/**
 * A radar overlay plugin. Planned overlays are declared with
 * `implemented: false`, `enabledByDefault: false`, and no `renderLayer`,
 * so they can be described in docs/registries while rendering nothing and
 * staying hidden from normal production UI.
 */
export type RadarOverlayPlugin = {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly slot: RadarOverlaySlot;
  readonly zIndex: number;
  readonly implemented: boolean;
  readonly enabledByDefault: boolean;
  readonly supportedModes: readonly RadarRenderMode[];
  readonly requiredCapabilities: readonly RadarOverlayCapability[];
  readonly legendItems: readonly RadarOverlayLegendItem[];
  readonly settingsSchema: readonly RadarOverlaySettingsField[];
  readonly dataFreshnessPolicy: RadarOverlayDataFreshnessPolicy;
  /**
   * Present only once an overlay is implemented. Pure: derives SVG/React
   * output from the read-only context. Absent for planned overlays.
   */
  readonly renderLayer?: (context: RadarOverlayRenderContext) => ReactNode;
};

/** z-order of overlay slots relative to the core radar layers. */
export const RADAR_OVERLAY_SLOT_ORDER: Record<RadarOverlaySlot, number> = {
  // Just above background/grid, beneath range rings.
  'below-rings': 10,
  // Above rings/sweep/alert-zones, beneath aircraft symbols.
  'below-targets': 40,
  // Above aircraft symbols, beneath labels/selection.
  'above-targets': 60,
  // Topmost, above everything (status/cinematic overlays).
  'system-overlay': 90,
};

export const RADAR_OVERLAY_SLOTS: readonly RadarOverlaySlot[] = [
  'below-rings',
  'below-targets',
  'above-targets',
  'system-overlay',
];
