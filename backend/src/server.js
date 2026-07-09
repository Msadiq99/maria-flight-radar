import cors from 'cors';
import express from 'express';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createStore } from './store.js';

const PORT = process.env.PORT || 8080;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const API_KEY = process.env.API_KEY || (IS_PRODUCTION ? '' : 'change-me');
const MAX_HISTORY_PER_DEVICE = 500;
const TRAFFIC_SOURCE = process.env.TRAFFIC_SOURCE || 'mock';
const OPENSKY_USERNAME = process.env.OPENSKY_USERNAME || '';
const OPENSKY_PASSWORD = process.env.OPENSKY_PASSWORD || '';
const CORS_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const TRAFFIC_CACHE_MS = 15_000;
const RETENTION_DAYS = Math.max(1, Number(process.env.RETENTION_DAYS) || 30);
const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const DB_PATH =
  process.env.DB_PATH || resolve(MODULE_DIR, '../data/maria.sqlite');
const TELEMETRY_HMAC_SECRET = process.env.TELEMETRY_HMAC_SECRET || '';

if (!API_KEY) {
  throw new Error('API_KEY is required when NODE_ENV=production');
}

const store = createStore(DB_PATH, RETENTION_DAYS);
store.prune();
setInterval(() => store.prune(), 60 * 60 * 1000).unref();
const trafficCache = new Map();
const rateBuckets = new Map();
const telemetryStreams = new Map();
const metrics = {
  startedAt: Date.now(),
  requests: 0,
  errors: 0,
  responseTimeMs: 0,
  telemetryAccepted: 0,
  trafficRequests: 0,
  openSkyFailures: 0,
};
const AIRLINES = {
  SVA: 'Saudia',
  FAD: 'flyadeal',
  NAS: 'flynas',
  QTR: 'Qatar Airways',
  UAE: 'Emirates',
  ETD: 'Etihad Airways',
  GFA: 'Gulf Air',
};
const AIRPORTS = [
  {
    code: 'RUH',
    name: 'King Khalid International',
    lat: 24.9576,
    lon: 46.6988,
    runways: ['15L/33R', '15R/33L'],
  },
  {
    code: 'JED',
    name: 'King Abdulaziz International',
    lat: 21.6796,
    lon: 39.1565,
    runways: ['16L/34R', '16C/34C', '16R/34L'],
  },
  {
    code: 'DMM',
    name: 'King Fahd International',
    lat: 26.4712,
    lon: 49.7979,
    runways: ['16L/34R', '16R/34L'],
  },
  {
    code: 'MED',
    name: 'Prince Mohammad bin Abdulaziz',
    lat: 24.5534,
    lon: 39.7051,
    runways: ['17/35', '18/36'],
  },
];

const app = express();
app.use((req, res, next) => {
  const startedAt = performance.now();
  const suppliedId = req.get('X-Request-ID');
  req.requestId =
    suppliedId && /^[A-Za-z0-9._-]{1,128}$/.test(suppliedId)
      ? suppliedId
      : randomUUID();
  res.set('X-Request-ID', req.requestId);
  metrics.requests += 1;

  res.on('finish', () => {
    const durationMs = Number((performance.now() - startedAt).toFixed(2));
    metrics.responseTimeMs += durationMs;
    if (res.statusCode >= 500) {
      metrics.errors += 1;
    }
    console.log(
      JSON.stringify({
        level: res.statusCode >= 500 ? 'error' : 'info',
        event: 'http_request',
        request_id: req.requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: durationMs,
      })
    );
  });
  next();
});
app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        (!IS_PRODUCTION && CORS_ORIGINS.length === 0) ||
        CORS_ORIGINS.includes(origin)
      ) {
        return callback(null, true);
      }
      callback(new Error('origin not allowed'));
    },
  })
);
app.use(
  express.json({
    limit: '16kb',
    verify(req, _res, buffer) {
      req.rawBody = buffer;
    },
  })
);

function isValidTelemetrySignature(rawBody, supplied, secret) {
  if (!secret) {
    return true;
  }
  const expected = createHmac('sha256', secret)
    .update(rawBody || Buffer.alloc(0))
    .digest('hex');
  if (!/^[a-f0-9]{64}$/i.test(supplied)) {
    return false;
  }
  return timingSafeEqual(
    Buffer.from(supplied, 'hex'),
    Buffer.from(expected, 'hex')
  );
}

function validSignature(req) {
  return isValidTelemetrySignature(
    req.rawBody,
    req.get('X-Telemetry-Signature') || '',
    TELEMETRY_HMAC_SECRET
  );
}

function rateLimit(maxRequests, windowMs) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > maxRequests) {
      return res.status(429).json({ error: 'rate limit exceeded' });
    }
    next();
  };
}

