# MARIA v0.2 Radar Renderer Audit

Status: In development — architectural audit only, no visual changes in this document.

Branch: `feature/maria-v0.2-radar-rendering-engine`
Starting commit: `b6f7fb2` (main, post PR #11 merge)

## 1. Current rendering approach

All radar rendering lives in a single component, [src/RadarScreen.tsx](../src/RadarScreen.tsx) (793 lines). It:

- Fetches/derives data, computes geometry, manages selection state, renders controls, renders the SVG scope, and renders the selected-aircraft panel — all in one function component.
- Renders a single inline `<svg viewBox="-250 -250 500 500">` containing range rings, alert-zone rings, compass labels, a static sweep wedge (`<path>` with a CSS `animation: radar-sweep`), trails (`<polyline>`), and aircraft markers (`<g><path>` triangle + optional `<text>` label), all interleaved directly in JSX with no layer abstraction.
- Radius is hardcoded to `220` in six separate call sites (`projectTarget(..., 220)`), and `range` (25/50/100/200 km) is a fixed enum (`RadarRange` in [src/radarGeometry.ts](../src/radarGeometry.ts)).
- Visual styling ("Mission Control" tokens) comes from [src/missionControl.tsx](../src/missionControl.tsx) (presentational primitives: `MissionPanel`, `TelemetryReadout`, `StatusLamp`, `SourceStateBadge`, etc.) and [src/missionControl.css](../src/missionControl.css). This is effectively today's *only* visual mode — there is no mode concept at all.

## 2. Current geometry engine

[src/radarGeometry.ts](../src/radarGeometry.ts) is small, pure, and reusable as-is:

- `bearingDegrees(centerLat, centerLon, lat, lon)` — great-circle bearing.
- `distanceKm(...)` — haversine distance. **Duplicated** independently in [src/flightIntel.ts](../src/flightIntel.ts) (`distanceKm`) with the same haversine math — two implementations of the same function today.
- `projectTarget(bearing, distance, range, radius)` — polar→cartesian projection onto a screen radius, clamps out-of-range targets to the ring edge and returns `visible: boolean`.
- `rangeRingValues(range)` — returns the 4 ring radii (`range/4, range/2, 3*range/4, range`).

This is a solid, engine-agnostic core. It has no dependency on SVG, React, or the 220px radius — the 220 is passed in by the caller. It can be reused directly by `radar-engine/geometry.ts` and `projection.ts` with no changes.

## 3. Current shared state / data flow

`RadarScreen` owns everything as local `useState`/`useMemo`:

```
useTelemetry(deviceId)              → device GPS record (center point)
useNearbyTraffic(lat, lon, range, sourceMode)  → { aircraft, feed, unreachable, stale, trails, sourceHealth }
  ↓ predictFlight() per aircraft    → FlightPrediction (adds distance_km, flyby_probability, etc.)
  ↓ filter by range                 → inRange
  ↓ filterAircraftByAltitude()      → visibleAircraft
  ↓ selectedId (useState)           → selected
  ↓ classifyAlertZone()             → selectedZone
  ↓ selectedAircraftMetadata()      → selectedMetadata (display strings)
```

Preferences (`RadarPreferencesV2` in [src/radar/radarPreferences.ts](../src/radar/radarPreferences.ts)) are persisted to `localStorage` under `maria.radar.preferences` (with legacy per-key migration from older `maria.radar.*` keys). This is a good, already-namespaced pattern the render-mode preference (`maria.radar.renderMode`) should follow.

There is a **second, unrelated** persistence helper, `usePersistentState` in [src/radarSettings.ts](../src/radarSettings.ts), used elsewhere in `App.tsx` for saved locations/alert rules — not radar-scene state. Keep these separate; do not conflate.

## 4. Current aircraft model

`AircraftTraffic` ([src/traffic.ts](../src/traffic.ts)) is the wire model (lat/lon/altitude_m/velocity_kmph/heading_deg/vertical_rate_mps/source/updated_at). `FlightPrediction` ([src/flightIntel.ts](../src/flightIntel.ts)) extends it with prediction fields (`distance_km`, `flyby_probability`, `prediction_confidence`, `projected_path`, etc.) computed via closest-approach kinematics — already conceptually the "projected position" Phase 13 asks for, just not scene-shaped or labeled as such in the UI copy yet.

There is no `RadarSceneTarget`-shaped type today: screen coordinates (`projectTarget` output), alert zone, priority, label anchor, and trail points are all computed ad hoc inline in JSX rather than attached to the target model.

## 5. Current source-state handling

[src/missionControlState.ts](../src/missionControlState.ts) already implements the truthful `SourceState = 'DEMO' | 'CACHE' | 'LIVE' | 'OFFLINE'` model and truthful wording helpers (`selectedTargetStateWording`, `emptySelectionMessage`) — this is exactly Phase 17's requirement and is already correct in the current mission-control UI (verified: `SourceStateBadge` renders the true state everywhere it's used; no hardcoded "Live" strings found outside of freshness labels that are already gated behind `demoMode`).

