import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { after, before, test } from 'node:test';

import {
  app,
  isValidTelemetry,
  isValidTelemetrySignature,
  store,
} from '../src/server.js';

let server;
let baseUrl;

const validTelemetry = {
  device_id: 'MARIA-001',
  uptime_ms: 1000,
  sequence: 7,
  captured_at: 1783555200000,
  diagnostics: {
    battery_percent: 82,
    wifi_rssi_dbm: -55,
    free_heap_bytes: 120000,
    reset_reason: 1,
    firmware_version: '0.3.0',
    delivery_failures: 0,
  },
  gps: {
    fix: true,
    lat: 24.7136,
    lon: 46.6753,
    alt_m: 612,
    speed_kmph: 12,
    course_deg: 90,
    satellites: 9,
  },
  imu: {
    valid: true,
    accel: { x: 0, y: 0, z: 1 },
    gyro: { x: 0, y: 0, z: 0 },
    temp_c: 31,
  },
};

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  store.close();
});

test('telemetry validation enforces geographic bounds', () => {
  assert.equal(isValidTelemetry(validTelemetry), true);
  assert.equal(
    isValidTelemetry({
      ...validTelemetry,
      gps: { ...validTelemetry.gps, lat: 91 },
    }),
    false
  );
});

test('verifies telemetry HMAC signatures', () => {
  const body = Buffer.from('{"device_id":"MARIA-001"}');
  const signature = createHmac('sha256', 'test-secret')
    .update(body)
    .digest('hex');
  assert.equal(isValidTelemetrySignature(body, signature, 'test-secret'), true);
  assert.equal(
    isValidTelemetrySignature(body, '0'.repeat(64), 'test-secret'),
    false
  );
});

test('ingests telemetry and returns the latest record', async () => {
  const post = await fetch(`${baseUrl}/api/telemetry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'change-me',
    },
    body: JSON.stringify(validTelemetry),
  });
  assert.equal(post.status, 200);
  assert.equal((await post.json()).acknowledged_sequence, 7);

  const latest = await fetch(
    `${baseUrl}/api/telemetry/latest?device_id=MARIA-001`
  );
  assert.equal(latest.status, 200);
  const record = await latest.json();
  assert.equal(record.device_id, 'MARIA-001');
  assert.equal(record.gps.lat, validTelemetry.gps.lat);

  const duplicate = await fetch(`${baseUrl}/api/telemetry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'change-me',
    },
    body: JSON.stringify(validTelemetry),
  });
  assert.equal(duplicate.status, 200);
  const history = await fetch(
    `${baseUrl}/api/telemetry/history?device_id=MARIA-001&limit=10`
  );
  assert.equal((await history.json()).length, 1);
});

test('rejects invalid traffic coordinates', async () => {
  const response = await fetch(
    `${baseUrl}/api/traffic/nearby?lat=91&lon=46&radius_km=50`
  );
  assert.equal(response.status, 400);
});

test('discovers devices and provides historical playback', async () => {
  const devices = await fetch(`${baseUrl}/api/devices`);
  const deviceList = await devices.json();
  assert.equal(deviceList[0].device_id, 'MARIA-001');

  const playback = await fetch(
    `${baseUrl}/api/telemetry/playback?device_id=MARIA-001&from=0&to=${Date.now()}&limit=100`
  );
  assert.equal(playback.status, 200);
  assert.equal((await playback.json()).length, 1);
});

test('serves airport and runway overlays', async () => {
  const response = await fetch(`${baseUrl}/api/airports`);
  const airports = await response.json();
  assert.ok(airports.some((airport) => airport.code === 'RUH'));
  assert.ok(airports.every((airport) => airport.runways.length > 0));
});

test('streams live telemetry over server-sent events', async () => {
  const controller = new AbortController();
  const stream = await fetch(
    `${baseUrl}/api/telemetry/stream?device_id=MARIA-001`,
    { signal: controller.signal }
  );
  assert.match(stream.headers.get('content-type'), /^text\/event-stream/);
  const reader = stream.body.getReader();
  const decoder = new TextDecoder();
  assert.match(decoder.decode((await reader.read()).value), /event: ready/);

  await fetch(`${baseUrl}/api/telemetry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'change-me',
    },
    body: JSON.stringify({ ...validTelemetry, sequence: 8 }),
  });
  const event = decoder.decode((await reader.read()).value);
  assert.match(event, /event: telemetry/);
  assert.match(event, /"sequence":8/);
  controller.abort();
});

test('exposes database readiness, metrics, and request IDs', async () => {
  const health = await fetch(`${baseUrl}/health`, {
    headers: { 'X-Request-ID': 'phase-2-test' },
  });
  assert.equal(health.status, 200);
  assert.equal(health.headers.get('x-request-id'), 'phase-2-test');
  assert.equal((await health.json()).database, true);

  const metrics = await fetch(`${baseUrl}/metrics`);
  const body = await metrics.json();
  assert.ok(body.requests >= 1);
  assert.ok(body.storage.telemetry_records >= 1);
});