function publishTelemetry(record) {
  const clients = telemetryStreams.get(record.device_id);
  if (!clients) return;
  const message = `event: telemetry\ndata: ${JSON.stringify(record)}\n\n`;
  for (const response of clients) {
    response.write(message);
  }
}

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function offsetPosition(lat, lon, northKm, eastKm) {
  const latOffset = northKm / 111.32;
  const lonOffset = eastKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  return {
    lat: lat + latOffset,
    lon: lon + lonOffset,
  };
}

function mockNearbyAircraft(lat, lon) {
  const now = Date.now();
  const phase = now / 60000;
  const templates = [
    {
      callsign: 'SVA104',
      northKm: 8,
      eastKm: -12,
      altitude_m: 6700,
      velocity_kmph: 735,
      heading_deg: 118,
      vertical_rate_mps: 3.2,
    },
    {
      callsign: 'QTR812',
      northKm: -15,
      eastKm: 9,
      altitude_m: 9200,
      velocity_kmph: 810,
      heading_deg: 292,
      vertical_rate_mps: -1.1,
    },
    {
      callsign: 'UAE563',
      northKm: 18,
      eastKm: 19,
      altitude_m: 7600,
      velocity_kmph: 690,
      heading_deg: 44,
      vertical_rate_mps: 0.2,
    },
    {
      callsign: 'FAD321',
      northKm: -6,
      eastKm: -18,
      altitude_m: 2400,
      velocity_kmph: 410,
      heading_deg: 76,
      vertical_rate_mps: 5.5,
    },
    {
      callsign: 'NAS274',
      northKm: 25,
      eastKm: -4,
      altitude_m: 10800,
      velocity_kmph: 845,
      heading_deg: 185,
      vertical_rate_mps: -0.4,
    },
  ];

  return templates.map((aircraft, index) => {
    const drift = Math.sin(phase + index) * 2;
    const position = offsetPosition(
      lat,
      lon,
      aircraft.northKm + drift,
      aircraft.eastKm - drift
    );
    return {
      id: `${aircraft.callsign}-${index}`,
      callsign: aircraft.callsign,
      tail_number: `HZ-${aircraft.callsign.slice(0, 3)}`,
      aircraft_type: ['A320', 'B789', 'A388', 'E190', 'A321'][index],
      airline: ['Saudia', 'Qatar Airways', 'Emirates', 'Flyadeal', 'flynas'][
        index
      ],
      origin: ['RUH', 'DOH', 'DXB', 'JED', 'DMM'][index],
      destination: ['JED', 'RUH', 'BAH', 'DMM', 'MED'][index],
      lat: Number(position.lat.toFixed(6)),
      lon: Number(position.lon.toFixed(6)),
      altitude_m: aircraft.altitude_m,
      velocity_kmph: aircraft.velocity_kmph,
      heading_deg: aircraft.heading_deg,
      vertical_rate_mps: aircraft.vertical_rate_mps,
      source: 'mock',
      updated_at: now,
    };
  });
}

function boundingBox(lat, lon, radiusKm) {
  const latDelta = radiusKm / 111.32;
  const lonDelta = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  return {
    lamin: lat - latDelta,
    lomin: lon - lonDelta,
    lamax: lat + latDelta,
    lomax: lon + lonDelta,
  };
}

function normalizeOpenSkyState(state, index) {
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
  ] = state;

  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    typeof velocity !== 'number' ||
    typeof trueTrack !== 'number'
  ) {
    return null;
  }

  const normalizedCallsign = String(callsign || icao24 || 'UNKNOWN').trim();
  return {
    id: icao24 || `opensky-${index}`,
    callsign: normalizedCallsign,
    tail_number: icao24 || '',
    aircraft_type: '',
    airline: AIRLINES[normalizedCallsign.slice(0, 3)] || '',
    origin: originCountry || '',
    destination: '',
    lat: latitude,
    lon: longitude,
    altitude_m: typeof baroAltitude === 'number' ? baroAltitude : 0,
    velocity_kmph: velocity * 3.6,
    heading_deg: trueTrack,
    vertical_rate_mps: typeof verticalRate === 'number' ? verticalRate : 0,
    on_ground: Boolean(onGround),
    origin_country: originCountry || '',
    source: 'opensky',
    updated_at: (lastContact || timePosition || Date.now() / 1000) * 1000,
  };
}

async function openSkyNearbyAircraft(lat, lon, radiusKm) {
  const box = boundingBox(lat, lon, radiusKm);
  const params = new URLSearchParams({
    lamin: String(box.lamin),
    lomin: String(box.lomin),
    lamax: String(box.lamax),
    lomax: String(box.lomax),
  });
  const headers = {};

  if (OPENSKY_USERNAME && OPENSKY_PASSWORD) {
    headers.Authorization = `Basic ${Buffer.from(`${OPENSKY_USERNAME}:${OPENSKY_PASSWORD}`).toString('base64')}`;
  }

  const response = await fetch(
    `https://opensky-network.org/api/states/all?${params}`,
    {
      headers,
      signal: AbortSignal.timeout(8000),
    }
  );
  if (!response.ok) {
    throw new Error(`OpenSky returned ${response.status}`);
  }

  const data = await response.json();
  const states = Array.isArray(data.states) ? data.states : [];
  return states.map(normalizeOpenSkyState).filter(Boolean).slice(0, 50);
}

