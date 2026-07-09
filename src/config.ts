export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
export const DEVICE_ID = import.meta.env.VITE_DEVICE_ID ?? 'MARIA-001';

// Matches TELEMETRY_INTERVAL_MS in firmware/include/config.h
export const POLL_INTERVAL_MS = 2000;
