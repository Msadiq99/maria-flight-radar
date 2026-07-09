import { useState } from 'react'

export type SavedLocation = {
  id: string
  name: string
  lat: number
  lon: number
  radiusKm: number
}

export type AlertRules = {
  enabled: boolean
  minScore: number
  maxAltitudeM: number
  callsign: string
  airline: string
  quietStart: number
  quietEnd: number
}

export const DEFAULT_ALERT_RULES: AlertRules = {
  enabled: false,
  minScore: 60,
  maxAltitudeM: 12000,
  callsign: '',
  airline: '',
  quietStart: 23,
  quietEnd: 7,
}

export function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) as T : initialValue
    } catch {
      return initialValue
    }
  })

  function update(next: T | ((current: T) => T)) {
    setValue((current) => {
      const resolved = typeof next === 'function'
        ? (next as (current: T) => T)(current)
        : next
      localStorage.setItem(key, JSON.stringify(resolved))
      return resolved
    })
  }

  return [value, update] as const
}
