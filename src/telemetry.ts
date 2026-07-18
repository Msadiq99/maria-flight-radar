import { useEffect, useState } from 'react';
import { API_BASE_URL, DEVICE_ID, POLL_INTERVAL_MS } from './config';

export type TelemetryRecord = {
  device_id: string;
  uptime_ms: number;
  sequence?: number;
  captured_at?: number;
  diagnostics?: {
    battery_percent: number;
    wifi_rssi_dbm: number;
    free_heap_bytes: number;
    reset_reason: number;
    firmware_version: string;
    delivery_failures: number;
  };
  gps: {
    fix: boolean;
    lat: number;
    lon: number;
    alt_m: number;
    speed_kmph: number;
    course_deg: number;
    satellites: number;
  };
  imu: {
    valid: boolean;
    accel: { x: number; y: number; z: number };
    gyro: { x: number; y: number; z: number };
    temp_c: number;
  };
  received_at: number;
};

// A device counts as "stale" once it's missed several telemetry beats —
// one missed beat could just be a slow network hop, not a real problem.
const STALE_AFTER_MS = POLL_INTERVAL_MS * 5;

export type DeviceStatus = 'waiting' | 'online' | 'stale' | 'unreachable';

async function fetchLatest(
  deviceId: string,
  signal: AbortSignal
): Promise<TelemetryRecord | null> {
  const res = await fetch(
    `${API_BASE_URL}/api/telemetry/latest?device_id=${deviceId}`,
    { signal }
  );
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`backend returned ${res.status}`);
  }
  return res.json();
}

async function fetchHistory(
  deviceId: string,
  signal: AbortSignal
): Promise<TelemetryRecord[]> {
  const res = await fetch(
    `${API_BASE_URL}/api/telemetry/history?device_id=${deviceId}&limit=500`,
    { signal }
  );
  if (!res.ok) {
    throw new Error(`backend returned ${res.status}`);
  }
  return res.json();
}

export function useTelemetry(deviceId = DEVICE_ID) {
  const [record, setRecord] = useState<TelemetryRecord | null>(null);
  const [history, setHistory] = useState<TelemetryRecord[]>([]);
  const [unreachable, setUnreachable] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setRecord(null);
    setHistory([]);
    setUnreachable(false);
    let cancelled = false;
    let timeoutId: number | undefined;
    let controller: AbortController | undefined;

    async function poll() {
      controller = new AbortController();
      try {
        const [latest, latestHistory] = await Promise.all([
          fetchLatest(deviceId, controller.signal),
          fetchHistory(deviceId, controller.signal),
        ]);
        if (!cancelled) {
          setUnreachable(false);
          setHistory(latestHistory);
          if (latest) {
            setRecord(latest);
          }
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
          timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS);
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
  }, [deviceId]);

  useEffect(() => {
    const stream = new EventSource(
      `${API_BASE_URL}/api/telemetry/stream?device_id=${encodeURIComponent(deviceId)}`
    );
    stream.addEventListener('telemetry', (event) => {
      const incoming = JSON.parse(
        (event as MessageEvent).data
      ) as TelemetryRecord;
      setRecord(incoming);
      setUnreachable(false);
      setHistory((current) => {
        const duplicate = current.some((item) =>
          incoming.sequence !== undefined
            ? item.sequence === incoming.sequence
            : item.received_at === incoming.received_at
        );
        return duplicate ? current : [...current, incoming].slice(-500);
      });
    });
    return () => stream.close();
  }, [deviceId]);

  // Ticks independently of the poll so "last seen Xs ago" stays live
  // even when no new data has arrived.
  useEffect(() => {
    const tickId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tickId);
  }, []);

  const status: DeviceStatus = unreachable
    ? 'unreachable'
    : !record
      ? 'waiting'
      : now - record.received_at > STALE_AFTER_MS
        ? 'stale'
        : 'online';

  const secondsSinceUpdate = record
    ? Math.round((now - record.received_at) / 1000)
    : null;

  return { record, history, status, secondsSinceUpdate };
}
