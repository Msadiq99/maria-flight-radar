import { rangeRingValues } from '../../../radarGeometry';
import type { RadarLayerProps } from './types';

export function RangeRingLayer({ scene }: RadarLayerProps) {
  const r = scene.viewport.radius;
  return (
    <>
      {rangeRingValues(scene.rangeKm).map((ring) => (
        <g key={ring}>
          <circle className="radar-ring" r={(r * ring) / scene.rangeKm} />
          <text
            className="radar-range-label"
            x="6"
            y={(-r * ring) / scene.rangeKm + 14}
          >
            {ring} km
          </text>
        </g>
      ))}
    </>
  );
}
