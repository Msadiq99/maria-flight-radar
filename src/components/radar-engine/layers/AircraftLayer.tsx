import type { RadarLayerProps } from './types';

export function AircraftLayer({
  scene,
  onSelect,
}: RadarLayerProps & { onSelect: (id: string) => void }) {
  return (
    <>
      {scene.targets
        .filter((target) => target.visible)
        .map((target) => (
          <g
            key={target.id}
            className={`radar-target is-zone-${target.alertState} ${target.selected ? 'is-selected' : ''} ${target.freshness === 'stale' ? 'is-stale' : ''}`}
            transform={`translate(${target.projectedX} ${target.projectedY}) rotate(${target.heading})`}
            onClick={() => onSelect(target.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(target.id);
              }
            }}
            tabIndex={0}
            role="button"
            aria-pressed={target.selected}
            aria-label={`Select ${target.callsign || target.id}`}
          >
            <path d="M0-10L5 7L0 4L-5 7Z" />
          </g>
        ))}
    </>
  );
}
