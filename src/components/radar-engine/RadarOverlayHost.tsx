import type {
  RadarRenderProfile,
  RadarScene,
} from '../../lib/radar-engine/types';
import {
  selectOverlaysForSlot,
  type RadarOverlaySlot,
} from '../../lib/radar-engine/overlays';

/**
 * Renders the active overlay plugins for one slot. Overlays receive the
 * DERIVED render scene as read-only data and cannot fetch data or mutate
 * it. With the shipped defaults (no flags on, no capabilities available,
 * nothing implemented) `selectOverlaysForSlot` returns an empty list, so
 * this renders nothing — the slot is a stable, formalized insertion point
 * for future overlays, not a live feature.
 */
export function RadarOverlayHost({
  slot,
  scene,
  profile,
}: {
  slot: RadarOverlaySlot;
  scene: RadarScene;
  profile: RadarRenderProfile;
}) {
  const overlays = selectOverlaysForSlot(slot, profile.id);
  if (overlays.length === 0) return null;
  return (
    <g className={`radar-overlay-slot is-${slot}`} aria-hidden="true">
      {overlays.map((plugin) => (
        <g key={plugin.id} data-overlay={plugin.id}>
          {plugin.renderLayer?.({ scene, mode: profile.id })}
        </g>
      ))}
    </g>
  );
}
