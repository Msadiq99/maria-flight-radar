import { useEffect, useState } from 'react';
import { API_BASE_URL, DEVICE_ID } from './config';

export type DeviceSummary = {
  device_id: string;
  first_seen_at: number;
  last_seen_at: number;
};

export type Airport = {
  code: string;
  name: string;
  lat: number;
  lon: number;
  runways: string[];
};

export function useDevices() {
  const [devices, setDevices] = useState<DeviceSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/devices`);
        if (!response.ok) return;
        const result = (await response.json()) as DeviceSummary[];
        if (!cancelled) setDevices(result);
      } catch {
        // Device discovery is optional; the configured device remains usable.
      }
    }
    load();
    const timer = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return devices.length > 0
    ? devices
    : [{ device_id: DEVICE_ID, first_seen_at: 0, last_seen_at: 0 }];
}

export function useAirports() {
  const [airports, setAirports] = useState<Airport[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/airports`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : []))
      .then((result: Airport[]) => setAirports(result))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return airports;
}
