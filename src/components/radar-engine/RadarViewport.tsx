import { Fragment, useMemo } from 'react';
import type {
  RadarLayerId,
  RadarRenderProfile,
  RadarScene,
} from '../../lib/radar-engine/types';
import { applyRenderProfile } from '../../lib/radar-engine/applyRenderProfile';
import type { RadarOverlaySlot } from '../../lib/radar-engine/overlays';
import {
  AlertZoneLayer,
  BackgroundLayer,
  GridLayer,
  LabelLayer,
  AircraftLayer,
  OverlayLayer,
  RangeRingLayer,
  SelectionLayer,
  SweepLayer,
  TrailLayer,
} from './layers';
import { RadarOverlayHost } from './RadarOverlayHost';

type RenderStep =
  | { type: 'layer'; id: RadarLayerId }
  | { type: 'overlay'; slot: RadarOverlaySlot };

/**
 * Fixed render order (Phase 10) — never depends on the active mode. The
 * four overlay slots are interleaved at stable z-positions between the
 * core layers; they render nothing until overlay plugins are active.
 */
const RENDER_STEPS: RenderStep[] = [
  { type: 'layer', id: 'background' },
  { type: 'layer', id: 'grid' },
  { type: 'overlay', slot: 'below-rings' },
  { type: 'layer', id: 'map' },
  { type: 'layer', id: 'rangeRing' },
  { type: 'layer', id: 'sweep' },
  { type: 'layer', id: 'alertZone' },
  { type: 'overlay', slot: 'below-targets' },
  { type: 'layer', id: 'trail' },
  { type: 'layer', id: 'prediction' },
  { type: 'layer', id: 'aircraft' },
  { type: 'overlay', slot: 'above-targets' },
  { type: 'layer', id: 'leaderLine' },
  { type: 'layer', id: 'label' },
  { type: 'layer', id: 'selection' },
  { type: 'layer', id: 'overlay' },
  { type: 'overlay', slot: 'system-overlay' },
];

export function RadarViewport({
  scene,
  profile,
  paused,
  showLabels,
  showTrails,
  onSelectTarget,
}: {
  scene: RadarScene;
  profile: RadarRenderProfile;
  paused: boolean;
  showLabels: boolean;
  showTrails: boolean;
  onSelectTarget: (id: string) => void;
}) {
  // Single point where profile density caps (target/label/trail) are
  // enforced, before any layer renders. Pure and memoized; never mutates
  // the source scene.
  const renderScene = useMemo(
    () => applyRenderProfile(scene, profile),
    [scene, profile]
  );
  const enabled = new Set(profile.visibleLayers);
  const r = renderScene.viewport.radius;

  function baseLayer(layerId: RadarLayerId) {
    if (!enabled.has(layerId)) return null;
    switch (layerId) {
      case 'background':
        return <BackgroundLayer scene={renderScene} profile={profile} />;
      case 'grid':
        return <GridLayer scene={renderScene} profile={profile} />;
      case 'rangeRing':
        return <RangeRingLayer scene={renderScene} profile={profile} />;
      case 'sweep':
        return <SweepLayer scene={renderScene} profile={profile} />;
      case 'alertZone':
        return <AlertZoneLayer scene={renderScene} profile={profile} />;
      case 'trail':
        return showTrails ? (
          <TrailLayer scene={renderScene} profile={profile} />
        ) : null;
      case 'aircraft':
        return (
          <AircraftLayer
            scene={renderScene}
            profile={profile}
            onSelect={onSelectTarget}
          />
        );
      case 'label':
        return showLabels ? (
          <LabelLayer scene={renderScene} profile={profile} />
        ) : null;
      case 'selection':
        return <SelectionLayer scene={renderScene} profile={profile} />;
      case 'overlay':
        return <OverlayLayer scene={renderScene} profile={profile} />;
      default:
        return null;
    }
  }

  // Formalized overlay insertion points sit at stable positions between
  // the core layers. Overlay hosts render nothing with the shipped
  // defaults; they are the extension seam for future overlay plugins.
  return (
    <svg
      className={`radar-scope ${paused ? 'is-paused' : ''}`}
      viewBox={`-${r + 30} -${r + 30} ${2 * (r + 30)} ${2 * (r + 30)}`}
      role="img"
      aria-label={`${renderScene.statistics.visibleCount} of ${renderScene.statistics.totalCount} aircraft visible`}
    >
      {RENDER_STEPS.map((step) =>
        step.type === 'layer' ? (
          <Fragment key={`layer-${step.id}`}>{baseLayer(step.id)}</Fragment>
        ) : (
          <RadarOverlayHost
            key={`overlay-${step.slot}`}
            slot={step.slot}
            scene={renderScene}
            profile={profile}
          />
        )
      )}
    </svg>
  );
}
