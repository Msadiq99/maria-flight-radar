import { useEffect, useState } from 'react'
import { API_BASE_URL, POLL_INTERVAL_MS } from './config'

export type AircraftTraffic = {
  id: string
  callsign: string
  tail_number: string
  aircraft_type: string
  airline: string
  origin: string
  destination: string
  lat: number
  lon: number
  altitude_m: number
  velocity_kmph: number
  heading_deg: number
  vertical_rate_mps: number
  source: TrafficSource
  updated_at: number
}

export type TrafficSource = 'mock' | 'opensky'

export type TrafficFeed = {
  source: TrafficSource
  requested_source: TrafficSource
  updated_at: number
  aircraft: AircraftTraffic[]
}

const EMPTY_FEED: TrafficFeed = {
  source: 'mock',
  requested_source: 'mock',
  updated_at: 0,
  aircraft: [],
}

async function fetchNearbyTraffic(
  lat: number,
  lon: number,
  radiusKm: number,
  signal: AbortSignal,
): Promise<TrafficFeed> {
  const res = await fetch(
    `${API_BASE_URL}/api/traffic/nearby?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`,
    { signal },
  )
  if (!res.ok) {
    throw new Error(`backend returned ${res.status}`)
  }
  return res.json()
}

export function useNearbyTraffic(lat: number | null, lon: number | null, radiusKm: number) {
  const [feed, setFeed] = useState<TrafficFeed>(EMPTY_FEED)
  const [unreachable, setUnreachable] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [trails, setTrails] = useState<Record<string, [number, number][]>>({})

  useEffect(() => {
    if (lat === null || lon === null) {
      setFeed(EMPTY_FEED)
      setUnreachable(false)
      return
    }

    let cancelled = false
    let timeoutId: number | undefined
    let controller: AbortController | undefined
    const centerLat = lat
    const centerLon = lon
    const radius = radiusKm

    async function poll() {
      controller = new AbortController()
      try {
        const nearbyFeed = await fetchNearbyTraffic(centerLat, centerLon, radius, controller.signal)
        if (!cancelled) {
          setFeed(nearbyFeed)
          setTrails((current) => {
            const next = { ...current }
            for (const item of nearbyFeed.aircraft) {
              const point: [number, number] = [item.lat, item.lon]
              next[item.id] = [...(next[item.id] || []), point].slice(-30)
            }
            return next
          })
          setUnreachable(false)
        }
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === 'AbortError')) {
          setUnreachable(true)
        }
      } finally {
        if (!cancelled) {
          timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS * 2)
        }
      }
    }

    poll()
    return () => {
      cancelled = true
      controller?.abort()
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
      }
    }
  }, [lat, lon, radiusKm])

  useEffect(() => {
    const tickId = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(tickId)
  }, [])

  const stale = feed.updated_at > 0 && now - feed.updated_at > POLL_INTERVAL_MS * 6

  return { aircraft: feed.aircraft, feed, unreachable, stale, trails }
}
