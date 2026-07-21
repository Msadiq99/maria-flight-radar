# MARIA v0.2 Radar Rendering Engine

Status: MARIA v0.2 — in development. Not released, not published, not
production-ready.

A modular radar rendering engine with five selectable render modes that
share one data pipeline and differ only in visual styling, density,
animation, and performance profile.

## Modes

Tactical (default), Mission Control, Classic Radar, Presentation, Minimal
Embedded. See `MARIA_RADAR_RENDER_MODES.md` for the comparison table and
per-mode descriptions.

## Scene pipeline

```
Aircraft data (traffic hook)
  → predictFlight (per aircraft)
  → range filter
  → buildRadarScene(...)         // pure; explicit timestamp; source-state validated
      → projection (radarGeometry)
      → alert-zone classification (alertZones)
      → altitude filtering (altitudeFilter)
      → target priority (targetPriority)
  → RadarScene (platform-independent, immutable-in-practice)
  → applyRenderProfile(scene, profile)   // per-mode target/label/trail caps
  → RadarViewport → layer stack → active render mode
```

The scene builder never calls `Date.now()` internally — the timestamp is
passed in, so scenes are reproducible (tests, future playback).

## Layer stack (fixed z-order)

background → grid → [overlay: below-rings] → map → rangeRing → sweep →
alertZone → [overlay: below-targets] → trail → prediction → aircraft →
[overlay: above-targets] → leaderLine → label → selection → overlay →
[overlay: system-overlay].

Each layer receives the derived render scene and a profile; a layer
renders only if the active profile lists it in `visibleLayers`. `map`,
`prediction`, and `leaderLine` are reserved (not yet implemented). The
four `overlay` slots are formalized insertion points that render nothing
until overlay plugins are active.

## Mode registry

`RADAR_RENDER_MODES` declares a typed `RadarRenderProfile` per mode
(layers, density, animation level, caps, defaults). `listImplementedModes()`
returns the five implemented modes. `resolveRadarRenderMode()` falls back
to Tactical for invalid/unknown values without crashing.

## Theme registry

`RadarTheme` per mode → emitted as `--radar-*` CSS custom properties on
the console root; layer CSS consumes them. Layer components carry class
names only (no hardcoded colors). Mission Control maps back to the
existing `--maria-*` design tokens.

## Profile enforcement

`applyRenderProfile(scene, profile)` — pure, deterministic, immutable —
enforces target/label/trail caps at one point before layers render. The
selected target is never dropped and always keeps its label; trails keep
newest points. Only Minimal caps (12/6/8) are non-null today.

## Selector and persistence

`RadarModeSelector` exposes only implemented modes with descriptions,
keyboard/touch operation, visible focus, and reset-to-default. The choice
persists to `maria.radar.renderMode`. Precedence: `?radarMode=` query
param (debug, not persisted) → stored preference → Tactical. Invalid
values and unavailable storage fall back to Tactical. Mode changes cause
no data refetch and no source-state change.

## Animation strategy

One shared CSS `@keyframes radar-sweep`, per-mode speed via
`--radar-sweep-duration`. No `requestAnimationFrame`/`setInterval` in the
engine (test-enforced). Pause via `.is-paused`; `prefers-reduced-motion`
disables rotation/drift while keeping targets visible and selectable.

## Accessibility

- `aria-live` announcements on real changes only: render mode, selected aircraft, source state (never on position/timestamp updates).
- Native-radio selector; visible focus; semantic panels.
- Non-color state cues: selection bracket (shape), stale opacity, critical marker ring (shape), red critical in every mode. Sweep is `aria-hidden`.
- Reduced motion respected in all five modes.

## Source-state truthfulness

`DEMO`/`CACHE`/`LIVE`/`OFFLINE` derive from one shared function and the
single scene builder — identical across modes. DEMO is never rendered as
LIVE (test-enforced across all modes).

## Overlay extension points

Typed, disabled-by-default plugin contract with four slots and capability
gating. All planned overlays are inactive. See
`MARIA_RADAR_FUTURE_OVERLAYS.md`.

## Playback readiness

Immutable `RadarSnapshot` / `RadarTimelineFrame` / `RadarPlaybackState`
types with pure helpers: `createSnapshot`, `restoreScene`,
schema-version validation, `sortTimelineFrames`, `nearestFrameIndex`. No
storage, recording, or playback UI is implemented. Helpers never read
`Date.now()` — timestamps are passed in. See
`MARIA_RADAR_VISUAL_CONTRACT.md` for firmware alignment.

## Current limitations

- No implemented overlays; no playback UI; no label-collision engine.
- Prediction / leader-line / map layers reserved but not implemented.
- Screenshots not captured (no headless browser in this environment).
- Responsive validation is structural/CSS-level only (no browser automation).
- No live RTL-SDR validation in this milestone; no physical firmware validation.
