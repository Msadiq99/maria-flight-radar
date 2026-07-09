import assert from 'node:assert/strict'
import { test } from 'node:test'

import { createStore } from '../src/store.js'

function record(receivedAt) {
  return {
    device_id: 'MARIA-STORE',
    uptime_ms: receivedAt,
    received_at: receivedAt,
    gps: {
      fix: true,
      lat: 24.7,
      lon: 46.6,
      alt_m: 600,
      speed_kmph: 0,
      course_deg: 0,
      satellites: 8,
    },
    imu: {
      valid: true,
      accel: { x: 0, y: 0, z: 1 },
      gyro: { x: 0, y: 0, z: 0 },
      temp_c: 30,
    },
  }
}

test('stores ordered telemetry and prunes expired records', () => {
  const store = createStore(':memory:', 1)
  store.saveTelemetry(record(1000))
  store.saveTelemetry(record(2000))

  assert.equal(store.latest('MARIA-STORE').received_at, 2000)
  assert.deepEqual(
    store.history('MARIA-STORE', 2).map((item) => item.received_at),
    [1000, 2000],
  )
  assert.equal(store.stats().telemetry_records, 2)

  const result = store.prune(2 * 24 * 60 * 60 * 1000)
  assert.equal(result.telemetry, 2)
  assert.equal(store.stats().telemetry_records, 0)
  store.close()
})
