export type SourceState = 'DEMO' | 'CACHE' | 'LIVE' | 'OFFLINE';

export function deriveSourceState({
  unreachable,
  stale,
  demo,
}: {
  unreachable: boolean;
  stale: boolean;
  demo: boolean;
}): SourceState {
  if (unreachable) return 'OFFLINE';
  if (stale) return 'CACHE';
  return demo ? 'DEMO' : 'LIVE';
}

export function selectedTargetStateWording(
  zone: string,
  sourceState: SourceState,
  freshness: string
) {
  if (sourceState === 'DEMO') return `${zone} zone · Demo target`;
  if (sourceState === 'CACHE') return `${zone} zone · Cached target`;
  if (sourceState === 'OFFLINE') return `${zone} zone · Source offline`;
  return `${zone} zone · ${freshness}`;
}
