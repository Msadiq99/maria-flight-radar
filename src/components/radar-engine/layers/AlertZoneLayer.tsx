import type { RadarLayerProps } from './types';

const ZONES = ['critical', 'warning', 'advisory'] as const;

export function AlertZoneLayer({ scene }: RadarLayerProps) {
  const r = scene.viewport.radius;
  return (
    <>
      {ZONES.map((zone) => {
        const radiusKm = scene.alertZones[`${zone}Km` as const];
        if (radiusKm > scene.rangeKm) return null;
        return (
          <circle
            key={zone}
            className={`radar-zone-ring is-${zone}`}
            r={(r * radiusKm) / scene.rangeKm}
          />
        );
      })}
    </>
  );
}
