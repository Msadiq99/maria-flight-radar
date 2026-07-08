import cors from 'cors'
import express from 'express'

const PORT = process.env.PORT || 8080
const API_KEY = process.env.API_KEY || 'change-me'
const MAX_HISTORY_PER_DEVICE = 500
const TRAFFIC_SOURCE = process.env.TRAFFIC_SOURCE || 'mock'
const OPENSKY_USERNAME = process.env.OPENSKY_USERNAME || ''
const OPENSKY_PASSWORD = process.env.OPENSKY_PASSWORD || ''

// In-memory only: history is lost on restart. Fine for local dev/testing,
// swap for a real datastore before relying on this for anything durable.
const telemetryByDevice = new Map()

const app = express()
app.use(cors())
app.use(express.json())

function toNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function offsetPosition(lat, lon, northKm, eastKm) {
  const latOffset = northKm / 111.32
  const lonOffset = eastKm / (111.32 * Math.cos((lat * Math.PI) / 180))
  return {
    lat: lat + latOffset,
    lon: lon + lonOffset,
  }
}

function mockNearbyAircraft(lat, lon) {
  const now = Date.now()
  const phase = now / 60000
  const templates = [
    { callsign: 'SVA104', northKm: 8, eastKm: -12, altitude_m: 6700, velocity_kmph: 735, heading_deg: 118, vertical_rate_mps: 3.2 },
    { callsign: 'QTR812', northKm: -15, eastKm: 9, altitude_m: 9200, velocity_kmph: 810, heading_deg: 292, vertical_rate_mps: -1.1 },
    { callsign: 'UAE563', northKm: 18, eastKm: 19, altitude_m: 7600, velocity_kmph: 690, heading_deg: 44, vertical_rate_mps: 0.2 },
    { callsign: 'FAD321', northKm: -6, eastKm: -18, altitude_m: 2400, velocity_kmph: 410, heading_deg: 76, vertical_rate_mps: 5.5 },
    { callsign: 'NAS274', northKm: 25, eastKm: -4, altitude_m: 10800, velocity_kmph: 845, heading_deg: 185, vertical_rate_mps: -0.4 },
  ]

  return templates.map((aircraft, index) => {
    const drift = Math.sin(phase + index) * 2
    const position = offsetPosition(lat, lon, aircraft.northKm + drift, aircraft.eastKm - drift)
    return {
      id: `${aircraft.callsign}-${index}`,
      callsign: aircraft.callsign,
      tail_number: `HZ-${aircraft.callsign.slice(0, 3)}`,
      aircraft_type: ['A320', 'B789', 'A388', 'E190', 'A321'][index],
      airline: ['Saudia', 'Qatar Airways', 'Emirates', 'Flyadeal', 'flynas'][index],
      origin: ['RUH', 'DOH', 'DXB', 'JED', 'DMM'][index],
      destination: ['JED', 'RUH', 'BAH', 'DMM', 'MED'][index],
      lat: Number(position.lat.toFixed(6)),
      lon: Number(position.lon.toFixed(6)),
      altitude_m: aircraft.altitude_m,
      velocity_kmph: aircraft.velocity_kmph,
      heading_deg: aircraft.heading_deg,
      vertical_rate_mps: aircraft.vertical_rate_mps,
      source: 'mock',
      updated_at: now,
    }
  })
}

function boundingBox(lat, lon, radiusKm) {
  const latDelta = radiusKm / 111.32
  const lonDelta = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))
  return {
    lamin: lat - latDelta,
    lomin: lon - lonDelta,
    lamax: lat + latDelta,
    lomax: lon + lonDelta,
  }
}

function normalizeOpenSkyState(state, index) {
  const [
    icao24,
    callsign,
    originCountry,
    timePosition,
    lastContact,
    longitude,
    latitude,
    baroAltitude,
    onGround,
    velocity,
    trueTrack,
    verticalRate,
  ] = state

  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    typeof velocity !== 'number' ||
    typeof trueTrack !== 'number'
  ) {
    return null
  }

  return {
    id: icao24 || `opensky-${index}`,
    callsign: String(callsign || icao24 || 'UNKNOWN').trim(),
    tail_number: icao24 || '',
    aircraft_type: '',
    airline: '',
    origin: originCountry || '',
    destination: '',
    lat: latitude,
    lon: longitude,
    altitude_m: typeof baroAltitude === 'number' ? baroAltitude : 0,
    velocity_kmph: velocity * 3.6,
    heading_deg: trueTrack,
    vertical_rate_mps: typeof verticalRate === 'number' ? verticalRate : 0,
    on_ground: Boolean(onGround),
    origin_country: originCountry || '',
    source: 'opensky',
    updated_at: (lastContact || timePosition || Date.now() / 1000) * 1000,
  }
}

