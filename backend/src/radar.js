const EARTH_RADIUS_KM = 6371;
const METERS_PER_FOOT = 0.3048;
const MPS_PER_KNOT = 0.514444;
const DEFAULT_CENTER = { latitude: 24.7136, longitude: 46.6753 };
const VALID_SOURCES = new Set(['opensky', 'local_adsb', 'simulation']);
const VALID_MODES = new Set([
  'auto',
  'hybrid',
  'opensky',
  'local_adsb',
  'simulation',
]);

function nowIso() {
  return new Date().toISOString();
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function distanceKm(fromLat, fromLon, toLat, toLon) {
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLon = ((toLon - fromLon) * Math.PI) / 180;
  const lat1 = (fromLat * Math.PI) / 180;
  const lat2 = (toLat * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function bearingDegrees(fromLat, fromLon, toLat, toLon) {
  const lat1 = (fromLat * Math.PI) / 180;
  const lat2 = (toLat * Math.PI) / 180;
  const dLon = ((toLon - fromLon) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function boundingBox(center, rangeKm) {
  const latDelta = rangeKm / 111.32;
  const lonDelta =
    rangeKm /
    (111.32 * Math.max(0.1, Math.cos((center.latitude * Math.PI) / 180)));
  return {
    lamin: clamp(center.latitude - latDelta, -90, 90),
    lamax: clamp(center.latitude + latDelta, -90, 90),
    lomin: clamp(center.longitude - lonDelta, -180, 180),
    lomax: clamp(center.longitude + lonDelta, -180, 180),
  };
}

export function parseRadarQuery(query, env = process.env) {
  const configuredLat = numberOrNull(env.MARIA_RADAR_LATITUDE);
  const configuredLon = numberOrNull(env.MARIA_RADAR_LONGITUDE);
  const latitude =
    numberOrNull(query.lat) ?? configuredLat ?? DEFAULT_CENTER.latitude;
  const longitude =
    numberOrNull(query.lon) ?? configuredLon ?? DEFAULT_CENTER.longitude;
  const maxRange = clamp(numberOrNull(env.MARIA_MAX_RANGE_KM) ?? 250, 1, 500);
  const defaultRange = clamp(
    numberOrNull(env.MARIA_DEFAULT_RANGE_KM) ?? 100,
    1,
    maxRange
  );
  const rangeKm = clamp(
    numberOrNull(query.rangeKm) ?? defaultRange,
    1,
    maxRange
  );
  const mode = VALID_MODES.has(query.mode)
    ? query.mode
    : env.MARIA_SOURCE_MODE || 'auto';
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error('valid lat/lon required');
  }
  return {
    center: { latitude, longitude },
    rangeKm,
    mode: VALID_MODES.has(mode) ? mode : 'auto',
  };
}

function health(source, enabled, status, extra = {}) {
  return {
    source,
    enabled,
    status,
    lastSuccessAt: null,
    lastAttemptAt: null,
    latencyMs: null,
    aircraftCount: 0,
    errorCode: null,
    message: null,
    ...extra,
  };
}

export class OpenSkyTokenManager {
  constructor({ clientId, clientSecret, tokenUrl, fetchImpl = fetch }) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.tokenUrl = tokenUrl;
    this.fetchImpl = fetchImpl;
    this.token = null;
    this.expiresAt = 0;
    this.refreshPromise = null;
  }

  clear() {
    this.token = null;
    this.expiresAt = 0;
  }

  async accessToken() {
    if (this.token && Date.now() < this.expiresAt - 60_000) return this.token;
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this.fetchToken().finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  async fetchToken() {
    if (!this.clientId || !this.clientSecret) {
      throw Object.assign(new Error('OpenSky credentials missing'), {
        code: 'unconfigured',
      });
    }
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });
    const response = await this.fetchImpl(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 400) this.clear();
      throw Object.assign(new Error(`OpenSky token ${response.status}`), {
        code: response.status === 401 ? 'invalid_client' : 'token_error',
      });
    }
    const json = await response.json();
    if (!json.access_token) {
      throw Object.assign(new Error('OpenSky token response malformed'), {
        code: 'malformed_token',
      });
    }
    this.token = json.access_token;
    this.expiresAt = Date.now() + Math.max(60, json.expires_in || 1800) * 1000;
    return this.token;
  }
}

export class OpenSkyClient {
  constructor(config = {}) {
    this.enabled = config.enabled ?? false;
    this.allowAnonymous = config.allowAnonymous ?? false;
    this.baseUrl = config.baseUrl || 'https://opensky-network.org/api';
    this.timeoutMs = config.timeoutMs || 10000;
    this.fetchImpl = config.fetchImpl || fetch;
    this.tokenManager = config.tokenManager;
  }

  async fetchTracks(query) {
    const started = performance.now();
    const lastAttemptAt = nowIso();
    if (!this.enabled) {
      return { tracks: [], health: health('opensky', false, 'unconfigured') };
    }
    try {
      const tracks = await this.requestStates(query);
      return {
        tracks,
        health: health('opensky', true, 'healthy', {
          lastAttemptAt,
          lastSuccessAt: nowIso(),
          latencyMs: Math.round(performance.now() - started),
          aircraftCount: tracks.length,
        }),
      };
    } catch (error) {
      return {
        tracks: [],
        health: health('opensky', true, 'offline', {
          lastAttemptAt,
          latencyMs: Math.round(performance.now() - started),
          errorCode: error.code || 'opensky_error',
          message: error.message,
        }),
      };
    }
  }

  async requestStates(query, retry = true) {
    const box = boundingBox(query.center, query.rangeKm);
    const url = new URL(`${this.baseUrl}/states/all`);
    for (const [key, value] of Object.entries(box)) {
      url.searchParams.set(key, String(value));
    }
    const headers = {};
    if (this.tokenManager) {
      headers.Authorization = `Bearer ${await this.tokenManager.accessToken()}`;
    } else if (!this.allowAnonymous) {
      throw Object.assign(new Error('OpenSky unconfigured'), {
        code: 'unconfigured',
      });
    }
    const response = await this.fetchImpl(url, {
      headers,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (response.status === 401 && retry && this.tokenManager) {
      this.tokenManager.clear();
      return this.requestStates(query, false);
    }
    if (!response.ok) {
      throw Object.assign(new Error(`OpenSky HTTP ${response.status}`), {
        code: `http_${response.status}`,
      });
    }
    const data = await response.json();
    if (!Array.isArray(data.states)) {
      throw Object.assign(new Error('OpenSky response malformed'), {
        code: 'malformed_json',
      });
    }
    return data.states
      .map((state, index) =>
        normalizeOpenSkyTrack(state, index, data.time, query.center)
      )
      .filter(Boolean);
  }
}

export function normalizeOpenSkyTrack(state, index, responseTime, center) {
  if (!Array.isArray(state)) return null;
  const [
    icao24,
    callsign,
    originCountry,
    timePosition,
    lastContact,
    longitude,
    latitude,
    baroAltitude,
    onGround,
    velocity,
    trueTrack,
    verticalRate,
    ,
    geometricAltitude,
    squawk,
    ,
    positionSource,
    category,
  ] = state;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const contactSeconds = numberOrNull(
    lastContact ?? timePosition ?? responseTime
  );
  const lastContactAt = new Date((contactSeconds || Date.now() / 1000) * 1000);
  const receivedAt = new Date();
  const ageSeconds = Math.max(0, (receivedAt - lastContactAt) / 1000);
  return enrichTrack(
    {
      id: String(icao24 || `opensky-${index}`).toLowerCase(),
      icao24: String(icao24 || '').toLowerCase(),
      callsign: String(callsign || '').trim() || null,
      registration: null,
      aircraftType: null,
      latitude,
      longitude,
      altitudeMeters: numberOrNull(baroAltitude),
      geometricAltitudeMeters: numberOrNull(geometricAltitude),
      groundSpeedMps: numberOrNull(velocity),
      verticalRateMps: numberOrNull(verticalRate),
      headingDegrees: numberOrNull(trueTrack),
      squawk: squawk ? String(squawk) : null,
      category: category
        ? String(category)
        : positionSource
          ? String(positionSource)
          : originCountry || null,
      onGround: Boolean(onGround),
      lastContactAt: lastContactAt.toISOString(),
      sourceTimestamp: lastContactAt.toISOString(),
      receivedAt: receivedAt.toISOString(),
      source: 'opensky',
      sourceTrackId: String(icao24 || index),
      stale: ageSeconds > 30,
      quality: {
        positionValid: true,
        altitudeValid: Number.isFinite(baroAltitude),
        velocityValid: Number.isFinite(velocity),
        ageSeconds,
      },
    },
    center
  );
}

export class LocalAdsbClient {
  constructor(config = {}) {
    this.enabled = config.enabled ?? false;
    this.baseUrl = config.baseUrl || 'http://localhost:8080';
    this.aircraftPath = config.aircraftPath || '/data/aircraft.json';
    this.timeoutMs = config.timeoutMs || 3000;
    this.maxAgeSeconds = config.maxAgeSeconds || 30;
    this.fixture = config.fixture;
    this.fetchImpl = config.fetchImpl || fetch;
  }

  async fetchTracks(query) {
    const started = performance.now();
    const lastAttemptAt = nowIso();
    if (!this.enabled && !this.fixture) {
      return {
        tracks: [],
        health: health('local_adsb', false, 'unconfigured'),
      };
    }
    try {
      const data = this.fixture || (await this.fetchJson());
      const now = new Date();
      const tracks = (Array.isArray(data.aircraft) ? data.aircraft : [])
        .map((item) => normalizeLocalAdsbTrack(item, now, query.center))
        .filter(Boolean)
        .filter(
          (track) => (track.quality?.ageSeconds ?? 0) <= this.maxAgeSeconds
        );
      return {
        tracks,
        health: health('local_adsb', true, 'healthy', {
          lastAttemptAt,
          lastSuccessAt: nowIso(),
          latencyMs: Math.round(performance.now() - started),
          aircraftCount: tracks.length,
        }),
      };
    } catch (error) {
      return {
        tracks: [],
        health: health('local_adsb', true, 'offline', {
          lastAttemptAt,
          latencyMs: Math.round(performance.now() - started),
          errorCode: error.code || 'local_adsb_error',
          message: error.message,
        }),
      };
    }
  }

  async fetchJson() {
    const url = new URL(this.aircraftPath, this.baseUrl);
    const response = await this.fetchImpl(url, {
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) {
      throw Object.assign(new Error(`local ADS-B HTTP ${response.status}`), {
        code: `http_${response.status}`,
      });
    }
    return response.json();
  }
}

export function normalizeLocalAdsbTrack(item, receivedAtDate, center) {
  const latitude = numberOrNull(item.lat);
  const longitude = numberOrNull(item.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const ageSeconds = Math.max(0, numberOrNull(item.seen_pos ?? item.seen) ?? 0);
  const sourceDate = new Date(receivedAtDate.getTime() - ageSeconds * 1000);
  const altitudeFeet =
    item.alt_baro === 'ground' ? 0 : numberOrNull(item.alt_baro);
  return enrichTrack(
    {
      id: String(item.hex || `adsb-${latitude}-${longitude}`).toLowerCase(),
      icao24: String(item.hex || '').toLowerCase(),
      callsign: String(item.flight || '').trim() || null,
      registration: null,
      aircraftType: item.t ? String(item.t) : null,
      latitude,
      longitude,
      altitudeMeters:
        altitudeFeet === null
          ? null
          : Number((altitudeFeet * METERS_PER_FOOT).toFixed(1)),
      geometricAltitudeMeters:
        numberOrNull(item.alt_geom) === null
          ? null
          : Number((numberOrNull(item.alt_geom) * METERS_PER_FOOT).toFixed(1)),
      groundSpeedMps:
        numberOrNull(item.gs) === null
          ? null
          : Number((numberOrNull(item.gs) * MPS_PER_KNOT).toFixed(2)),
      verticalRateMps:
        numberOrNull(item.baro_rate) === null
          ? null
          : Number(
              ((numberOrNull(item.baro_rate) * METERS_PER_FOOT) / 60).toFixed(2)
            ),
      headingDegrees: numberOrNull(item.track),
      squawk: item.squawk ? String(item.squawk) : null,
      category: item.category ? String(item.category) : null,
      onGround: item.alt_baro === 'ground',
      lastContactAt: sourceDate.toISOString(),
      sourceTimestamp: sourceDate.toISOString(),
      receivedAt: receivedAtDate.toISOString(),
      source: 'local_adsb',
      sourceTrackId: String(item.hex || ''),
      stale: ageSeconds > 30,
      quality: {
        positionValid: true,
        altitudeValid: altitudeFeet !== null,
        velocityValid: numberOrNull(item.gs) !== null,
        ageSeconds,
      },
    },
    center
  );
}

function enrichTrack(track, center) {
  const dist = distanceKm(
    center.latitude,
    center.longitude,
    track.latitude,
    track.longitude
  );
  return {
    ...track,
    distanceKm: Number(dist.toFixed(3)),
    bearingDegrees: Number(
      bearingDegrees(
        center.latitude,
        center.longitude,
        track.latitude,
        track.longitude
      ).toFixed(2)
    ),
  };
}

export function simulationTracks(query, count = 8) {
  const generatedAt = new Date();
  return Array.from({ length: count }, (_, index) => {
    const bearing = (index * 43 + 25) % 360;
    const distance = 5 + index * Math.max(3, query.rangeKm / 14);
    const latOffset = (Math.cos((bearing * Math.PI) / 180) * distance) / 111.32;
    const lonOffset =
      (Math.sin((bearing * Math.PI) / 180) * distance) /
      (111.32 * Math.cos((query.center.latitude * Math.PI) / 180));
    return enrichTrack(
      {
        id: `sim-${index + 1}`,
        icao24: `sim${index + 1}`,
        callsign: `SIM${index + 1}`,
        registration: null,
        aircraftType: ['A320', 'B738', 'E190', 'A321'][index % 4],
        latitude: Number((query.center.latitude + latOffset).toFixed(6)),
        longitude: Number((query.center.longitude + lonOffset).toFixed(6)),
        altitudeMeters: 900 + index * 850,
        geometricAltitudeMeters: null,
        groundSpeedMps: 120 + index * 8,
        verticalRateMps: index % 3 === 0 ? 1.1 : index % 3 === 1 ? -0.6 : 0,
        headingDegrees: (bearing + 180) % 360,
        squawk: null,
        category: 'simulation',
        onGround: false,
        lastContactAt: generatedAt.toISOString(),
        sourceTimestamp: generatedAt.toISOString(),
        receivedAt: generatedAt.toISOString(),
        source: 'simulation',
        sourceTrackId: `sim-${index + 1}`,
        stale: false,
        quality: {
          positionValid: true,
          altitudeValid: true,
          velocityValid: true,
          ageSeconds: 0,
        },
      },
      query.center
    );
  });
}

export function mergeTracks(
  groups,
  sourcePriority = ['local_adsb', 'opensky', 'simulation']
) {
  const byIcao = new Map();
  for (const track of groups.flat()) {
    const key = track.icao24 || track.id;
    const current = byIcao.get(key);
    if (!current) {
      byIcao.set(key, track);
      continue;
    }
    const currentAge = current.quality?.ageSeconds ?? Number.POSITIVE_INFINITY;
    const nextAge = track.quality?.ageSeconds ?? Number.POSITIVE_INFINITY;
    const sourceWins =
      sourcePriority.indexOf(track.source) <
      sourcePriority.indexOf(current.source);
    if (
      nextAge + 2 < currentAge ||
      (Math.abs(nextAge - currentAge) <= 2 && sourceWins)
    ) {
      byIcao.set(key, {
        ...current,
        ...track,
        callsign: track.callsign || current.callsign,
        registration: track.registration || current.registration,
        aircraftType: track.aircraftType || current.aircraftType,
      });
    }
  }
  return [...byIcao.values()].sort(
    (a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999)
  );
}

export class HybridRadarService {
  constructor({ openSkyClient, localAdsbClient, env = process.env } = {}) {
    this.env = env;
    this.openSkyClient = openSkyClient;
    this.localAdsbClient = localAdsbClient;
    this.cache = new Map();
    this.inflight = new Map();
    this.lastSnapshot = null;
  }

  priority() {
    return (this.env.MARIA_SOURCE_PRIORITY || 'local_adsb,opensky,simulation')
      .split(',')
      .map((value) => value.trim())
      .filter((value) => VALID_SOURCES.has(value));
  }

  cacheKey(query) {
    return `${query.center.latitude.toFixed(3)}:${query.center.longitude.toFixed(3)}:${Math.round(query.rangeKm)}:${query.mode}`;
  }

  async snapshot(rawQuery = {}) {
    const query = parseRadarQuery(rawQuery, this.env);
    const key = this.cacheKey(query);
    const ttlMs =
      Math.max(1, Number(this.env.OPENSKY_CACHE_TTL_SECONDS) || 10) * 1000;
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.time < ttlMs) return cached.snapshot;
    if (this.inflight.has(key)) return this.inflight.get(key);
    const promise = this.buildSnapshot(query)
      .then((snapshot) => {
        this.cache.set(key, { time: Date.now(), snapshot });
        this.lastSnapshot = snapshot;
        return snapshot;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, promise);
    return promise;
  }

  async buildSnapshot(query) {
    const sourceResults = [];
    const mode = query.mode;
    if (mode === 'simulation') {
      sourceResults.push({
        tracks: simulationTracks(query),
        health: health('simulation', true, 'healthy', {
          lastSuccessAt: nowIso(),
          aircraftCount: 8,
        }),
      });
    } else {
      const wantsLocal =
        mode === 'auto' || mode === 'hybrid' || mode === 'local_adsb';
      const wantsOpenSky =
        mode === 'auto' || mode === 'hybrid' || mode === 'opensky';
      if (wantsLocal && this.localAdsbClient) {
        sourceResults.push(await this.localAdsbClient.fetchTracks(query));
      }
      if (wantsOpenSky && this.openSkyClient) {
        sourceResults.push(await this.openSkyClient.fetchTracks(query));
      }
      const simulationFallback = this.env.MARIA_SIMULATION_FALLBACK !== 'false';
      const hasTracks = sourceResults.some(
        (result) => result.tracks.length > 0
      );
      if (
        (mode === 'auto' && !hasTracks && simulationFallback) ||
        mode === 'hybrid'
      ) {
        const tracks =
          simulationFallback && !hasTracks ? simulationTracks(query) : [];
        sourceResults.push({
          tracks,
          health: health(
            'simulation',
            simulationFallback,
            tracks.length ? 'healthy' : 'degraded',
            {
              lastSuccessAt: tracks.length ? nowIso() : null,
              aircraftCount: tracks.length,
              message: tracks.length ? 'fallback active' : 'fallback available',
            }
          ),
        });
      }
    }
    const healthRows = sourceResults.map((result) => result.health);
    const merged = mergeTracks(
      sourceResults.map((result) => result.tracks),
      this.priority()
    ).filter((track) => (track.distanceKm ?? Infinity) <= query.rangeKm);
    const effectiveSources = [...new Set(merged.map((track) => track.source))];
    const generatedAt = nowIso();
    const stale = merged.some((track) => track.stale);
    return {
      generatedAt,
      center: query.center,
      rangeKm: query.rangeKm,
      activeSourceMode: query.mode,
      effectiveSources,
      aircraft: merged,
      sourceHealth: healthRows,
      stale,
      nextRefreshSeconds: Math.max(
        10,
        Number(this.env.OPENSKY_MIN_REQUEST_INTERVAL_SECONDS) || 10
      ),
    };
  }

  sources() {
    return (
      this.lastSnapshot?.sourceHealth || [
        health('local_adsb', false, 'unconfigured'),
        health('opensky', false, 'unconfigured'),
        health('simulation', true, 'healthy'),
      ]
    );
  }
}

export function toLegacyTraffic(snapshot) {
  return {
    source: snapshot.effectiveSources[0] || 'simulation',
    requested_source: snapshot.activeSourceMode,
    updated_at: Date.parse(snapshot.generatedAt),
    aircraft: snapshot.aircraft.map((track) => ({
      id: track.id,
      callsign: track.callsign || track.icao24 || track.id,
      tail_number: track.registration || track.icao24 || '',
      aircraft_type: track.aircraftType || '',
      airline: '',
      origin: '',
      destination: '',
      lat: track.latitude,
      lon: track.longitude,
      altitude_m: track.altitudeMeters || 0,
      velocity_kmph:
        track.groundSpeedMps === null ? 0 : track.groundSpeedMps * 3.6,
      heading_deg: track.headingDegrees || 0,
      vertical_rate_mps: track.verticalRateMps || 0,
      source: track.source,
      updated_at: Date.parse(track.receivedAt),
    })),
  };
}

export function toDevicePayload(snapshot, maxAircraft = 32) {
  return {
    version: '1',
    generatedAt: snapshot.generatedAt,
    center: {
      lat: snapshot.center.latitude,
      lon: snapshot.center.longitude,
    },
    rangeKm: snapshot.rangeKm,
    sourceMode: snapshot.activeSourceMode,
    sources: snapshot.sourceHealth.map((source) => ({
      id: source.source,
      status: source.status,
    })),
    stale: snapshot.stale,
    aircraft: snapshot.aircraft.slice(0, maxAircraft).map((track) => ({
      id: track.icao24 || track.id,
      callsign: track.callsign || track.icao24 || track.id,
      bearingDeg: track.bearingDegrees,
      distanceKm: track.distanceKm,
      altitudeM: track.altitudeMeters,
      speedMps: track.groundSpeedMps,
      headingDeg: track.headingDegrees,
      source: track.source,
      ageSec: Math.round(track.quality?.ageSeconds ?? 0),
    })),
  };
}

export function createRadarService(env = process.env, fetchImpl = fetch) {
  const tokenManager = new OpenSkyTokenManager({
    clientId: env.OPENSKY_CLIENT_ID || '',
    clientSecret: env.OPENSKY_CLIENT_SECRET || '',
    tokenUrl:
      env.OPENSKY_TOKEN_URL ||
      'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token',
    fetchImpl,
  });
  return new HybridRadarService({
    env,
    openSkyClient: new OpenSkyClient({
      enabled: env.OPENSKY_ENABLED === 'true',
      allowAnonymous: env.OPENSKY_ALLOW_ANONYMOUS === 'true',
      baseUrl: env.OPENSKY_BASE_URL || 'https://opensky-network.org/api',
      timeoutMs: Number(env.OPENSKY_TIMEOUT_MS) || 10000,
      fetchImpl,
      tokenManager,
    }),
    localAdsbClient: new LocalAdsbClient({
      enabled: env.LOCAL_ADSB_ENABLED === 'true',
      baseUrl: env.LOCAL_ADSB_BASE_URL || 'http://localhost:8080',
      aircraftPath: env.LOCAL_ADSB_AIRCRAFT_PATH || '/data/aircraft.json',
      timeoutMs: Number(env.LOCAL_ADSB_TIMEOUT_MS) || 3000,
      maxAgeSeconds: Number(env.LOCAL_ADSB_MAX_AGE_SECONDS) || 30,
      fetchImpl,
    }),
  });
}
