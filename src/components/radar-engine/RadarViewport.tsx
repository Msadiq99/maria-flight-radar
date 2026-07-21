import type {
  RadarLayerId,
  RadarRenderProfile,
  RadarScene,
} from '../../lib/radar-engine/types';
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
  const enabled = new Set(profile.visibleLayers);
  const r = scene.viewport.radius;

  return (
    <svg
      className={`radar-scope ${paused ? 'is-paused' : ''}`}
      viewBox={`-${r + 30} -${r + 30} ${2 * (r + 30)} ${2 * (r + 30)}`}
      role="img"
      aria-label={`${scene.statistics.visibleCount} of ${scene.statistics.totalCount} aircraft visible`}
    >
      {LAYER_ORDER.map((layerId) => {
        if (!enabled.has(layerId)) return null;
        switch (layerId) {
          case 'background':
            return (
              <BackgroundLayer key={layerId} scene={scene} profile={profile} />
            );
          case 'grid':
            return <GridLayer key={layerId} scene={scene} profile={profile} />;
          case 'rangeRing':
            return (
              <RangeRingLayer key={layerId} scene={scene} profile={profile} />
            );
          case 'sweep':
            return <SweepLayer key={layerId} scene={scene} profile={profile} />;
          case 'alertZone':
            return (
              <AlertZoneLayer key={layerId} scene={scene} profile={profile} />
            );
          case 'trail':
            return showTrails ? (
              <TrailLayer key={layerId} scene={scene} profile={profile} />
            ) : null;
          case 'aircraft':
            return (
              <AircraftLayer
                key={layerId}
                scene={scene}
                profile={profile}
                onSelect={onSelectTarget}
              />
            );
          case 'label':
            return showLabels ? (
              <LabelLayer key={layerId} scene={scene} profile={profile} />
            ) : null;
          case 'selection':
            return (
              <SelectionLayer key={layerId} scene={scene} profile={profile} />
            );
          case 'overlay':
            return (
              <OverlayLayer key={layerId} scene={scene} profile={profile} />
            );
          default:
            return null;
        }
      })}
    </svg>
  );
}
