import { useEffect, useMemo, useRef, useState } from 'react';
import { DEVICE_ID } from './config';
import { predictFlight } from './flightIntel';
import type { RadarRange } from './radarGeometry';
import { buildRadarScene } from './lib/radar-engine/sceneBuilder';
import {
  DEFAULT_RADAR_RENDER_MODE,
  getRenderProfile,
  loadStoredRadarRenderMode,
  resolveRadarRenderMode,
  saveRadarRenderMode,
} from './lib/radar-engine/modeRegistry';
import type { RadarRenderMode } from './lib/radar-engine/types';
import {
  radarModeClassName,
  radarThemeToCssVars,
} from './lib/radar-engine/themeRegistry';
import { RadarModeRenderer } from './components/radar-engine/modes/RadarModeRenderer';
import { RadarModeSelector } from './components/radar-engine/RadarModeSelector';
import {
  ALTITUDE_FILTER_LABELS,
  filterAircraftByAltitude,
  nearestVisibleAircraft,
  type AltitudeFilter,
} from './radar/altitudeFilter';
import {
  ALERT_ZONE_LABELS,
  DEFAULT_ALERT_ZONES,
  classifyAlertZone,
  validateAlertZones,
  type AlertZoneThresholds,
} from './radar/alertZones';
import { selectedAircraftMetadata } from './radar/aircraftMetadata';
import {
  DEFAULT_RADAR_PREFERENCES,
  loadRadarPreferences,
  saveRadarPreferences,
  type RadarPreferencesV2,
} from './radar/radarPreferences';
import { useTelemetry } from './telemetry';
import {
  ChamferButton,
  EmptyModuleState,
  InsetDisplay,
  MissionPanel,
  MissionPanelHeader,
  ModuleIdentifier,
  SegmentedMeter,
  SourceStateBadge,
  StatusLamp,
  SystemStatusStrip,
  TechnicalDivider,
  TelemetryReadout,
} from './missionControl';
import {
  deriveSourceState,
  emptySelectionMessage,
  selectedTargetStateWording,
} from './missionControlState';
import {
  isSimulationFeed,
  type HybridSource,
  useNearbyTraffic,
} from './traffic';

const RANGES: RadarRange[] = [25, 50, 100, 200];
const SOURCE_MODES: HybridSource[] = [
  'auto',
  'hybrid',
  'opensky',
  'local_adsb',
  'simulation',
];
const SOURCE_LABELS: Record<HybridSource, string> = {
  auto: 'Auto',
  hybrid: 'Hybrid',
  opensky: 'OpenSky (optional)',
  local_adsb: 'Local ADS-B',
  simulation: 'Simulation',
};

function value(value: string | number | null | undefined, suffix = '') {
  return value === undefined || value === null || value === ''
    ? '—'
    : `${value}${suffix}`;
}