async function openSkyNearbyAircraft(lat, lon, radiusKm) {
  const box = boundingBox(lat, lon, radiusKm)
  const params = new URLSearchParams({
    lamin: String(box.lamin),
    lomin: String(box.lomin),
    lamax: String(box.lamax),
    lomax: String(box.lomax),
  })
  const headers = {}

  if (OPENSKY_USERNAME && OPENSKY_PASSWORD) {
    headers.Authorization = `Basic ${Buffer.from(`${OPENSKY_USERNAME}:${OPENSKY_PASSWORD}`).toString('base64')}`
  }

  const response = await fetch(`https://opensky-network.org/api/states/all?${params}`, { headers })
  if (!response.ok) {
    throw new Error(`OpenSky returned ${response.status}`)
  }

  const data = await response.json()
  const states = Array.isArray(data.states) ? data.states : []
  return states.map(normalizeOpenSkyState).filter(Boolean).slice(0, 50)
}

function isValidTelemetry(body) {
  const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
  const isNumber = (value) => typeof value === 'number' && Number.isFinite(value)
  const isBoolean = (value) => typeof value === 'boolean'

  return (
    isObject(body) &&
    typeof body.device_id === 'string' &&
    body.device_id.trim().length > 0 &&
    isNumber(body.uptime_ms) &&
    isObject(body.gps) &&
    isBoolean(body.gps.fix) &&
    isNumber(body.gps.lat) &&
    isNumber(body.gps.lon) &&
    isNumber(body.gps.alt_m) &&
    isNumber(body.gps.speed_kmph) &&
    isNumber(body.gps.course_deg) &&
    isNumber(body.gps.satellites) &&
    isObject(body.imu) &&
    isBoolean(body.imu.valid) &&
    isObject(body.imu.accel) &&
    isNumber(body.imu.accel.x) &&
    isNumber(body.imu.accel.y) &&
    isNumber(body.imu.accel.z) &&
    isObject(body.imu.gyro) &&
    isNumber(body.imu.gyro.x) &&
    isNumber(body.imu.gyro.y) &&
    isNumber(body.imu.gyro.z) &&
    isNumber(body.imu.temp_c)
  )
}

app.post('/api/telemetry', (req, res) => {
  if (req.get('X-API-Key') !== API_KEY) {
    return res.status(401).json({ error: 'invalid API key' })
  }

  if (!isValidTelemetry(req.body)) {
    return res.status(400).json({ error: 'malformed telemetry payload' })
  }

  const record = { ...req.body, received_at: Date.now() }
  const deviceId = record.device_id

  const history = telemetryByDevice.get(deviceId) || []
  history.push(record)
  if (history.length > MAX_HISTORY_PER_DEVICE) {
    history.shift()
  }
  telemetryByDevice.set(deviceId, history)

  console.log(
    `[telemetry] ${deviceId} fix=${record.gps.fix} sats=${record.gps.satellites} ` +
      `accel=(${record.imu.accel?.x?.toFixed(2)},${record.imu.accel?.y?.toFixed(2)},${record.imu.accel?.z?.toFixed(2)})g`,
  )

  res.status(200).json({ ok: true })
})

app.get('/api/telemetry/latest', (req, res) => {
  const deviceId = req.query.device_id
  if (!deviceId) {
    return res.status(400).json({ error: 'device_id query param required' })
  }

  const history = telemetryByDevice.get(deviceId)
  if (!history || history.length === 0) {
    return res.status(404).json({ error: 'no telemetry for device' })
  }

  res.json(history[history.length - 1])
})

app.get('/api/telemetry/history', (req, res) => {
  const deviceId = req.query.device_id
  if (!deviceId) {
    return res.status(400).json({ error: 'device_id query param required' })
  }

  const limit = Math.min(Number(req.query.limit) || 50, MAX_HISTORY_PER_DEVICE)
  const history = telemetryByDevice.get(deviceId) || []
  res.json(history.slice(-limit))
})

app.get('/api/traffic/nearby', async (req, res) => {
  const lat = toNumber(req.query.lat, null)
  const lon = toNumber(req.query.lon, null)
  const radiusKm = Math.min(Math.max(toNumber(req.query.radius_km, 50), 5), 250)
  if (lat === null || lon === null) {
    return res.status(400).json({ error: 'lat and lon query params required' })
  }

  if (TRAFFIC_SOURCE === 'opensky') {
    try {
      const aircraft = await openSkyNearbyAircraft(lat, lon, radiusKm)
      return res.json({
        source: 'opensky',
        requested_source: TRAFFIC_SOURCE,
        center: { lat, lon },
        radius_km: radiusKm,
        updated_at: Date.now(),
        aircraft,
      })
    } catch (error) {
      console.warn(`[traffic] OpenSky unavailable, falling back to mock: ${error.message}`)
    }
  }

  res.json({
    source: 'mock',
    requested_source: TRAFFIC_SOURCE,
    center: { lat, lon },
    radius_km: radiusKm,
    updated_at: Date.now(),
    aircraft: mockNearbyAircraft(lat, lon),
  })
})

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.listen(PORT, () => {
  console.log(`[server] listening on port ${PORT}`)
})