function inRange(value, min, max) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

function validDeviceId(value) {
  return (
    typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value)
  );
}

function isValidTelemetry(body) {
  const isObject = (value) =>
    value !== null && typeof value === 'object' && !Array.isArray(value);
  const isBoolean = (value) => typeof value === 'boolean';

  return (
    isObject(body) &&
    validDeviceId(body.device_id) &&
    inRange(body.uptime_ms, 0, Number.MAX_SAFE_INTEGER) &&
    (body.sequence === undefined ||
      (Number.isInteger(body.sequence) &&
        inRange(body.sequence, 0, 0xffffffff))) &&
    (body.captured_at === undefined ||
      (Number.isInteger(body.captured_at) &&
        inRange(body.captured_at, 0, Number.MAX_SAFE_INTEGER))) &&
    (body.diagnostics === undefined ||
      (isObject(body.diagnostics) &&
        inRange(body.diagnostics.battery_percent, -1, 100) &&
        inRange(body.diagnostics.wifi_rssi_dbm, -127, 0) &&
        inRange(body.diagnostics.free_heap_bytes, 0, 10000000) &&
        Number.isInteger(body.diagnostics.reset_reason) &&
        inRange(body.diagnostics.reset_reason, 0, 255) &&
        typeof body.diagnostics.firmware_version === 'string' &&
        body.diagnostics.firmware_version.length <= 64 &&
        Number.isInteger(body.diagnostics.delivery_failures) &&
        inRange(body.diagnostics.delivery_failures, 0, 0xffffffff))) &&
    isObject(body.gps) &&
    isBoolean(body.gps.fix) &&
    inRange(body.gps.lat, -90, 90) &&
    inRange(body.gps.lon, -180, 180) &&
    inRange(body.gps.alt_m, -1000, 100000) &&
    inRange(body.gps.speed_kmph, 0, 2000) &&
    inRange(body.gps.course_deg, 0, 360) &&
    Number.isInteger(body.gps.satellites) &&
    inRange(body.gps.satellites, 0, 100) &&
    isObject(body.imu) &&
    isBoolean(body.imu.valid) &&
    isObject(body.imu.accel) &&
    inRange(body.imu.accel.x, -32, 32) &&
    inRange(body.imu.accel.y, -32, 32) &&
    inRange(body.imu.accel.z, -32, 32) &&
    isObject(body.imu.gyro) &&
    inRange(body.imu.gyro.x, -4000, 4000) &&
    inRange(body.imu.gyro.y, -4000, 4000) &&
    inRange(body.imu.gyro.z, -4000, 4000) &&
    inRange(body.imu.temp_c, -80, 150)
  );
}

app.post('/api/telemetry', rateLimit(120, 60_000), (req, res) => {
  if (req.get('X-API-Key') !== API_KEY) {
    return res.status(401).json({ error: 'invalid API key' });
  }
  if (!validSignature(req)) {
    return res.status(401).json({ error: 'invalid telemetry signature' });
  }

  if (!isValidTelemetry(req.body)) {
    return res.status(400).json({ error: 'malformed telemetry payload' });
  }

  const record = { ...req.body, received_at: Date.now() };
  const deviceId = record.device_id;

  store.saveTelemetry(record);
  publishTelemetry(record);
  metrics.telemetryAccepted += 1;

  console.log(
    JSON.stringify({
      level: 'info',
      event: 'telemetry_accepted',
      request_id: req.requestId,
      device_id: deviceId,
      gps_fix: record.gps.fix,
      satellites: record.gps.satellites,
    })
  );

  res.status(200).json({
    ok: true,
    acknowledged_sequence: record.sequence ?? null,
    received_at: record.received_at,
  });
});

app.get('/api/telemetry/latest', (req, res) => {
  const deviceId = req.query.device_id;
  if (!validDeviceId(deviceId)) {
    return res
      .status(400)
      .json({ error: 'valid device_id query param required' });
  }

  const record = store.latest(deviceId);
  if (!record) {
    return res.status(404).json({ error: 'no telemetry for device' });
  }

  res.json(record);
});

app.get('/api/telemetry/history', (req, res) => {
  const deviceId = req.query.device_id;
  if (!validDeviceId(deviceId)) {
    return res
      .status(400)
      .json({ error: 'valid device_id query param required' });
  }

  const requestedLimit = Number(req.query.limit);
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), MAX_HISTORY_PER_DEVICE)
    : 50;
  res.json(store.history(deviceId, limit));
});