export function RadarScreen() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [deviceId] = useState(params.get('device') || DEVICE_ID);
  const { record, status } = useTelemetry(deviceId);
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
  const [zoneDraft, setZoneDraft] = useState<AlertZoneThresholds>(
    preferences.alertZones
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    params.get('aircraft')
  );
  const [sourceMode, setSourceMode] = useState<HybridSource>(() => {
    const requested = params.get('source') || params.get('mode') || 'auto';
    return SOURCE_MODES.includes(requested as HybridSource)
      ? (requested as HybridSource)
      : 'auto';
  });
  // Render mode. Precedence on first load: a `?radarMode=` query param
  // (debug override — sets the initial view but is not persisted) wins;
  // otherwise the stored `maria.radar.renderMode` preference is used;
  // otherwise Tactical. Only implemented modes resolve — anything else
  // falls back to Tactical without crashing. Changing mode affects
  // rendering only: it never triggers a data refetch or alters source state.
  const [renderMode, setRenderMode] = useState<RadarRenderMode>(() =>
    params.get('radarMode') !== null
      ? resolveRadarRenderMode(params.get('radarMode'))
      : loadStoredRadarRenderMode()
  );
  const changeRenderMode = (next: RadarRenderMode) => {
    const resolved = resolveRadarRenderMode(next);
    setRenderMode(resolved);
    // Persist only on an active user selection (not the debug query param).
    saveRadarRenderMode(resolved);
  };
  const [modeAnnouncement, setModeAnnouncement] = useState('');
  const didMountMode = useRef(false);
  useEffect(() => {
    if (!didMountMode.current) {
      didMountMode.current = true;
      return;
    }
    setModeAnnouncement(`Radar mode: ${getRenderProfile(renderMode).label}`);
  }, [renderMode]);
  const updatePreferences = (next: Partial<RadarPreferencesV2>) => {
    setPreferences((current) => {
      const resolved = { ...current, ...next, version: 2 as const };
      if (typeof localStorage !== 'undefined') saveRadarPreferences(resolved);
      return resolved;
    });
  };
  const zoneValidation = validateAlertZones(zoneDraft, range);
  const traffic = useNearbyTraffic(centerLat, centerLon, range, sourceMode);
  const demoMode = isSimulationFeed(traffic.feed);
  const sourceState = deriveSourceState({
    unreachable: traffic.unreachable,
    stale: traffic.stale,
    demo: demoMode,
  });
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
  const selectedZone = selected
    ? classifyAlertZone(selected.distance_km, preferences.alertZones)
    : null;
  const selectedMetadata =
    selected && selectedZone
      ? selectedAircraftMetadata(selected, centerLat, centerLon, selectedZone)
      : null;
  const radarScene = useMemo(
    () =>
      buildRadarScene({
        aircraft: inRange,
        center:
          centerLat === null || centerLon === null
            ? null
            : { lat: centerLat, lon: centerLon },
        rangeKm: range,
        altitudeFilter,
        alertZones: preferences.alertZones,
        selectedTargetId: selectedId,
        sourceState,
        trails: traffic.trails,
        timestamp: Date.now(),
      }),
    [
      inRange,
      centerLat,
      centerLon,
      range,
      altitudeFilter,
      preferences.alertZones,
      selectedId,
      sourceState,
      traffic.trails,
    ]
  );
  const applyZoneDraft = () => {
    if (zoneValidation) return;
    updatePreferences({ alertZones: zoneDraft });
  };
  const resetZoneDraft = () => {
    setZoneDraft(DEFAULT_ALERT_ZONES);
    updatePreferences({ alertZones: DEFAULT_ALERT_ZONES });
  };

  useEffect(() => {
    if (selected && visibleAircraft.some((item) => item.id === selected.id)) {
      return;
    }
    if (autoSelect) {
      setSelectedId(nearestVisibleAircraft(visibleAircraft)?.id || null);
    } else if (
      selectedId &&
      !visibleAircraft.some((item) => item.id === selectedId)
    ) {
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
      visibleAircraft[
        (index + step + visibleAircraft.length) % visibleAircraft.length
      ].id
    );
  };
  const alertCount = visibleAircraft.filter(
    (item) => item.flyby_probability >= 65
  ).length;
  const feedAgeSeconds = traffic.feed.updated_at
    ? Math.max(0, Math.round((Date.now() - traffic.feed.updated_at) / 1000))
    : null;
  const receiverState = demoMode
    ? 'SIMULATOR'
    : traffic.sourceHealth.length
      ? traffic.sourceHealth
          .map((source) => `${source.source}:${source.status}`)
          .join(' / ')
      : 'UNKNOWN';
  const systemNominal = !traffic.unreachable && status !== 'unreachable';
  const centerLabel = demoMode
    ? 'Sanitized demo center'
    : centerLat === null
      ? 'Not available'
      : `${centerLat.toFixed(4)}, ${centerLon?.toFixed(4)}`;

  return (
    <main
      className={`radar-console mission-control-console ${radarModeClassName(renderMode)}`}
      style={radarThemeToCssVars(renderMode)}
    >
      <p className="radar-visually-hidden" aria-live="polite" role="status">
        {modeAnnouncement}
      </p>
      <header className="radar-topbar mission-command-header">
        <div className="mission-command-brand">
          <ModuleIdentifier>SYS-MARIA-CONTROL</ModuleIdentifier>
          <strong>MARIA FLIGHT RADAR</strong>
          <span>MSDK3.dev</span>
        </div>
        <div
          className="mission-command-summary"
          aria-label="Command status"
          aria-live="polite"
          aria-atomic="true"
        >
          <SourceStateBadge state={sourceState} />
          <TelemetryReadout
            label="Targets"
            value={visibleAircraft.length}
            tone="active"
          />
          <StatusLamp
            state={systemNominal ? 'active' : 'critical'}
            label={systemNominal ? 'System go' : 'System degraded'}
          />
        </div>
        <nav aria-label="Primary navigation">
          <a href="/radar">Radar</a>
          <a href="/map">Map</a>
          <a href="/dashboard">Dashboard</a>
          <a href="/dashboard#alerts">Alerts</a>
          <a href="/dashboard#history">History</a>
        </nav>
        <span className="radar-clock">
          Local {new Date().toLocaleTimeString()}
        </span>
      </header>
      <div className="radar-workspace">
        <MissionPanel as="aside" className="radar-overview">
          <MissionPanelHeader
            moduleId="CTL-01"
            title="Radar controls"
            meta={`${range} KM`}
          />
          <div className="mission-panel-body">
            <RadarModeSelector
              mode={renderMode}
              defaultMode={DEFAULT_RADAR_RENDER_MODE}
              onChange={changeRenderMode}
            />
            <div className="radar-metrics">
              <TelemetryReadout label="Aircraft" value={aircraft.length} />
              <TelemetryReadout
                label="Visible"
                value={visibleAircraft.length}
                tone="active"
              />
              <TelemetryReadout
                label="Alerts"
                value={alertCount}
                tone={alertCount ? 'critical' : 'neutral'}
              />
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
            <label>
              Source
              <select
                value={sourceMode}
                onChange={(event) =>
                  setSourceMode(event.target.value as HybridSource)
                }
              >
                {SOURCE_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {SOURCE_LABELS[mode]}
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
            <details className="radar-zone-settings">
              <summary>Alert zones</summary>
              <div className="radar-zone-grid">
                <label>
                  Critical km
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={zoneDraft.criticalKm}
                    onChange={(event) =>
                      setZoneDraft((current) => ({
                        ...current,
                        criticalKm: Number(event.target.value),
                      }))
                    }
                  />
                </label>
                <label>
                  Warning km
                  <input
                    type="number"
                    min="0.2"
                    step="0.1"
                    value={zoneDraft.warningKm}
                    onChange={(event) =>
                      setZoneDraft((current) => ({
                        ...current,
                        warningKm: Number(event.target.value),
                      }))
                    }
                  />
                </label>
                <label>
                  Advisory km
                  <input
                    type="number"
                    min="0.3"
                    step="0.1"
                    value={zoneDraft.advisoryKm}
                    onChange={(event) =>
                      setZoneDraft((current) => ({
                        ...current,
                        advisoryKm: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              </div>
              {zoneValidation ? (
                <p className="radar-zone-error" role="alert">
                  {zoneValidation}
                </p>
              ) : null}
              <div className="radar-zone-actions">
                <button
                  type="button"
                  onClick={applyZoneDraft}
                  disabled={!!zoneValidation}
                >
                  Apply
                </button>
                <button type="button" onClick={resetZoneDraft}>
                  Reset
                </button>
              </div>
            </details>
            <SegmentedMeter
              label="Visible capacity"
              value={visibleAircraft.length}
              max={Math.max(inRange.length, 1)}
            />
            <TechnicalDivider />
            <dl>
              <div>
                <dt>Center</dt>
                <dd>{centerLabel}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>
                  {demoMode
                    ? 'Demo · deterministic simulation'
                    : `${SOURCE_LABELS[sourceMode]} · ${traffic.feed.effectiveSources?.join(', ') || traffic.feed.source}`}
                </dd>
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
            <div className="radar-source-health" aria-label="Aircraft sources">
              {demoMode ? (
                <span className="is-healthy">
                  demo · {traffic.aircraft.length}
                </span>
              ) : traffic.sourceHealth.length ? (
                traffic.sourceHealth.map((source) => (
                  <span
                    key={source.source}
                    className={`is-${source.status}`}
                    title={source.message || undefined}
                  >
                    {source.source.replace('_', ' ')} · {source.aircraftCount}
                  </span>
                ))
              ) : (
                <span className="is-unconfigured">sources pending</span>
              )}
            </div>
          </div>
        </MissionPanel>
        <MissionPanel className="radar-scope-panel" aria-label="Radar scope">
          <MissionPanelHeader
            moduleId="RDR-01"
            title="Airspace scope"
            meta={
              <span className="radar-scope-meta">
                <SourceStateBadge state={sourceState} />
                <span>
                  {visibleAircraft.length} targets ·{' '}
                  {feedAgeSeconds === null ? 'No update' : `${feedAgeSeconds}s`}
                </span>
              </span>
            }
          />
          <InsetDisplay className="radar-display-well">
            <RadarModeRenderer
              mode={renderMode}
              scene={radarScene}
              paused={paused}
              showLabels={labels}
              showTrails={trails}
              onSelectTarget={setSelectedId}
            />
          </InsetDisplay>
          <div className="radar-zone-legend" aria-label="Alert-zone legend">
            {Object.entries(ALERT_ZONE_LABELS).map(([zone, label]) => (
              <span key={zone} className={`is-zone-${zone}`}>
                <i aria-hidden="true" /> {label}
              </span>
            ))}
          </div>
          <div className="radar-controls">
            <ChamferButton
              type="button"
              onClick={() => selectRelative(-1)}
              aria-label="Previous target"
              disabled={!visibleAircraft.length}
            >
              Previous
            </ChamferButton>
            <ChamferButton
              type="button"
              onClick={() =>
                updatePreferences({ sweepPaused: !preferences.sweepPaused })
              }
              aria-pressed={paused}
            >
              {paused ? 'Resume sweep' : 'Pause sweep'}
            </ChamferButton>
            <ChamferButton
              type="button"
              onClick={() => selectRelative(1)}
              aria-label="Next target"
              disabled={!visibleAircraft.length}
            >
              Next
            </ChamferButton>
            <a className="radar-button" href="/map">
              Open map
            </a>
          </div>
        </MissionPanel>
        <MissionPanel as="aside" className="radar-selected">
          <MissionPanelHeader
            moduleId="TRK-01"
            title="Selected aircraft"
            meta={<SourceStateBadge state={sourceState} />}
          />
          <div className="mission-panel-body" aria-live="polite">
            {selected ? (
              <>
                <h2>{selectedMetadata?.title || selected.callsign}</h2>
                <p className="radar-alert-badge">
                  {selectedTargetStateWording(
                    selectedMetadata?.alertZone || 'Tracking',
                    sourceState,
                    selectedMetadata?.freshness || 'Unknown'
                  )}
                </p>
                <dl>
                  <div>
                    <dt>Alert zone</dt>
                    <dd>{selectedMetadata?.alertZone || '—'}</dd>
                  </div>
                  <div>
                    <dt>Callsign / ICAO</dt>
                    <dd>
                      {value(selectedMetadata?.callsign)} /{' '}
                      {value(selectedMetadata?.icao)}
                    </dd>
                  </div>
                  <div>
                    <dt>Altitude</dt>
                    <dd>{value(selectedMetadata?.altitude)}</dd>
                  </div>
                  <div>
                    <dt>Speed / heading</dt>
                    <dd>
                      {value(selectedMetadata?.groundSpeed)} /{' '}
                      {value(selectedMetadata?.heading)}
                    </dd>
                  </div>
                  <div>
                    <dt>Distance / bearing</dt>
                    <dd>
                      {value(selectedMetadata?.distance)} /{' '}
                      {value(selectedMetadata?.bearing)}
                    </dd>
                  </div>
                  <div>
                    <dt>Vertical state</dt>
                    <dd>
                      {selectedMetadata?.verticalState || 'Unknown'} ·{' '}
                      {value(selectedMetadata?.verticalSpeed)}
                    </dd>
                  </div>
                  <div>
                    <dt>Update</dt>
                    <dd>
                      {selectedMetadata?.updateAge === null
                        ? '—'
                        : `${selectedMetadata?.updateAge}s ago`}{' '}
                      ·{' '}
                      {demoMode
                        ? 'Demo'
                        : selectedMetadata?.freshness || 'Unknown'}
                    </dd>
                  </div>
                </dl>
                <details className="radar-more-details">
                  <summary>More details</summary>
                  <dl>
                    <div>
                      <dt>Registration</dt>
                      <dd>{value(selectedMetadata?.registration)}</dd>
                    </div>
                    <div>
                      <dt>Type / model</dt>
                      <dd>{value(selectedMetadata?.type)}</dd>
                    </div>
                    <div>
                      <dt>Operator</dt>
                      <dd>{value(selectedMetadata?.operator)}</dd>
                    </div>
                    <div>
                      <dt>Origin / destination</dt>
                      <dd>
                        {value(selectedMetadata?.origin)} /{' '}
                        {value(selectedMetadata?.destination)}
                      </dd>
                    </div>
                    <div>
                      <dt>Squawk</dt>
                      <dd>{value(selectedMetadata?.squawk)}</dd>
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
                </details>
                <a href={selected.fr24_url} target="_blank" rel="noreferrer">
                  Open flight details
                </a>
              </>
            ) : (
              <EmptyModuleState>
                {emptySelectionMessage({
                  unreachable: traffic.unreachable,
                  visibleCount: visibleAircraft.length,
                })}
              </EmptyModuleState>
            )}
          </div>
        </MissionPanel>
      </div>
      <SystemStatusStrip>
        <TelemetryReadout label="Source" value={sourceState} />
        <TelemetryReadout
          label="Backend"
          value={traffic.unreachable ? 'OFFLINE' : 'ONLINE'}
          tone={traffic.unreachable ? 'critical' : 'active'}
        />
        <TelemetryReadout
          label="Aircraft"
          value={`${visibleAircraft.length}/${inRange.length}`}
        />
        <TelemetryReadout
          label="Last update"
          value={feedAgeSeconds === null ? '—' : `${feedAgeSeconds}s ago`}
        />
        <TelemetryReadout label="Freshness" value={sourceState} />
        <TelemetryReadout
          label="Alerts"
          value={alertCount}
          tone={alertCount ? 'critical' : 'neutral'}
        />
        <TelemetryReadout label="Receiver" value={receiverState} />
      </SystemStatusStrip>
    </main>
  );
}
