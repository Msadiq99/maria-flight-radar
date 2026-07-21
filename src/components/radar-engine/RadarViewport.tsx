import { useMemo } from 'react';
import type {
  RadarLayerId,
  RadarRenderProfile,
  RadarScene,
} from '../../lib/radar-engine/types';
import { applyRenderProfile } from '../../lib/radar-engine/applyRenderProfile';
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

/** Fixed z-order per Phase 10 — a layer's position here never depends on the active mode. */
const LAYER_ORDER: RadarLayerId[] = [
  'background',
  'grid',
  'map',
  'rangeRing',
  'sweep',
  'alertZone',
  'trail',
  'prediction',
  'aircraft',
  'leaderLine',
  'label',
  'selection',
  'overlay',
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

  return (
    <svg
      className={`radar-scope ${paused ? 'is-paused' : ''}`}
      viewBox={`-${r + 30} -${r + 30} ${2 * (r + 30)} ${2 * (r + 30)}`}
      role="img"
      aria-label={`${renderScene.statistics.visibleCount} of ${renderScene.statistics.totalCount} aircraft visible`}
    >
      {LAYER_ORDER.map((layerId) => {
        if (!enabled.has(layerId)) return null;
        switch (layerId) {
          case 'background':
            return (
              <BackgroundLayer
                key={layerId}
                scene={renderScene}
                profile={profile}
              />
            );
          case 'grid':
            return (
              <GridLayer key={layerId} scene={renderScene} profile={profile} />
            );
          case 'rangeRing':
            return (
              <RangeRingLayer
                key={layerId}
                scene={renderScene}
                profile={profile}
              />
            );
          case 'sweep':
            return (
              <SweepLayer key={layerId} scene={renderScene} profile={profile} />
            );
          case 'alertZone':
            return (
              <AlertZoneLayer
                key={layerId}
                scene={renderScene}
                profile={profile}
              />
            );
          case 'trail':
            return showTrails ? (
              <TrailLayer key={layerId} scene={renderScene} profile={profile} />
            ) : null;
          case 'aircraft':
            return (
              <AircraftLayer
                key={layerId}
                scene={renderScene}
                profile={profile}
                onSelect={onSelectTarget}
              />
            );
          case 'label':
            return showLabels ? (
              <LabelLayer key={layerId} scene={renderScene} profile={profile} />
            ) : null;
          case 'selection':
            return (
              <SelectionLayer
                key={layerId}
                scene={renderScene}
                profile={profile}
              />
            );
          case 'overlay':
            return (
              <OverlayLayer
                key={layerId}
                scene={renderScene}
                profile={profile}
              />
            );
          default:
            return null;
        }
      })}
    </svg>
  );
}
