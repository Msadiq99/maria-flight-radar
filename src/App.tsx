import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { DeviceMap } from './DeviceMap'
import { DEVICE_ID } from './config'
import { useAirports, useDevices } from './devices'
import { exportTelemetryCsv, exportTelemetryGeoJson } from './exportData'
import { translate, type Language } from './i18n'
import { predictFlight, type FlightPrediction } from './flightIntel'
import { useTelemetry, type DeviceStatus, type TelemetryRecord } from './telemetry'
import { useNearbyTraffic } from './traffic'
import {
  DEFAULT_ALERT_RULES,
  usePersistentState,
  type AlertRules,
  type SavedLocation,
} from './radarSettings'

const STATUS_COPY: Record<DeviceStatus, { label: string; className: string }> = {
  waiting: { label: 'Waiting for first telemetry', className: 'status-waiting' },
  online: { label: 'Online', className: 'status-online' },
  stale: { label: 'Stale', className: 'status-stale' },
  unreachable: { label: 'Backend unreachable', className: 'status-unreachable' },
}

function StatusTile({ status, secondsSinceUpdate }: { status: DeviceStatus; secondsSinceUpdate: number | null }) {
  const { label, className } = STATUS_COPY[status]
  return (
    <div className="stat-card">
      <span className="stat-label">Status</span>
      <strong className={`status-value ${className}`}>
        <span className="status-dot" aria-hidden="true" />
        {label}
      </strong>
      {secondsSinceUpdate !== null && status !== 'unreachable' && (
        <span className="status-detail">Last seen {secondsSinceUpdate}s ago</span>
      )}
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-tile">
      <span className="stat-label">{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function formatTime(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(value)
}

function PacketRow({ record }: { record: TelemetryRecord }) {
  return (
    <tr>
      <td>{formatTime(record.received_at)}</td>
      <td>{record.gps.fix ? 'Fix' : 'No fix'}</td>
      <td>{record.gps.satellites}</td>
      <td>{record.gps.speed_kmph.toFixed(1)} km/h</td>
      <td>{record.imu.temp_c.toFixed(1)}°C</td>
    </tr>
  )
}

type AircraftSortKey = 'callsign' | 'distance_km' | 'flyby_probability' | 'minutes_to_closest' | 'altitude_m' | 'velocity_kmph'
type SortDirection = 'asc' | 'desc'

function AircraftRow({ aircraft }: { aircraft: FlightPrediction }) {
  const climb = aircraft.vertical_rate_mps > 0.5 ? 'Climb' : aircraft.vertical_rate_mps < -0.5 ? 'Descend' : 'Level'
  return (
    <tr>
      <td>
        <a href={aircraft.fr24_url} target="_blank" rel="noreferrer">
          {aircraft.callsign}
        </a>
      </td>
      <td>{aircraft.tail_number || '—'}</td>
      <td>
        {aircraft.aircraft_type ? (
          <a href={aircraft.skybrary_url} target="_blank" rel="noreferrer">
            {aircraft.aircraft_type}
          </a>
        ) : (
          '—'
        )}
      </td>
      <td>{aircraft.airline || '—'}</td>
      <td>{aircraft.origin || '—'} → {aircraft.destination || '—'}</td>
      <td>{aircraft.distance_km.toFixed(1)} km</td>
      <td>{aircraft.flyby_probability}%</td>
      <td>{aircraft.minutes_to_closest.toFixed(0)} min</td>
      <td>{aircraft.closest_distance_km.toFixed(1)} km</td>
      <td>{aircraft.altitude_separation_m.toFixed(0)} m</td>
      <td>{aircraft.prediction_confidence}%</td>
      <td>{aircraft.approach_direction}</td>
      <td>{aircraft.altitude_m.toLocaleString()} m</td>
      <td>{aircraft.velocity_kmph.toFixed(0)} km/h</td>
      <td>{aircraft.heading_deg.toFixed(0)}°</td>
      <td>{climb}</td>
    </tr>
  )
}

function SortButton({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string
  sortKey: AircraftSortKey
  activeKey: AircraftSortKey
  direction: SortDirection
  onSort: (key: AircraftSortKey) => void
}) {
  return (
    <button className="sort-button" type="button" onClick={() => onSort(sortKey)}>
      {label}{activeKey === sortKey ? (direction === 'asc' ? ' ↑' : ' ↓') : ''}
    </button>
  )
}

function App() {
  const sharedParams = useMemo(() => new URLSearchParams(window.location.search), [])
  const devices = useDevices()
  const airports = useAirports()
  const [selectedDeviceId, setSelectedDeviceId] = useState(sharedParams.get('device') || DEVICE_ID)
  const { record, history, status, secondsSinceUpdate } = useTelemetry(selectedDeviceId)
  const hasFix = record?.gps.fix === true
  const [monitorLat, setMonitorLat] = useState(sharedParams.get('lat') || '')
  const [monitorLon, setMonitorLon] = useState(sharedParams.get('lon') || '')
  const [radiusKm, setRadiusKm] = useState(Number(sharedParams.get('radius')) || 50)
  const [sortKey, setSortKey] = useState<AircraftSortKey>('flyby_probability')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [playbackIndex, setPlaybackIndex] = useState<number | null>(null)
  const [savedLocations, setSavedLocations] = usePersistentState<SavedLocation[]>('maria.saved-locations', [])
  const [alertRules, setAlertRules] = usePersistentState<AlertRules>('maria.alert-rules', DEFAULT_ALERT_RULES)
  const [language, setLanguage] = usePersistentState<Language>('maria.language', 'en')
  const [theme, setTheme] = usePersistentState<'system' | 'light' | 'dark'>('maria.theme', 'system')
  const [highContrast, setHighContrast] = usePersistentState('maria.high-contrast', false)
  const notifiedAircraft = useRef(new Set<string>())
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key)
  const targetLat = monitorLat.trim() ? Number(monitorLat) : hasFix && record ? record.gps.lat : null
  const targetLon = monitorLon.trim() ? Number(monitorLon) : hasFix && record ? record.gps.lon : null
  const validTargetLat = Number.isFinite(targetLat) ? targetLat : null
  const validTargetLon = Number.isFinite(targetLon) ? targetLon : null
  const {
    aircraft,
    feed: trafficFeed,
    unreachable: trafficUnreachable,
    stale: trafficStale,
    trails: aircraftTrails,
  } = useNearbyTraffic(
    validTargetLat,
    validTargetLon,
    radiusKm,
  )
  const fixedHistory = history.filter((entry) => entry.gps.fix)
  const trail = fixedHistory.map((entry): [number, number] => [entry.gps.lat, entry.gps.lon])
  const playbackRecord = playbackIndex === null ? record : fixedHistory[playbackIndex] ?? record
  const packetStats = useMemo(() => {
    if (history.length === 0) {
      return { fixes: 0, maxSpeed: null as number | null, avgTemp: null as number | null }
    }

    const maxSpeed = Math.max(...history.map((entry) => entry.gps.speed_kmph))
    const avgTemp = history.reduce((sum, entry) => sum + entry.imu.temp_c, 0) / history.length
    return {
      fixes: history.filter((entry) => entry.gps.fix).length,
      maxSpeed,
      avgTemp,
    }
  }, [history])
  const recentPackets = history.slice(-8).reverse()
  const predictedAircraft = useMemo(() => {
    if (validTargetLat === null || validTargetLon === null) {
      return []
    }

    return aircraft.map((item) => predictFlight(
      item,
      validTargetLat,
      validTargetLon,
      radiusKm,
      hasFix && record ? record.gps.alt_m : 0,
    ))
  }, [aircraft, hasFix, radiusKm, record, validTargetLat, validTargetLon])
  const sortedAircraft = useMemo(() => {
    return [...predictedAircraft].sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1
      if (sortKey === 'callsign') {
        return a.callsign.localeCompare(b.callsign) * multiplier
      }
      return (Number(a[sortKey]) - Number(b[sortKey])) * multiplier
    })
  }, [predictedAircraft, sortDirection, sortKey])
  function handleSort(nextKey: AircraftSortKey) {
    if (nextKey === sortKey) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }
    setSortKey(nextKey)
    setSortDirection(nextKey === 'distance_km' || nextKey === 'minutes_to_closest' || nextKey === 'callsign' ? 'asc' : 'desc')
  }
  const flybySchedule = sortedAircraft
    .filter((item) => item.flyby_probability >= 35)
    .sort((a, b) => a.minutes_to_closest - b.minutes_to_closest)
  const trafficStats = useMemo(() => {
    if (predictedAircraft.length === 0) {
      return { highest: null as number | null, fastest: null as number | null, climbing: 0 }
    }

    return {
      highest: Math.max(...predictedAircraft.map((item) => item.altitude_m)),
      fastest: Math.max(...predictedAircraft.map((item) => item.velocity_kmph)),
      climbing: predictedAircraft.filter((item) => item.vertical_rate_mps > 0.5).length,
    }
  }, [predictedAircraft])
  const trafficStatus = trafficUnreachable
    ? 'Traffic feed unavailable'
    : trafficStale
      ? 'Traffic feed stale'
      : `${predictedAircraft.length} aircraft visible`
  const trafficSourceLabel =
    trafficFeed.source === trafficFeed.requested_source
      ? trafficFeed.source
      : `${trafficFeed.source} fallback`

  useEffect(() => {
    if (!alertRules.enabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return
    }
    const hour = new Date().getHours()
    const quiet = alertRules.quietStart > alertRules.quietEnd
      ? hour >= alertRules.quietStart || hour < alertRules.quietEnd
      : hour >= alertRules.quietStart && hour < alertRules.quietEnd
    if (quiet) return

    for (const item of predictedAircraft) {
      const matches =
        item.flyby_probability >= alertRules.minScore &&
        item.altitude_m <= alertRules.maxAltitudeM &&
        (!alertRules.callsign || item.callsign.toLowerCase().includes(alertRules.callsign.toLowerCase())) &&
        (!alertRules.airline || item.airline.toLowerCase().includes(alertRules.airline.toLowerCase()))
      const alertKey = `${item.id}:${Math.floor(item.updated_at / 60_000)}`
      if (matches && !notifiedAircraft.current.has(alertKey)) {
        notifiedAircraft.current.add(alertKey)
        new Notification(`${item.callsign} flyby alert`, {
          body: `${item.flyby_probability}% score · ${item.closest_distance_km.toFixed(1)} km horizontal CPA · ${item.altitude_separation_m.toFixed(0)} m vertical`,
        })
      }
    }
  }, [alertRules, predictedAircraft])

  function saveCurrentLocation() {
    if (validTargetLat === null || validTargetLon === null) return
    const name = window.prompt('Location name')
    if (!name?.trim()) return
    setSavedLocations((current) => [...current, {
      id: crypto.randomUUID(),
      name: name.trim(),
      lat: validTargetLat,
      lon: validTargetLon,
      radiusKm,
    }])
  }

  useEffect(() => {
    const root = document.documentElement
    root.lang = language
    root.dir = language === 'ar' ? 'rtl' : 'ltr'
    root.dataset.theme = theme
    root.dataset.contrast = highContrast ? 'high' : 'normal'
  }, [highContrast, language, theme])

  async function copyShareLink() {
    const url = new URL(window.location.href)
    url.search = ''
    url.searchParams.set('device', selectedDeviceId)
    if (validTargetLat !== null) url.searchParams.set('lat', String(validTargetLat))
    if (validTargetLon !== null) url.searchParams.set('lon', String(validTargetLon))
    url.searchParams.set('radius', String(radiusKm))
    await navigator.clipboard.writeText(url.toString())
  }

  return (
    <main className="app-shell">
      <nav className="app-toolbar" aria-label={t('settings')}>
        <strong>{t('title')}</strong>
        <a href="#map">{t('airspace')}</a>
        <a href="#alerts">{t('alerts')}</a>
        <a href="#history">{t('history')}</a>
        <select value={language} onChange={(event) => setLanguage(event.target.value as Language)} aria-label="Language">
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </select>
        <select value={theme} onChange={(event) => setTheme(event.target.value as typeof theme)} aria-label="Theme">
          <option value="system">System</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
        <button type="button" onClick={() => setHighContrast((current) => !current)}>
          {highContrast ? 'Standard contrast' : 'High contrast'}
        </button>
      </nav>
      <header className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">{t('title')} • {t('liveTracker')}</p>
          <h1>Real-time position and orientation for {selectedDeviceId}.</h1>
          <p>Streaming GPS and IMU telemetry straight from the tracker unit.</p>
          <label>
            <span>Tracker</span>
            <select value={selectedDeviceId} onChange={(event) => setSelectedDeviceId(event.target.value)}>
              {devices.map((device) => (
                <option key={device.device_id} value={device.device_id}>{device.device_id}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="hero-stats" aria-label="Device status overview">
          <StatusTile status={status} secondsSinceUpdate={secondsSinceUpdate} />
          <div className="stat-card">
            <span className="stat-label">GPS fix</span>
            <strong>{record ? (record.gps.fix ? 'Yes' : 'No') : '—'}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Satellites</span>
            <strong>{record ? record.gps.satellites : '—'}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Speed</span>
            <strong>{record ? `${record.gps.speed_kmph.toFixed(1)} km/h` : '—'}</strong>
          </div>
        </div>
      </header>

      <section className="map-panel" id="map">
        {validTargetLat !== null && validTargetLon !== null ? (
          <DeviceMap
            centerLat={validTargetLat}
            centerLon={validTargetLon}
            deviceLat={playbackRecord?.gps.fix ? playbackRecord.gps.lat : null}
            deviceLon={playbackRecord?.gps.fix ? playbackRecord.gps.lon : null}
            deviceId={selectedDeviceId}
            trail={trail}
            aircraft={predictedAircraft}
            aircraftTrails={aircraftTrails}
            radiusKm={radiusKm}
            airports={airports}
            geofences={savedLocations}
          />
        ) : (
          <div className="map-placeholder">
            <p>No GPS fix yet</p>
            <span>The tracker hasn't reported a valid position. The map appears once it does.</span>
          </div>
        )}
      </section>

      <section className="panel" id="alerts">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Automation</p>
            <h2>{t('alerts')}</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              if (typeof Notification !== 'undefined') {
                void Notification.requestPermission()
              }
            }}
          >
            Enable browser notifications
          </button>
        </div>
        <div className="control-grid">
          <label>
            <span>Alerts</span>
            <select
              value={alertRules.enabled ? 'on' : 'off'}
              onChange={(event) => setAlertRules({ ...alertRules, enabled: event.target.value === 'on' })}
            >
              <option value="off">Off</option>
              <option value="on">On</option>
            </select>
          </label>
          <label>
            <span>Minimum score</span>
            <input
              type="number"
              min="0"
              max="100"
              value={alertRules.minScore}
              onChange={(event) => setAlertRules({ ...alertRules, minScore: Number(event.target.value) })}
            />
          </label>
          <label>
            <span>Maximum altitude (m)</span>
            <input
              type="number"
              min="0"
              value={alertRules.maxAltitudeM}
              onChange={(event) => setAlertRules({ ...alertRules, maxAltitudeM: Number(event.target.value) })}
            />
          </label>
          <label>
            <span>Callsign contains</span>
            <input value={alertRules.callsign} onChange={(event) => setAlertRules({ ...alertRules, callsign: event.target.value })} />
          </label>
          <label>
            <span>Airline contains</span>
            <input value={alertRules.airline} onChange={(event) => setAlertRules({ ...alertRules, airline: event.target.value })} />
          </label>
          <label>
            <span>Quiet hours</span>
            <div>
              <input
                aria-label="Quiet hours start"
                type="number"
                min="0"
                max="23"
                value={alertRules.quietStart}
                onChange={(event) => setAlertRules({ ...alertRules, quietStart: Number(event.target.value) })}
              />
              <input
                aria-label="Quiet hours end"
                type="number"
                min="0"
                max="23"
                value={alertRules.quietEnd}
                onChange={(event) => setAlertRules({ ...alertRules, quietEnd: Number(event.target.value) })}
              />
            </div>
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">{t('airspace')}</p>
            <h2>{t('nearbyAircraft')}</h2>
          </div>
          <p>{trafficStatus}</p>
        </div>
        <div className="stat-grid">
          <StatTile label="Tracked aircraft" value={`${predictedAircraft.length}`} />
          <StatTile label="Traffic source" value={trafficSourceLabel} />
          <StatTile label="Highest" value={trafficStats.highest === null ? '—' : `${trafficStats.highest.toLocaleString()} m`} />
          <StatTile label="Fastest" value={trafficStats.fastest === null ? '—' : `${trafficStats.fastest.toFixed(0)} km/h`} />
        </div>
        <div className="control-grid">
          <label>
            <span>Latitude</span>
            <input value={monitorLat} onChange={(event) => setMonitorLat(event.target.value)} placeholder={record?.gps.lat.toFixed(6) ?? '24.713600'} />
          </label>
          <label>
            <span>Saved location</span>
            <select
              defaultValue=""
              onChange={(event) => {
                const location = savedLocations.find((item) => item.id === event.target.value)
                if (!location) return
                setMonitorLat(String(location.lat))
                setMonitorLon(String(location.lon))
                setRadiusKm(location.radiusKm)
              }}
            >
              <option value="">Choose…</option>
              {savedLocations.map((location) => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={saveCurrentLocation}>Save location</button>
          <label>
            <span>Longitude</span>
            <input value={monitorLon} onChange={(event) => setMonitorLon(event.target.value)} placeholder={record?.gps.lon.toFixed(6) ?? '46.675300'} />
          </label>
          <label>
            <span>Radius</span>
            <input min="5" max="250" type="number" value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value) || 50)} />
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th><SortButton label="Callsign" sortKey="callsign" activeKey={sortKey} direction={sortDirection} onSort={handleSort} /></th>
                <th>Tail</th>
                <th>Type</th>
                <th>Airline</th>
                <th>Route</th>
                <th><SortButton label="Distance" sortKey="distance_km" activeKey={sortKey} direction={sortDirection} onSort={handleSort} /></th>
                <th><SortButton label="Flyby" sortKey="flyby_probability" activeKey={sortKey} direction={sortDirection} onSort={handleSort} /></th>
                <th><SortButton label="ETA" sortKey="minutes_to_closest" activeKey={sortKey} direction={sortDirection} onSort={handleSort} /></th>
                <th>Closest</th>
                <th>Vertical CPA</th>
                <th>Confidence</th>
                <th>Approach</th>
                <th><SortButton label="Altitude" sortKey="altitude_m" activeKey={sortKey} direction={sortDirection} onSort={handleSort} /></th>
                <th><SortButton label="Speed" sortKey="velocity_kmph" activeKey={sortKey} direction={sortDirection} onSort={handleSort} /></th>
                <th>Heading</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {sortedAircraft.length > 0 ? (
                sortedAircraft.map((item) => <AircraftRow key={item.id} aircraft={item} />)
              ) : (
                <tr>
                  <td colSpan={16}>Waiting for a tracker position</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Flybys</p>
            <h2>{t('flybys')}</h2>
          </div>
          <p>{flybySchedule.length} likely flybys</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ETA</th>
                <th>Callsign</th>
                <th>Probability</th>
                <th>Closest distance</th>
                <th>Vertical separation</th>
                <th>Confidence</th>
                <th>Approach</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {flybySchedule.length > 0 ? (
                flybySchedule.map((item) => (
                  <tr key={`${item.id}-flyby`}>
                    <td>{item.minutes_to_closest.toFixed(0)} min</td>
                    <td>{item.callsign}</td>
                    <td>{item.flyby_probability}%</td>
                    <td>{item.closest_distance_km.toFixed(1)} km</td>
                    <td>{item.altitude_separation_m.toFixed(0)} m</td>
                    <td>{item.prediction_confidence}%</td>
                    <td>{item.approach_direction}</td>
                    <td>
                      <a href={item.fr24_url} target="_blank" rel="noreferrer">FR24</a>
                      {' · '}
                      <a href={item.skybrary_url} target="_blank" rel="noreferrer">Skybrary</a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8}>No predicted flybys inside the current radius</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" id="history">
        <div className="panel-header">
          <div>
            <p className="eyebrow">History</p>
            <h2>{t('history')}</h2>
          </div>
          <p>{history.length} packets cached</p>
        </div>
        <div className="stat-grid">
          <StatTile label="Packets with fix" value={`${packetStats.fixes}/${history.length}`} />
          <StatTile label="Max speed" value={packetStats.maxSpeed === null ? '—' : `${packetStats.maxSpeed.toFixed(1)} km/h`} />
          <StatTile label="Average IMU temp" value={packetStats.avgTemp === null ? '—' : `${packetStats.avgTemp.toFixed(1)}°C`} />
          <StatTile label="Trail points" value={`${trail.length}`} />
          <StatTile label="Battery" value={record?.diagnostics ? `${record.diagnostics.battery_percent}%` : '—'} />
          <StatTile label="Wi-Fi RSSI" value={record?.diagnostics ? `${record.diagnostics.wifi_rssi_dbm} dBm` : '—'} />
          <StatTile label="Firmware" value={record?.diagnostics?.firmware_version ?? '—'} />
          <StatTile label="Delivery failures" value={record?.diagnostics ? `${record.diagnostics.delivery_failures}` : '—'} />
        </div>
        {fixedHistory.length > 1 && (
          <div className="control-grid">
            <label>
              <span>Track playback</span>
              <input
                type="range"
                min="0"
                max={fixedHistory.length - 1}
                value={playbackIndex ?? fixedHistory.length - 1}
                onChange={(event) => setPlaybackIndex(Number(event.target.value))}
              />
            </label>
            <button type="button" onClick={() => setPlaybackIndex(null)}>Return to live</button>
            <span>
              {playbackIndex === null
                ? 'Live'
                : formatTime(fixedHistory[playbackIndex]?.received_at ?? Date.now())}
            </span>
          </div>
        )}
        <div className="control-grid">
          <button type="button" onClick={() => exportTelemetryCsv(history, selectedDeviceId)}>{t('exportCsv')}</button>
          <button type="button" onClick={() => exportTelemetryGeoJson(history, selectedDeviceId)}>{t('exportGeoJson')}</button>
          <button type="button" onClick={() => void copyShareLink()}>{t('copyLink')}</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>GPS</th>
                <th>Sats</th>
                <th>Speed</th>
                <th>Temp</th>
              </tr>
            </thead>
            <tbody>
              {recentPackets.length > 0 ? (
                recentPackets.map((entry) => <PacketRow key={entry.received_at} record={entry} />)
              ) : (
                <tr>
                  <td colSpan={5}>Waiting for telemetry packets</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Position</p>
            <h2>{t('position')}</h2>
          </div>
        </div>
        <div className="stat-grid">
          <StatTile label="Latitude" value={record ? record.gps.lat.toFixed(6) : '—'} />
          <StatTile label="Longitude" value={record ? record.gps.lon.toFixed(6) : '—'} />
          <StatTile label="Altitude" value={record ? `${record.gps.alt_m.toFixed(1)} m` : '—'} />
          <StatTile label="Course" value={record ? `${record.gps.course_deg.toFixed(1)}°` : '—'} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Orientation</p>
            <h2>{t('orientation')}</h2>
          </div>
          <p>{record ? (record.imu.valid ? 'Sensor OK' : 'No sensor data') : '—'}</p>
        </div>
        <div className="stat-grid">
          <StatTile label="Accel X" value={record ? `${record.imu.accel.x.toFixed(2)} g` : '—'} />
          <StatTile label="Accel Y" value={record ? `${record.imu.accel.y.toFixed(2)} g` : '—'} />
          <StatTile label="Accel Z" value={record ? `${record.imu.accel.z.toFixed(2)} g` : '—'} />
          <StatTile label="Gyro X" value={record ? `${record.imu.gyro.x.toFixed(2)} deg/s` : '—'} />
          <StatTile label="Gyro Y" value={record ? `${record.imu.gyro.y.toFixed(2)} deg/s` : '—'} />
          <StatTile label="Gyro Z" value={record ? `${record.imu.gyro.z.toFixed(2)} deg/s` : '—'} />
          <StatTile label="Temperature" value={record ? `${record.imu.temp_c.toFixed(1)}°C` : '—'} />
        </div>
      </section>
    </main>
  )
}

export default App
