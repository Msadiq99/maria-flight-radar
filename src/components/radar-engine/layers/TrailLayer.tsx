import type { RadarLayerProps } from './types';

export function TrailLayer({ scene }: RadarLayerProps) {
  return (
    <>
      {scene.targets
        .filter((target) => target.trailPoints.length > 1)
        .map((target) => (
          <polyline
            key={target.id}
            className="radar-trail"
            points={target.trailPoints
              .map((point) => `${point.x},${point.y}`)
              .join(' ')}
            aria-label={`Trail for ${target.callsign || target.id}`}
          />
        ))}
    </>
  );
}
