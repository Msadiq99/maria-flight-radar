import type { RadarLayerProps } from './types';

export function BackgroundLayer({ scene }: RadarLayerProps) {
  return (
    <>
      <circle className="radar-boundary" r={scene.viewport.radius} />
      <circle className="radar-center" r="5" />
    </>
  );
}