`isSimulationFeed()` in `traffic.ts` detects DEMO by inspecting `aircraft[].source`/`sourceCategory`. This is the single source of truth for DEMO detection and must remain the single source of truth in the new engine — do not reimplement detection per render mode.

## 6. Current animation mechanism

- Sweep: pure CSS `animation: radar-sweep 5s linear infinite` on the sweep `<g>`, paused via `.is-paused` class toggle (App.css:294, :424 `@keyframes`). No JS animation loop today — no shared clock to build on, but also nothing to migrate off of.
- `@media (prefers-reduced-motion: reduce)` already disables the sweep animation in both `App.css` and `missionControl.css`. This pattern must be preserved and extended to every mode's animated layer (sweep, trail fade, phosphor persistence, presentation camera).

## 7. Current accessibility behavior

Already present and should be preserved as the baseline, not rebuilt:

- Aircraft markers are focusable (`tabIndex={0}`, `role="button"`, `aria-pressed`, `aria-label="Select {callsign}"`, Enter/Space handling).
- `aria-live="polite"` regions on the command summary and selected-aircraft panel.
- `svg role="img"` with a descriptive `aria-label`.
- Alert-zone legend and source-health rows use text/class-based state, not color alone.

Gaps for v0.2: no `aria-live` announcement specifically for *mode change* or *selected aircraft change* as distinct events (Phase 22 requirement) — today's live regions re-announce the whole panel on any re-render, not a targeted message.

## 8. Current performance risks

- Every visible aircraft re-renders a full `<g>` with inline event handlers created fresh each render (no memoization of per-target JSX).
- Trails are recomputed (`Object.entries(traffic.trails).map(...)`) and reprojected every render with no caching.
- No target count cap — `visibleAircraft` can grow unbounded (bounded in practice only by the backend's demo dataset of 8 and by range/altitude filters). Phase 9's Minimal profile (max 12 targets, max 8 trail points) has no enforcement point to hook into yet.
- Single component re-renders on every 1-second `now` tick (from `useNearbyTraffic`'s freshness timer) even when nothing visual needs to change beyond the age readout — this will get worse, not better, if five render modes are naively bolted onto the same component.

## 9. Current code coupling

`RadarScreen.tsx` couples, in one file: data fetching (via hooks), geometry projection, business rules (alert zones, altitude filter, freshness), presentation components, and raw SVG markup. This is the primary reason a direct "add 4 more modes" approach would multiply the component's size 5x. The coupling is the one thing that must change; the underlying pure modules (geometry, alertZones, altitudeFilter, aircraftMetadata, radarPreferences, missionControlState) are already appropriately decoupled and pure — they are reusable as-is.

## 10. Recommended extraction order

1. **Types first** (`radar-engine/types.ts`): `RadarSceneTarget`, `RadarScene`, `RadarRenderMode`, `RadarRenderProfile`, target priority enum — no behavior change, just shapes.
2. **Geometry/projection** (`radar-engine/geometry.ts`, `projection.ts`): move `bearingDegrees`/`distanceKm`/`projectTarget`/`rangeRingValues` from `radarGeometry.ts` unchanged (re-export from old path for compatibility, or update the one import site in `RadarScreen.tsx`). Resolve the `distanceKm` duplication with `flightIntel.ts` by having `flightIntel.ts` import the shared one.
3. **Target priority + scene builder** (`target-priority.ts`, `scene-builder.ts`): pure function taking `(aircraft[], center, range, preferences, alertZones, selectedId, now)` → `RadarScene`. This is new code but assembled entirely from logic that already exists inline in `RadarScreen.tsx` (the `visibleAircraft`/`selectedZone`/`alertCount` block).
4. **Render-mode registry + render profile** (`render-profile.ts`, `mode-config.ts`): define the 5 profiles' declarative data (density, target limits, default layers) — no rendering yet.
5. **Layer stack** (`components/radar-engine/layers/*`): extract today's SVG blocks (rings, sweep, trails, aircraft, labels, selection) into standalone layer components that accept `RadarScene` + profile, in the exact visual form they have today (this is the "Tactical" mode's layers, since Tactical is closest to the current mission-control look).
6. **`RadarEngine` + `RadarViewport` + mode components**: wire the layer stack behind a mode selector; `TacticalRadarMode` becomes the direct replacement for today's radar `<svg>` block; `MissionControlRadarMode` reuses the existing panel chrome (`MissionPanel`, `TelemetryReadout`, etc.) around the same viewport.
7. Only after Tactical + Mission Control are verified working does new-territory work begin (Classic phosphor sweep, Presentation perspective, Minimal caps) — these have no existing implementation to preserve compatibility with.

Do not refactor `radarPreferences.ts`, `alertZones.ts`, `altitudeFilter.ts`, `aircraftMetadata.ts`, or `missionControlState.ts` — they are already correctly decoupled, tested (37 passing tests across these modules today), and reusable unchanged by the scene builder.
