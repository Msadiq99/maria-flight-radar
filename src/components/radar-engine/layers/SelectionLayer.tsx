import type { RadarLayerProps } from './types';

const BRACKET_SIZE = 15;

export function SelectionLayer({ scene }: RadarLayerProps) {
  const selected = scene.targets.find(
    (target) => target.selected && target.visible
  );
  if (!selected) return null;
  const s = BRACKET_SIZE;
  return (
    <g
      className="radar-selection-bracket"
      transform={`translate(${selected.projectedX} ${selected.projectedY})`}
      aria-hidden="true"
    >
      <path
        d={`M ${-s} ${-(s + 4)} h 6 M ${-s} ${-(s + 4)} v 6 M ${s} ${-(s + 4)} h -6 M ${s} ${-(s + 4)} v 6 M ${-s} ${s + 4} h 6 M ${-s} ${s + 4} v -6 M ${s} ${s + 4} h -6 M ${s} ${s + 4} v -6`}
      />
    </g>
  );
}
