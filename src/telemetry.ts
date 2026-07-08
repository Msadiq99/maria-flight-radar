import { useEffect, useState } from 'react'
import { API_BASE_URL, DEVICE_ID, POLL_INTERVAL_MS } from './config'

export type TelemetryRecord = {
  device_id: string
  uptime_ms: number
  gps: {
    fix: boolean
    lat: number
    lon: number
    alt_m: number
    speed_kmph: number
    course_deg: number
    satellites: number
  }
  imu: {
    valid: boolean
    accel: { x: number; y: number; z: number }
    gyro: { x: number; y: number; z: number }
    temp_c: number
  }
  received_at: number
}

// A device counts as "stale" once it's missed several telemetry beats —
// one missed beat could just be a slow network hop, not a real problem.
const STALE_AFTER_MS = POLL_INTERVAL_MS * 5

export type DeviceStatus = 'waiting' | 'online' | 'stale' | 'unreachable'

async function fetchLatest(): Promise<TelemetryRecord | null> {
  const res = await fetch(`${API_BASE_URL}/api/telemetry/latest?device_id=${DEVICE_ID}`)
  if (res.status === 404) {
    return null
  }
  if (!res.ok) {
    throw new Error(`backend returned ${res.status}`)
  }
  return res.json()
}

async function fetchHistory(): Promise<TelemetryRecord[]> {
  const res = await fetch(`${API_BASE_URL}/api/telemetry/history?device_id=${DEVICE_ID}&limit=60`)
  if (!res.ok) {
    throw new Error(`backend returned ${res.status}`)
  }
  return res.json()
}

export function useTelemetry() {
  const [record, setRecord] = useState<TelemetryRecord | null>(null)
  const [history, setHistory] = useState<TelemetryRecord[]>([])
  const [unreachable, setUnreachable] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const [latest, latestHistory] = await Promise.all([fetchLatest(), fetchHistory()])
        if (!cancelled) {
          setUnreachable(false)
          setHistory(latestHistory)
          if (latest) {
            setRecord(latest)
          }
        }
      } catch {
        if (!cancelled) {
          setUnreachable(true)
        }
      }
    }

    poll()
    const pollId = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(pollId)
    }
  }, [])

  // Ticks independently of the poll so "last seen Xs ago" stays live
  // even when no new data has arrived.
  useEffect(() => {
    const tickId = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(tickId)
  }, [])

  const status: DeviceStatus = unreachable
    ? 'unreachable'
    : !record
      ? 'waiting'
      : now - record.received_at > STALE_AFTER_MS
        ? 'stale'
        : 'online'

  const secondsSinceUpdate = record ? Math.round((now - record.received_at) / 1000) : null

  return { record, history, status, secondsSinceUpdate }
}
