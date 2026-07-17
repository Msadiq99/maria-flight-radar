import { useEffect, useState } from 'react';
import { API_BASE_URL, POLL_INTERVAL_MS } from './config';

export type AircraftTraffic = {
  id: string;
  callsign: string;
  tail_number: string;
  aircraft_type: string;
  airline: string;
  origin: string;
  destination: string;
  lat: number;
  lon: number;
  altitude_m: number;
  velocity_kmph: number;
  heading_deg: number;
  vertical_rate_mps: number;
  source: TrafficSource;
  updated_at: number;
};

export type TrafficSource = 'mock' | 'opensky' | 'local_adsb' | 'simulation';
export type HybridSource =
  'auto' | 'hybrid' | 'opensky' | 'local_adsb' | 'simulation';

export type SourceHealth = {
  source: 'opensky' | 'local_adsb' | 'simulation';
  enabled: boolean;
  status: 'healthy' | 'degraded' | 'offline' | 'unconfigured';
  aircraftCount: number;
  message?: string | null;
};

export type TrafficFeed = {
  source: TrafficSource | HybridSource;
  requested_source: TrafficSource | HybridSource;
  updated_at: number;
  aircraft: AircraftTraffic[];
  sourceHealth?: SourceHealth[];
  effectiveSources?: string[];
  nextRefreshSeconds?: number;
};

const EMPTY_FEED: TrafficFeed = {
  source: 'mock',
  requested_source: 'mock',
  updated_at: 0,
  aircraft: [],
};

const EMPTY_HEALTH: SourceHealth[] = [];

type RadarSnapshotTrack = {
  id: string;
  icao24: string;
  callsign: string | null;
  registration?: string | null;
  aircraftType?: string | null;
  latitude: number;
  longitude: number;
  altitudeMeters: number | null;
  groundSpeedMps: number | null;
  headingDegrees: number | null;
  verticalRateMps: number | null;
  source: TrafficSource;
  receivedAt: string;
};

type RadarSnapshot = {
  activeSourceMode?: HybridSource;
  generatedAt: string;
  aircraft: RadarSnapshotTrack[];
  sourceHealth?: SourceHealth[];
  effectiveSources?: TrafficSource[];
  nextRefreshSeconds?: number;
};

export function snapshotToTrafficFeed(
  snapshot: RadarSnapshot,
  mode: HybridSource
): TrafficFeed {
  return {
    source: snapshot.effectiveSources?.[0] || 'simulation',
    requested_source: snapshot.activeSourceMode || mode,
    updated_at: Date.parse(snapshot.generatedAt),
    aircraft: snapshot.aircraft.map((track) => ({
      id: track.icao24 || track.id,
      callsign: track.callsign || track.icao24 || track.id,
      tail_number: track.registration || track.icao24 || '',
      aircraft_type: track.aircraftType || '',
      airline: '',
      origin: '',
      destination: '',
      lat: track.latitude,
      lon: track.longitude,
      altitude_m: track.altitudeMeters || 0,
      velocity_kmph: (track.groundSpeedMps || 0) * 3.6,
      heading_deg: track.headingDegrees || 0,
      vertical_rate_mps: track.verticalRateMps || 0,
      source: track.source,
      updated_at: Date.parse(track.receivedAt),
    })),
    sourceHealth: snapshot.sourceHealth || EMPTY_HEALTH,
    effectiveSources: snapshot.effectiveSources || [],
    nextRefreshSeconds: snapshot.nextRefreshSeconds || 10,
  };
}

async function fetchNearbyTraffic(
  lat: number,
  lon: number,
  radiusKm: number,
  mode: HybridSource,
  signal: AbortSignal
): Promise<TrafficFeed> {
  const res = await fetch(
    `${API_BASE_URL}/api/radar/snapshot?lat=${lat}&lon=${lon}&rangeKm=${radiusKm}&mode=${mode}`,
    { signal }
  );
  if (!res.ok) {
    throw new Error(`backend returned ${res.status}`);
  }
  const snapshot = await res.json();
  return snapshotToTrafficFeed(snapshot, mode);
}

export function useNearbyTraffic(
  lat: number | null,
  lon: number | null,
  radiusKm: number,
  mode: HybridSource = 'auto'
) {
  const [feed, setFeed] = useState<TrafficFeed>(EMPTY_FEED);
  const [unreachable, setUnreachable] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [trails, setTrails] = useState<Record<string, [number, number][]>>({});

  useEffect(() => {
    if (lat === null || lon === null) {
      setFeed(EMPTY_FEED);
      setUnreachable(false);
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;
    let controller: AbortController | undefined;
    const centerLat = lat;
    const centerLon = lon;
    const radius = radiusKm;

    async function poll() {
      controller = new AbortController();
      try {
        const nearbyFeed = await fetchNearbyTraffic(
          centerLat,
          centerLon,
          radius,
          mode,
          controller.signal
        );
        if (!cancelled) {
          setFeed(nearbyFeed);
          setTrails((current) => {
            const next = { ...current };
            for (const item of nearbyFeed.aircraft) {
              const point: [number, number] = [item.lat, item.lon];
              next[item.id] = [...(next[item.id] || []), point].slice(-30);
            }
            return next;
          });
          setUnreachable(false);
        }
      } catch (error) {
        if (
          !cancelled &&
          !(error instanceof DOMException && error.name === 'AbortError')
        ) {
          setUnreachable(true);
        }
      } finally {
        if (!cancelled) {
          timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS * 2);
        }
      }
    }

    poll();
    return () => {
      cancelled = true;
      controller?.abort();
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [lat, lon, radiusKm, mode]);

  useEffect(() => {
    const tickId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tickId);
  }, []);

  const stale =
    feed.updated_at > 0 && now - feed.updated_at > POLL_INTERVAL_MS * 6;

  return {
    aircraft: feed.aircraft,
    feed,
    unreachable,
    stale,
    trails,
    sourceHealth:
      (feed as TrafficFeed & { sourceHealth?: SourceHealth[] }).sourceHealth ||
      EMPTY_HEALTH,
  };
}