app.get('/api/devices', (_req, res) => {
  res.json(store.devices());
});

app.get('/api/telemetry/playback', (req, res) => {
  const deviceId = req.query.device_id;
  const from = toNumber(req.query.from, 0);
  const to = toNumber(req.query.to, Date.now());
  const limit = Math.min(Math.max(toNumber(req.query.limit, 1000), 1), 5000);
  if (!validDeviceId(deviceId) || from < 0 || to < from) {
    return res
      .status(400)
      .json({ error: 'valid device_id, from, and to are required' });
  }
  res.json(store.playback(deviceId, from, to, limit));
});

app.get('/api/telemetry/stream', (req, res) => {
  const deviceId = req.query.device_id;
  if (!validDeviceId(deviceId)) {
    return res
      .status(400)
      .json({ error: 'valid device_id query param required' });
  }
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });
  res.flushHeaders();
  res.write('event: ready\ndata: {}\n\n');

  const clients = telemetryStreams.get(deviceId) || new Set();
  clients.add(res);
  telemetryStreams.set(deviceId, clients);
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 20_000);
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
    if (clients.size === 0) telemetryStreams.delete(deviceId);
  });
});

app.get('/api/airports', (_req, res) => {
  res.json(AIRPORTS);
});

app.get('/api/traffic/nearby', rateLimit(60, 60_000), async (req, res) => {
  metrics.trafficRequests += 1;
  const lat = toNumber(req.query.lat, null);
  const lon = toNumber(req.query.lon, null);
  const radiusKm = Math.min(
    Math.max(toNumber(req.query.radius_km, 50), 5),
    250
  );
  if (!inRange(lat, -90, 90) || !inRange(lon, -180, 180)) {
    return res
      .status(400)
      .json({ error: 'valid lat and lon query params required' });
  }

  if (TRAFFIC_SOURCE === 'opensky') {
    try {
      const cacheKey = `${lat.toFixed(2)}:${lon.toFixed(2)}:${Math.round(radiusKm / 5) * 5}`;
      const now = Date.now();
      let cached = trafficCache.get(cacheKey);
      if (!cached || now >= cached.expiresAt) {
        const request = openSkyNearbyAircraft(lat, lon, radiusKm);
        cached = { request, expiresAt: now + TRAFFIC_CACHE_MS };
        trafficCache.set(cacheKey, cached);
        request.catch(() => trafficCache.delete(cacheKey));
      }
      const aircraft = await cached.request;
      const feed = {
        source: 'opensky',
        requested_source: TRAFFIC_SOURCE,
        center: { lat, lon },
        radius_km: radiusKm,
        updated_at: Date.now(),
        aircraft,
      };
      store.saveTraffic(feed);
      return res.json(feed);
    } catch (error) {
      metrics.openSkyFailures += 1;
      console.warn(
        JSON.stringify({
          level: 'warn',
          event: 'opensky_fallback',
          request_id: req.requestId,
          error: error.message,
        })
      );
    }
  }

  const feed = {
    source: 'mock',
    requested_source: TRAFFIC_SOURCE,
    center: { lat, lon },
    radius_km: radiusKm,
    updated_at: Date.now(),
    aircraft: mockNearbyAircraft(lat, lon),
  };
  store.saveTraffic(feed);
  res.json(feed);
});

app.get('/health', (_req, res) => {
  try {
    const database = store.ping();
    res.status(database ? 200 : 503).json({
      ok: database,
      database,
      traffic_source: TRAFFIC_SOURCE,
      storage: store.stats(),
      uptime_seconds: Math.floor(process.uptime()),
    });
  } catch (error) {
    res.status(503).json({ ok: false, database: false, error: error.message });
  }
});

app.get('/metrics', (_req, res) => {
  const averageResponseMs =
    metrics.requests > 0 ? metrics.responseTimeMs / metrics.requests : 0;
  res.json({
    ...metrics,
    uptime_seconds: Math.floor((Date.now() - metrics.startedAt) / 1000),
    average_response_ms: Number(averageResponseMs.toFixed(2)),
    storage: store.stats(),
  });
});

app.use((error, _req, res, _next) => {
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'payload too large' });
  }
  if (error?.message === 'origin not allowed') {
    return res.status(403).json({ error: error.message });
  }
  console.error(
    JSON.stringify({
      level: 'error',
      event: 'unhandled_request_error',
      request_id: _req.requestId,
      error: error?.message || String(error),
    })
  );
  res.status(500).json({ error: 'internal server error' });
});

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  app.listen(PORT, () => {
    console.log(`[server] listening on port ${PORT}`);
  });
}

export { app, isValidTelemetry, isValidTelemetrySignature, store };
