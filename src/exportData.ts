import type { TelemetryRecord } from './telemetry'

function download(name: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

export function exportTelemetryCsv(records: TelemetryRecord[], deviceId: string) {
  const rows = [
    ['received_at', 'device_id', 'latitude', 'longitude', 'altitude_m', 'speed_kmph', 'satellites'],
    ...records.map((record) => [
      new Date(record.received_at).toISOString(),
      record.device_id,
      record.gps.lat,
      record.gps.lon,
      record.gps.alt_m,
      record.gps.speed_kmph,
      record.gps.satellites,
    ]),
  ]
  download(
    `${deviceId}-telemetry.csv`,
    'text/csv;charset=utf-8',
    rows.map((row) => row.map((value) => JSON.stringify(value)).join(',')).join('\n'),
  )
}

export function exportTelemetryGeoJson(records: TelemetryRecord[], deviceId: string) {
  const geojson = {
    type: 'FeatureCollection',
    features: records.filter((record) => record.gps.fix).map((record) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [record.gps.lon, record.gps.lat, record.gps.alt_m] },
      properties: {
        device_id: record.device_id,
        received_at: record.received_at,
        speed_kmph: record.gps.speed_kmph,
      },
    })),
  }
  download(`${deviceId}-telemetry.geojson`, 'application/geo+json', JSON.stringify(geojson, null, 2))
}
