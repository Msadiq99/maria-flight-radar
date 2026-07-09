import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const DEFAULT_RETENTION_DAYS = 30

export function createStore(databasePath, retentionDays = DEFAULT_RETENTION_DAYS) {
  if (databasePath !== ':memory:') {
    mkdirSync(dirname(databasePath), { recursive: true })
  }

  const db = new Database(databasePath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  const version = db.pragma('user_version', { simple: true })
  if (version < 1) {
    db.exec(`
      CREATE TABLE devices (
        device_id TEXT PRIMARY KEY,
        first_seen_at INTEGER NOT NULL,
        last_seen_at INTEGER NOT NULL
      );

      CREATE TABLE telemetry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
        received_at INTEGER NOT NULL,
        uptime_ms INTEGER NOT NULL,
        gps_fix INTEGER NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        payload_json TEXT NOT NULL
      );
      CREATE INDEX telemetry_device_received
        ON telemetry(device_id, received_at DESC);

      CREATE TABLE traffic_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        center_lat REAL NOT NULL,
        center_lon REAL NOT NULL,
        radius_km REAL NOT NULL,
        captured_at INTEGER NOT NULL,
        payload_json TEXT NOT NULL
      );
      CREATE INDEX traffic_snapshots_captured
        ON traffic_snapshots(captured_at DESC);
    `)
    db.pragma('user_version = 1')
  }
  if (version < 2) {
    db.exec(`
      ALTER TABLE telemetry ADD COLUMN sequence INTEGER;
      ALTER TABLE telemetry ADD COLUMN captured_at INTEGER;
      CREATE UNIQUE INDEX telemetry_device_sequence
        ON telemetry(device_id, sequence)
        WHERE sequence IS NOT NULL;
    `)
    db.pragma('user_version = 2')
  }

  const upsertDevice = db.prepare(`
    INSERT INTO devices(device_id, first_seen_at, last_seen_at)
    VALUES (@device_id, @received_at, @received_at)
    ON CONFLICT(device_id) DO UPDATE SET last_seen_at = excluded.last_seen_at
  `)
  const insertTelemetry = db.prepare(`
    INSERT OR IGNORE INTO telemetry(
      device_id, received_at, uptime_ms, gps_fix, latitude, longitude,
      sequence, captured_at, payload_json
    ) VALUES (
      @device_id, @received_at, @uptime_ms, @gps_fix, @latitude, @longitude,
      @sequence, @captured_at, @payload_json
    )
  `)
  const writeTelemetry = db.transaction((record) => {
    upsertDevice.run(record)
    insertTelemetry.run({
      device_id: record.device_id,
      received_at: record.received_at,
      uptime_ms: record.uptime_ms,
      gps_fix: record.gps.fix ? 1 : 0,
      latitude: record.gps.lat,
      longitude: record.gps.lon,
      sequence: record.sequence ?? null,
      captured_at: record.captured_at || null,
      payload_json: JSON.stringify(record),
    })
  })
  const latestTelemetry = db.prepare(`
    SELECT payload_json FROM telemetry
    WHERE device_id = ?
    ORDER BY received_at DESC, id DESC
    LIMIT 1
  `)
  const telemetryHistory = db.prepare(`
    SELECT payload_json FROM (
      SELECT id, received_at, payload_json FROM telemetry
      WHERE device_id = ?
      ORDER BY received_at DESC, id DESC
      LIMIT ?
    ) ORDER BY received_at ASC, id ASC
  `)
  const telemetryPlayback = db.prepare(`
    SELECT payload_json FROM telemetry
    WHERE device_id = ? AND received_at BETWEEN ? AND ?
    ORDER BY received_at ASC, id ASC
    LIMIT ?
  `)
  const insertTraffic = db.prepare(`
    INSERT INTO traffic_snapshots(
      source, center_lat, center_lon, radius_km, captured_at, payload_json
    ) VALUES (?, ?, ?, ?, ?, ?)
  `)
  const pruneTelemetry = db.prepare('DELETE FROM telemetry WHERE received_at < ?')
  const pruneTraffic = db.prepare('DELETE FROM traffic_snapshots WHERE captured_at < ?')
  const countDevices = db.prepare('SELECT COUNT(*) AS count FROM devices')
  const countTelemetry = db.prepare('SELECT COUNT(*) AS count FROM telemetry')
  const listDevices = db.prepare(`
    SELECT device_id, first_seen_at, last_seen_at
    FROM devices
    ORDER BY last_seen_at DESC
  `)

  return {
    saveTelemetry(record) {
      writeTelemetry(record)
    },
    latest(deviceId) {
      const row = latestTelemetry.get(deviceId)
      return row ? JSON.parse(row.payload_json) : null
    },
    history(deviceId, limit) {
      return telemetryHistory.all(deviceId, limit).map((row) => JSON.parse(row.payload_json))
    },
    playback(deviceId, from, to, limit) {
      return telemetryPlayback
        .all(deviceId, from, to, limit)
        .map((row) => JSON.parse(row.payload_json))
    },
    devices() {
      return listDevices.all()
    },
    saveTraffic(feed) {
      insertTraffic.run(
        feed.source,
        feed.center.lat,
        feed.center.lon,
        feed.radius_km,
        feed.updated_at,
        JSON.stringify(feed),
      )
    },
    prune(now = Date.now()) {
      const cutoff = now - retentionDays * 24 * 60 * 60 * 1000
      return {
        telemetry: pruneTelemetry.run(cutoff).changes,
        traffic: pruneTraffic.run(cutoff).changes,
      }
    },
    stats() {
      return {
        devices: countDevices.get().count,
        telemetry_records: countTelemetry.get().count,
      }
    },
    ping() {
      return db.prepare('SELECT 1 AS ok').get().ok === 1
    },
    close() {
      db.close()
    },
  }
}
