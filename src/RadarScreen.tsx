import { useEffect, useMemo, useState } from 'react';
import { DEVICE_ID } from './config';
import { predictFlight } from './flightIntel';
import {
  bearingDegrees,
  distanceKm,
  projectTarget,
  rangeRingValues,
  type RadarRange,
} from './radarGeometry';
import {
  ALTITUDE_FILTER_LABELS,
  filterAircraftByAltitude,
  nearestVisibleAircraft,
  type AltitudeFilter,
} from './radar/altitudeFilter';
import {
  DEFAULT_RADAR_PREFERENCES,
  loadRadarPreferences,
  saveRadarPreferences,
  type RadarPreferencesV2,
} from './radar/radarPreferences';
import { useTelemetry } from './telemetry';
import { useNearbyTraffic } from './traffic';

const RANGES: RadarRange[] = [25, 50, 100, 200];

function value(value: string | number | undefined, suffix = '') {
  return value === undefined || value === '' ? '—' : `${value}${suffix}`;
}

export function RadarScreen() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [deviceId] = useState(params.get('device') || DEVICE_ID);
  const { record, status, secondsSinceUpdate } = useTelemetry(deviceId);
  const centerLat =
    Number(params.get('lat')) || (record?.gps.fix ? record.gps.lat : null);
  const centerLon =
    Number(params.get('lon')) || (record?.gps.fix ? record.gps.lon : null);
  const [preferences, setPreferences] = useState<RadarPreferencesV2>(() =>
    typeof localStorage === 'undefined'
      ? DEFAULT_RADAR_PREFERENCES
      : loadRadarPreferences()
  );
  const range = preferences.rangeKm;
  const labels = preferences.showLabels;
  const trails = preferences.showTrails;
  const paused = preferences.sweepPaused;
  const autoSelect = preferences.autoSelect;
  const altitudeFilter = preferences.altitudeFilter;
  const [selectedId, setSelectedId] = useState<string | null>(
    params.get('aircraft')
  );
  const updatePreferences = (next: Partial<RadarPreferencesV2>) => {
    setPreferences((current) => {
      const resolved = { ...current, ...next, version: 2 as const };
      if (typeof localStorage !== 'undefined') saveRadarPreferences(resolved);
      return resolved;
    });
  };
  const traffic = useNearbyTraffic(centerLat, centerLon, range);
  const aircraft = useMemo(
    () =>
      centerLat === null || centerLon === null
        ? []
        : traffic.aircraft.map((item) => ({
            ...predictFlight(
              item,
              centerLat,
              centerLon,
              range,
              record?.gps.alt_m || 0
            ),
            lat: item.lat,
            lon: item.lon,
          })),
    [centerLat, centerLon, range, record?.gps.alt_m, traffic.aircraft]
  );
  const inRange = useMemo(
    () => aircraft.filter((item) => item.distance_km <= range),
    [aircraft, range]
  );
  const visibleAircraft = useMemo(
    () => filterAircraftByAltitude(inRange, altitudeFilter),
    [altitudeFilter, inRange]
  );
  const selected =
    visibleAircraft.find((item) => item.id === selectedId) || null;

  useEffect(() => {
    if (selected && visibleAircraft.some((item) => item.id === selected.id)) {
      return;
    }
    if (autoSelect) {
      setSelectedId(nearestVisibleAircraft(visibleAircraft)?.id || null);
    } else if (selectedId && !visibleAircraft.some((item) => item.id === selectedId)) {
      setSelectedId(null);
    }
  }, [autoSelect, selected, selectedId, visibleAircraft]);

  const selectRelative = (step: number) => {
    if (!visibleAircraft.length) return;
    const index = Math.max(
      0,
      visibleAircraft.findIndex((item) => item.id === selectedId)
    );
    setSelectedId(
      visibleAircraft[(index + step + visibleAircraft.length) % visibleAircraft.length].id
    );
  };
  const statusLabel = traffic.unreachable
    ? 'Traffic unreachable'
    : traffic.stale
      ? 'Traffic stale'
      : status;

  return (
    <main className="radar-console">
      <header className="radar-topbar">
        <div>
          <strong>MARIA RADAR</strong>
          <span>MSDK3.dev</span>
        </div>
        <nav aria-label="Primary navigation">
          <a href="/radar">Radar</a>
          <a href="/map">Map</a>
          <a href="/dashboard">Dashboard</a>
          <a href="/dashboard#alerts">Alerts</a>
          <a href="/dashboard#history">History</a>
        </nav>
        <span className="radar-clock">{new Date().toLocaleTimeString()}</span>
      </header>
      <div className="radar-workspace">
        <aside className="radar-panel radar-overview">
          <h1>Radar Console</h1>
          <p className="radar-kicker">LIVE AIRSPACE MONITOR</p>
          <div className="radar-metrics">
            <span>
              Aircraft<strong>{aircraft.length}</strong>
            </span>
            <span>
              Visible<strong>{visibleAircraft.length}</strong>
            </span>
            <span>
              Flyby
              <strong>
                {
                  visibleAircraft.filter((item) => item.flyby_probability >= 35)
                    .length
                }
              </strong>
            </span>
          </div>
          <p className="radar-count">
            {visibleAircraft.length} of {inRange.length} targets visible
          </p>
          <label>
            Range
            <select
              value={range}
              onChange={(event) =>
                updatePreferences({
                  rangeKm: Number(event.target.value) as RadarRange,
                })
              }
            >
              {RANGES.map((item) => (
                <option key={item} value={item}>
                  {item} km
                </option>
              ))}
            </select>
          </label>
          <label>
            Altitude
            <select
              value={altitudeFilter}
              onChange={(event) =>
                updatePreferences({
                  altitudeFilter: event.target.value as AltitudeFilter,
                })
              }
            >
              {Object.entries(ALTITUDE_FILTER_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="radar-check">
            <input
              type="checkbox"
              checked={labels}
              onChange={(event) =>
                updatePreferences({ showLabels: event.target.checked })
              }
            />{' '}
            Show labels
          </label>
          <label className="radar-check">
            <input
              type="checkbox"
              checked={trails}
              onChange={(event) =>
                updatePreferences({ showTrails: event.target.checked })
              }
            />{' '}
            Show trails
          </label>
          <label className="radar-check">
            <input
              type="checkbox"
              checked={autoSelect}
              onChange={(event) =>
                updatePreferences({ autoSelect: event.target.checked })
              }
            />{' '}
            Auto-select nearest
          </label>
          <dl>
            <div>
              <dt>Center</dt>
              <dd>
                {centerLat === null
                  ? '—'
                  : `${centerLat.toFixed(4)}, ${centerLon?.toFixed(4)}`}
              </dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{traffic.feed.source}</dd>
            </div>
            <div>
              <dt>Update</dt>
              <dd>
                {traffic.feed.updated_at
                  ? `${Math.max(0, Math.round((Date.now() - traffic.feed.updated_at) / 1000))}s ago`
                  : '—'}
              </dd>
            </div>
          </dl>
        </aside>
        <section className="radar-scope-panel" aria-label="Radar scope">
          <svg
            className={`radar-scope ${paused ? 'is-paused' : ''}`}
            viewBox="-250 -250 500 500"
            role="img"
            aria-label={`${visibleAircraft.length} of ${inRange.length} aircraft visible`}
          >
            <circle className="radar-boundary" r="220" />
            {rangeRingValues(range).map((ring) => (
              <g key={ring}>
                <circle className="radar-ring" r={(220 * ring) / range} />
                <text
                  className="radar-range-label"
                  x="6"
                  y={(-220 * ring) / range + 14}
                >
                  {ring} km
                </text>
              </g>
            ))}
            <path className="radar-axis" d="M-220 0H220M0-220V220" />
            <text className="radar-direction" x="-5" y="-230">
              N
            </text>
            <text className="radar-direction" x="228" y="5">
              E
            </text>
            <text className="radar-direction" x="-5" y="240">
              S
            </text>
            <text className="radar-direction" x="-240" y="5">
              W
            </text>
            <g className="radar-sweep" aria-hidden="true">
              <path d="M0 0L0-220A220 220 0 0 1 38-217Z" />
            </g>
            <circle className="radar-center" r="5" />
            {trails && centerLat !== null && centerLon !== null
              ? Object.entries(traffic.trails).map(([aircraftId, points]) => {
                  const projected = points
                    .map(([lat, lon]) => {
                      const point = projectTarget(
                        bearingDegrees(centerLat, centerLon, lat, lon),
                        distanceKm(centerLat, centerLon, lat, lon),
                        range,
                        220
                      );
                      return point.visible ? `${point.x},${point.y}` : null;
                    })
                    .filter((point): point is string => point !== null);
                  return projected.length > 1 ? (
                    <polyline
                      key={aircraftId}
                      className="radar-trail"
                      points={projected.join(' ')}
                      aria-label={`Trail for ${aircraftId}`}
                    />
                  ) : null;
                })
              : null}
            {visibleAircraft.map((item) => {
              const p = projectTarget(
                bearingDegrees(
                  centerLat || 0,
                  centerLon || 0,
                  item.lat,
                  item.lon
                ),
                distanceKm(centerLat || 0, centerLon || 0, item.lat, item.lon),
                range,
                220
              );
              const alert = item.flyby_probability >= 65;
              return (
                <g
                  key={item.id}
                  className={`radar-target ${selectedId === item.id ? 'is-selected' : ''} ${alert ? 'is-alert' : ''}`}
                  transform={`translate(${p.x} ${p.y}) rotate(${item.heading_deg})`}
                  onClick={() => setSelectedId(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ')
                      setSelectedId(item.id);
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Select ${item.callsign}`}
                >
                  <path d="M0-10L5 7L0 4L-5 7Z" />
                  {labels && (
                    <text
                      transform={`rotate(${-item.heading_deg})`}
                      x="9"
                      y="4"
                    >
                      {item.callsign}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <div className="radar-controls">
            <button
              type="button"
              onClick={() => selectRelative(-1)}
              aria-label="Previous target"
              disabled={!visibleAircraft.length}
            >
              ◀ Previous
            </button>
            <button
              type="button"
              onClick={() =>
                updatePreferences({ sweepPaused: !preferences.sweepPaused })
              }
            >
              {paused ? 'Resume sweep' : 'Pause sweep'}
            </button>
            <button
              type="button"
              onClick={() => selectRelative(1)}
              aria-label="Next target"
              disabled={!visibleAircraft.length}
            >
              Next ▶
            </button>
            <a className="radar-button" href="/map">
              Open map
            </a>
          </div>
        </section>
        <aside className="radar-panel radar-selected">
          <p className="radar-kicker">SELECTED AIRCRAFT</p>
          {selected ? (
            <>
              <h2>{selected.callsign}</h2>
              <p className="radar-alert-badge">
                {selected.flyby_probability >= 65 ? 'PRIORITY' : 'TRACKING'}
              </p>
              <dl>
                <div>
                  <dt>Type / airline</dt>
                  <dd>
                    {value(selected.aircraft_type)} / {value(selected.airline)}
                  </dd>
                </div>
                <div>
                  <dt>Altitude</dt>
                  <dd>{value(selected.altitude_m.toLocaleString(), ' m')}</dd>
                </div>
                <div>
                  <dt>Speed / heading</dt>
                  <dd>
                    {value(selected.velocity_kmph.toFixed(0), ' km/h')} /{' '}
                    {value(selected.heading_deg.toFixed(0), '°')}
                  </dd>
                </div>
                <div>
                  <dt>Distance / bearing</dt>
                  <dd>
                    {value(selected.distance_km.toFixed(1), ' km')} /{' '}
                    {value(
                      bearingDegrees(
                        centerLat || 0,
                        centerLon || 0,
                        selected.lat,
                        selected.lon
                      ).toFixed(0),
                      '°'
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Flyby probability</dt>
                  <dd>{value(selected.flyby_probability, '%')}</dd>
                </div>
                <div>
                  <dt>Prediction</dt>
                  <dd>
                    {value(selected.prediction_confidence, '% confidence')}
                  </dd>
                </div>
              </dl>
              <a href={selected.fr24_url} target="_blank" rel="noreferrer">
                Open flight details
              </a>
            </>
          ) : (
            <p className="radar-empty">
              {traffic.unreachable
                ? 'Traffic feed unavailable.'
                : visibleAircraft.length
                  ? 'No aircraft selected.'
                  : 'No aircraft match the current filters.'}
            </p>
          )}
        </aside>
      </div>
      <footer className="radar-statusbar">
        <span
          className={`status-${statusLabel === 'online' ? 'online' : 'stale'}`}
        >
          ● {statusLabel}
        </span>
        <span>Tracker {deviceId}</span>
        <span>
          Targets {visibleAircraft.length}/{inRange.length}
        </span>
        <span>Altitude {ALTITUDE_FILTER_LABELS[altitudeFilter]}</span>
        <span>GPS {record ? (record.gps.fix ? 'FIX' : 'NO FIX') : '—'}</span>
        <span>Traffic {traffic.unreachable ? 'UNREACHABLE' : traffic.stale ? 'STALE' : 'LIVE'}</span>
        <span>Range {range} km</span>
        <span>Sweep {paused ? 'PAUSED' : 'RUNNING'}</span>
        <span>SAT {value(record?.gps.satellites)}</span>
        <span>RSSI {value(record?.diagnostics?.wifi_rssi_dbm, ' dBm')}</span>
        <span>BAT {value(record?.diagnostics?.battery_percent, '%')}</span>
        <span>FW {value(record?.diagnostics?.firmware_version)}</span>
        <span>
          {secondsSinceUpdate === null
            ? '—'
            : `${secondsSinceUpdate}s since telemetry`}
        </span>
      </footer>
    </main>
  );
}
