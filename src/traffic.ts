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

async function fetchNearbyTraffic(lat: number, lon: number, radiusKm: number): Promise<TrafficFeed> {
  const res = await fetch(`${API_BASE_URL}/api/traffic/nearby?lat=${lat}&lon=${lon}&radius_km=${radiusKm}`)
  if (!res.ok) {
    throw new Error(`backend returned ${res.status}`)
  }
  return res.json()
}

export function useNearbyTraffic(lat: number | null, lon: number | null, radiusKm: number) {
  const [feed, setFeed] = useState<TrafficFeed>(EMPTY_FEED)
  const [unreachable, setUnreachable] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (lat === null || lon === null) {
      setFeed(EMPTY_FEED)
      return
    }

    let cancelled = false
    const centerLat = lat
    const centerLon = lon
    const radius = radiusKm

    async function poll() {
      try {
        const nearbyFeed = await fetchNearbyTraffic(centerLat, centerLon, radius)
        if (!cancelled) {
          setFeed(nearbyFeed)
          setUnreachable(false)
        }
      } catch {
        if (!cancelled) {
          setUnreachable(true)
        }
      }
    }

    poll()
    const pollId = setInterval(poll, POLL_INTERVAL_MS * 2)
    return () => {
      cancelled = true
      clearInterval(pollId)
    }
  }, [lat, lon, radiusKm])

  useEffect(() => {
    const tickId = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(tickId)
  }, [])

  const stale = feed.updated_at > 0 && now - feed.updated_at > POLL_INTERVAL_MS * 6

  return { aircraft: feed.aircraft, feed, unreachable, stale }
}
