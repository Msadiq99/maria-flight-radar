# MARIA Radar Console RC UI-2

## Scope

RC UI-2 extends the accepted RC UI-1.1 radar console with altitude filtering,
operational alert zones, richer selected-aircraft metadata, and compact
data-quality status. It preserves the existing `/radar`, `/map`, and
`/dashboard` routes, Leaflet map, dashboard workflows, API contracts, PWA
behavior, themes, localization, alerts, exports, history, backend, and firmware
support.

Historical radar replay is intentionally reserved for a later release.

## Architecture

The radar screen continues to use the RC UI-1 SVG radar scope and geometry
engine. RC UI-2 adds focused pure modules under `src/radar/`:

- `altitudeFilter.ts`: altitude parsing, category matching, visible target
  filtering, and nearest-visible selection.
- `alertZones.ts`: default thresholds, validation, sanitization, and
  distance-based zone classification.
- `aircraftMetadata.ts`: display normalization, freshness, vertical state, and
  selected-aircraft detail formatting.
- `radarPreferences.ts`: versioned radar preferences and migration from RC UI-1
  local-storage keys.

React wiring remains concentrated in `RadarScreen` to avoid a broad application
rewrite during this milestone.

## Altitude Filtering

The radar console supports these persisted filter modes:

- All
- Ground / unknown
- Below 10,000 ft
- 10,000-30,000 ft
- Above 30,000 ft

Filtering affects rendered targets, automatic target selection, previous/next
navigation, and the visible-versus-total count. When the current selection is
hidden by a filter, auto-select chooses the nearest visible target. If no target
matches, selection is cleared and the empty state reflects the active filters.

Altitude values are normalized defensively from numbers or numeric strings.
Missing, null, undefined, zero, and invalid values are handled without mutating
the original aircraft dataset.

## Alert Zones

Default operational zones are distance-based:

- Critical: 0-5 km
- Warning: >5-15 km
- Advisory: >15-30 km
- Normal: beyond 30 km

The radar scope renders compact boundary rings and a text legend. Visible
targets are classified by current distance, and the selected-aircraft panel
shows the current zone by name.

The alert-zone settings panel edits:

- Critical radius
- Warning radius
- Advisory radius

Validation requires critical > 0, critical < warning, warning < advisory, and
advisory <= active radar range before settings are applied. Valid settings are
persisted locally. Reset restores the default thresholds.

RC UI-2 does not add notifications, audio alarms, email, or backend persistence.

## Preference Schema

RC UI-2 stores radar preferences in one versioned local-storage object:

```json
{
  "version": 2,
  "rangeKm": 50,
  "showLabels": true,
  "showTrails": true,
  "sweepPaused": false,
  "autoSelect": true,
  "altitudeFilter": "all",
  "alertZones": {
    "criticalKm": 5,
    "warningKm": 15,
    "advisoryKm": 30
  }
}
```

Migration preserves RC UI-1 keys for range, labels, trails, sweep pause, and
auto-select. Corrupt preference JSON falls back safely to defaults and never
crashes the radar screen.

## Metadata Normalization

The selected-aircraft panel uses available telemetry and traffic fields without
external databases. Supported fields include ICAO, callsign, registration,
type/model, operator, origin, destination, squawk, altitude, ground speed,
vertical speed, heading/track, distance, bearing, last update age, freshness,
vertical state, and alert zone.

The panel never intentionally displays `undefined`, `null`, `NaN`, or broken
placeholders. `-` is reserved for meaningful unavailable values. Less-important
fields are placed inside a keyboard-accessible "More details" disclosure.

Freshness is derived from update age:

- Live: <= 15 seconds
- Delayed: <= 60 seconds
- Stale: > 60 seconds
- Unknown: missing or invalid timestamp

Vertical state is derived from vertical speed:

- Climbing: > 0.5 m/s
- Descending: < -0.5 m/s
- Level: -0.5 to 0.5 m/s
- Unknown: missing or invalid value

## Accessibility

RC UI-2 preserves RC UI-1 keyboard and touchscreen behavior. Form controls have
visible labels, `:focus-visible` indicators remain active in the normal and
high-contrast themes, and alert-zone meaning is shown with text labels instead
of color alone. Reduced-motion users continue to receive a non-animated sweep.

## Testing

Run the web validation from the repository root:

```sh
npm run lint
npm test
npm run build
npm run format:check
```

Run backend validation from `backend/`:

```sh
npm run lint
npm test
npm run format:check
```

Run firmware validation from `firmware/`:

```sh
pio run
```

Focused RC UI-2 tests cover altitude categories, numeric strings, missing and
invalid altitude, selected-target replacement by filtering, visible counts,
alert-zone boundaries and validation, metadata normalization, freshness,
vertical state, invalid timestamps, RC UI-1 preference migration, corrupt
storage recovery, and valid RC UI-2 persistence.

## Known Limitations

- Alert-zone settings are local to the browser and are not synced through the
  backend.
- Aircraft metadata is limited to fields already present in telemetry and
  traffic responses.
- Alert zones are distance-only and do not yet include altitude or heading
  rules.
- Historical radar replay is not implemented in RC UI-2.

## RC UI-3 Recommendations

Recommended RC UI-3 scope:

- Historical radar replay with time controls.
- Configurable altitude-aware alert zones.
- Rich aircraft metadata enrichment from an approved data source.
- Filter presets for common operational scenarios.
- Exportable radar snapshots and alert-zone configuration.
