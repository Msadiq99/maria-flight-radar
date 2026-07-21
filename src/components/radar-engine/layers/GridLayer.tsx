import type { RadarLayerProps } from './types';

export function GridLayer({ scene }: RadarLayerProps) {
  const r = scene.viewport.radius;
  return (
    <>
      <path className="radar-axis" d={`M-${r} 0H${r}M0-${r}V${r}`} />
      <text className="radar-direction" x="-5" y={-r - 10}>
        N
      </text>
      <text className="radar-direction" x={r + 8} y="5">
        E
      </text>
      <text className="radar-direction" x="-5" y={r + 20}>
        S
      </text>
      <text className="radar-direction" x={-r - 20} y="5">
        W
      </text>
    </>
  );
}
