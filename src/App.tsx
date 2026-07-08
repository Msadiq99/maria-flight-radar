import { useMemo, useState } from 'react'
import './App.css'
import { DeviceMap } from './DeviceMap'
import { DEVICE_ID } from './config'
import { predictFlight, type FlightPrediction } from './flightIntel'
import { useTelemetry, type DeviceStatus, type TelemetryRecord } from './telemetry'
import { useNearbyTraffic } from './traffic'

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
  onSort,
}: {
  label: string
  sortKey: AircraftSortKey
  activeKey: AircraftSortKey
  onSort: (key: AircraftSortKey) => void
}) {
  return (
    <button className="sort-button" type="button" onClick={() => onSort(sortKey)}>
      {label}{activeKey === sortKey ? ' ↓' : ''}
    </button>
  )
}

function App() {
  const { record, history, status, secondsSinceUpdate } = useTelemetry()
  const hasFix = record?.gps.fix === true
  const [monitorLat, setMonitorLat] = useState('')
  const [monitorLon, setMonitorLon] = useState('')
  const [radiusKm, setRadiusKm] = useState(50)
  const [sortKey, setSortKey] = useState<AircraftSortKey>('flyby_probability')
  const targetLat = monitorLat.trim() ? Number(monitorLat) : hasFix && record ? record.gps.lat : null
  const targetLon = monitorLon.trim() ? Number(monitorLon) : hasFix && record ? record.gps.lon : null
  const validTargetLat = Number.isFinite(targetLat) ? targetLat : null
  const validTargetLon = Number.isFinite(targetLon) ? targetLon : null
  const { aircraft, feed: trafficFeed, unreachable: trafficUnreachable, stale: trafficStale } = useNearbyTraffic(
    validTargetLat,
    validTargetLon,
    radiusKm,
  )
  const fixedHistory = history.filter((entry) => entry.gps.fix)
  const trail = fixedHistory.map((entry): [number, number] => [entry.gps.lat, entry.gps.lon])
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

    return aircraft.map((item) => predictFlight(item, validTargetLat, validTargetLon, radiusKm))
  }, [aircraft, radiusKm, validTargetLat, validTargetLon])
  const sortedAircraft = useMemo(() => {
    return [...predictedAircraft].sort((a, b) => {
      if (sortKey === 'callsign') {
        return a.callsign.localeCompare(b.callsign)
      }
      return Number(b[sortKey]) - Number(a[sortKey])
    })
  }, [predictedAircraft, sortKey])
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

  return (
    <main className="app-shell">
      <header className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">MARIA Flight Radar • Live tracker</p>
          <h1>Real-time position and orientation for {DEVICE_ID}.</h1>
          <p>Streaming GPS and IMU telemetry straight from the tracker unit.</p>
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

      <section className="map-panel">
        {hasFix && record ? (
          <DeviceMap
            lat={record.gps.lat}
            lon={record.gps.lon}
            deviceId={DEVICE_ID}
            trail={trail}
            aircraft={predictedAircraft}
          />
        ) : (
          <div className="map-placeholder">
            <p>No GPS fix yet</p>
            <span>The tracker hasn't reported a valid position. The map appears once it does.</span>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Airspace</p>
            <h2>Nearby aircraft</h2>
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
                <th><SortButton label="Callsign" sortKey="callsign" activeKey={sortKey} onSort={setSortKey} /></th>
                <th>Tail</th>
                <th>Type</th>
                <th>Airline</th>
                <th>Route</th>
                <th><SortButton label="Distance" sortKey="distance_km" activeKey={sortKey} onSort={setSortKey} /></th>
                <th><SortButton label="Flyby" sortKey="flyby_probability" activeKey={sortKey} onSort={setSortKey} /></th>
                <th><SortButton label="ETA" sortKey="minutes_to_closest" activeKey={sortKey} onSort={setSortKey} /></th>
                <th>Closest</th>
                <th>Approach</th>
                <th><SortButton label="Altitude" sortKey="altitude_m" activeKey={sortKey} onSort={setSortKey} /></th>
                <th><SortButton label="Speed" sortKey="velocity_kmph" activeKey={sortKey} onSort={setSortKey} /></th>
                <th>Heading</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {sortedAircraft.length > 0 ? (
                sortedAircraft.map((item) => <AircraftRow key={item.id} aircraft={item} />)
              ) : (
                <tr>
                  <td colSpan={14}>Waiting for a tracker position</td>
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
            <h2>Predicted schedule</h2>
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
                  <td colSpan={6}>No predicted flybys inside the current radius</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">History</p>
            <h2>Recent signal</h2>
          </div>
          <p>{history.length} packets cached</p>
        </div>
        <div className="stat-grid">
          <StatTile label="Packets with fix" value={`${packetStats.fixes}/${history.length}`} />
          <StatTile label="Max speed" value={packetStats.maxSpeed === null ? '—' : `${packetStats.maxSpeed.toFixed(1)} km/h`} />
          <StatTile label="Average IMU temp" value={packetStats.avgTemp === null ? '—' : `${packetStats.avgTemp.toFixed(1)}°C`} />
          <StatTile label="Trail points" value={`${trail.length}`} />
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
            <h2>GPS telemetry</h2>
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
            <h2>IMU telemetry</h2>
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
