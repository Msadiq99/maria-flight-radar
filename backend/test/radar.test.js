import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  HybridRadarService,
  LocalAdsbClient,
  OpenSkyClient,
  OpenSkyTokenManager,
  boundingBox,
  mergeTracks,
  normalizeLocalAdsbTrack,
  normalizeOpenSkyTrack,
  parseRadarQuery,
  simulatedLocalAdsbAircraftJson,
  toDevicePayload,
} from '../src/radar.js';

const center = { latitude: 24.7136, longitude: 46.6753 };

test('builds bounded radar queries and bounding boxes', () => {
  const query = parseRadarQuery(
    { lat: '24.7', lon: '46.6', rangeKm: '300', mode: 'hybrid' },
    { MARIA_MAX_RANGE_KM: '250' }
  );
  assert.equal(query.rangeKm, 250);
  assert.equal(query.mode, 'hybrid');
  const box = boundingBox(query.center, 100);
  assert.ok(box.lamin < box.lamax);
  assert.ok(box.lomin < box.lomax);
});

test('OpenSky token manager caches and refreshes bearer tokens', async () => {
  let calls = 0;
  const manager = new OpenSkyTokenManager({
    clientId: 'client',
    clientSecret: 'secret',
    tokenUrl: 'https://tokens.example.test',
    fetchImpl: async () => {
      calls += 1;
      return Response.json({
        access_token: `token-${calls}`,
        expires_in: 3600,
      });
    },
  });
  assert.equal(await manager.accessToken(), 'token-1');
  assert.equal(await manager.accessToken(), 'token-1');
  assert.equal(calls, 1);
});

test('normalizes OpenSky and local ADS-B tracks', () => {
  const openSky = normalizeOpenSkyTrack(
    [
      'abc123',
      ' SVA104 ',
      'Saudi Arabia',
      1783555200,
      1783555201,
      46.7,
      24.8,
      6000,
      false,
      210,
      90,
      1.5,
      null,
      6200,
      '1234',
    ],
    0,
    1783555201,
    center
  );
  assert.equal(openSky.source, 'opensky');
  assert.equal(openSky.icao24, 'abc123');
  assert.equal(openSky.callsign, 'SVA104');
  assert.ok(openSky.distanceKm > 0);

  const local = normalizeLocalAdsbTrack(
    {
      hex: 'abc123',
      flight: 'SVA104 ',
      lat: 24.81,
      lon: 46.71,
      alt_baro: 10000,
      alt_geom: 10100,
      gs: 250,
      track: 180,
      baro_rate: 600,
      squawk: '4567',
      seen_pos: 2,
    },
    new Date('2026-01-01T00:00:10Z'),
    center
  );
  assert.equal(local.source, 'local_adsb');
  assert.equal(local.altitudeMeters, 3048);
  assert.equal(local.groundSpeedMps, 128.61);
});

test('deduplicates tracks with local ADS-B priority', () => {
  const base = normalizeOpenSkyTrack(
    ['abc123', 'OSKY', '', 1, 1, 46.7, 24.8, 6000, false, 200, 90],
    0,
    1,
    center
  );
  const local = { ...base, callsign: 'ADSB', source: 'local_adsb' };
  const merged = mergeTracks(
    [[base], [local]],
    ['local_adsb', 'simulation', 'opensky']
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].source, 'local_adsb');
});

test('aggregator falls back to deterministic simulation and caps device payload', async () => {
  const service = new HybridRadarService({
    env: {
      MARIA_SIMULATION_FALLBACK: 'true',
      MARIA_SOURCE_MODE: 'auto',
    },
    openSkyClient: new OpenSkyClient({ enabled: false }),
    localAdsbClient: new LocalAdsbClient({ enabled: false }),
  });
  const snapshot = await service.snapshot({
    lat: center.latitude,
    lon: center.longitude,
    rangeKm: 100,
    mode: 'auto',
  });
  assert.equal(snapshot.effectiveSources[0], 'simulation');
  assert.ok(snapshot.aircraft.length > 0);
  const payload = toDevicePayload(snapshot, 3);
  assert.equal(payload.aircraft.length, 3);
  assert.equal(
    payload.sources.some((source) => source.id === 'simulation'),
    true
  );
});

test('auto mode uses local ADS-B and does not contact OpenSky by default', async () => {
  let openSkyCalls = 0;
  const service = new HybridRadarService({
    env: {
      MARIA_SOURCE_MODE: 'auto',
      MARIA_SOURCE_PRIORITY: 'local_adsb,simulation',
      MARIA_SIMULATION_FALLBACK: 'true',
      OPENSKY_ENABLED: 'false',
    },
    openSkyClient: {
      fetchTracks: async () => {
        openSkyCalls += 1;
        return { tracks: [], health: { source: 'opensky' } };
      },
    },
    localAdsbClient: new LocalAdsbClient({
      simulator: true,
    }),
  });

  const snapshot = await service.snapshot({
    lat: '24.7136',
    lon: '46.6753',
    rangeKm: '100',
  });

  assert.equal(openSkyCalls, 0);
  assert.equal(snapshot.effectiveSources[0], 'local_adsb');
  assert.ok(snapshot.aircraft.length > 0);
});

test('local ADS-B client uses a recent cached snapshot during interruption', async () => {
  let online = true;
  const client = new LocalAdsbClient({
    enabled: true,
    cacheMaxAgeSeconds: 60,
    fetchImpl: async () => {
      if (!online) {
        throw Object.assign(new Error('receiver offline'), { code: 'offline' });
      }
      return Response.json(
        simulatedLocalAdsbAircraftJson({ center, rangeKm: 100 }, 2)
      );
    },
  });

  const first = await client.fetchTracks({ center, rangeKm: 100 });
  online = false;
  const second = await client.fetchTracks({ center, rangeKm: 100 });

  assert.equal(first.health.status, 'healthy');
  assert.equal(second.health.status, 'degraded');
  assert.equal(second.tracks.length, 2);
});
