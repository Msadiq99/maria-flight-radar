import type { RadarLayerProps } from './types';

export function LabelLayer({ scene }: RadarLayerProps) {
  return (
    <>
      {scene.targets
        .filter((target) => target.visible && target.labelVisible)
        .map((target) => (
          <text
            key={target.id}
            className="radar-target-label"
            transform={`translate(${target.projectedX} ${target.projectedY})`}
            x="9"
            y="4"
          >
            {target.callsign || target.id}
          </text>
        ))}
    </>
  );
}
