# MARIA v0.2 Checkpoint 2 — Scene Model, Layer System, Tactical Foundation

Status: In development.

Branch: `feature/maria-v0.2-radar-rendering-engine`
Starting commit (this checkpoint): `d17d441` (Checkpoint 1 audit)

## Files added

```
src/lib/radar-engine/types.ts
src/lib/radar-engine/targetPriority.ts
src/lib/radar-engine/targetPriority.test.ts
src/lib/radar-engine/sceneBuilder.ts
src/lib/radar-engine/sceneBuilder.test.ts
src/lib/radar-engine/renderProfiles.ts
src/lib/radar-engine/modeRegistry.ts
src/lib/radar-engine/modeRegistry.test.ts
src/lib/radar-engine/index.ts

src/components/radar-engine/RadarViewport.tsx
src/components/radar-engine/RadarViewport.test.tsx
src/components/radar-engine/layers/types.ts
src/components/radar-engine/layers/BackgroundLayer.tsx
src/components/radar-engine/layers/GridLayer.tsx
src/components/radar-engine/layers/RangeRingLayer.tsx
src/components/radar-engine/layers/SweepLayer.tsx
src/components/radar-engine/layers/AlertZoneLayer.tsx
src/components/radar-engine/layers/TrailLayer.tsx
src/components/radar-engine/layers/AircraftLayer.tsx
src/components/radar-engine/layers/LabelLayer.tsx
src/components/radar-engine/layers/SelectionLayer.tsx
src/components/radar-engine/layers/OverlayLayer.tsx
src/components/radar-engine/layers/index.ts
src/components/radar-engine/modes/TacticalRadarMode.tsx
src/components/radar-engine/modes/mode-config.ts

docs/MARIA_V0_2_CHECKPOINT_2.md
```

## Files modified

- `src/RadarScreen.tsx` — inline `<svg>` radar scope replaced with `<TacticalRadarMode>`; outer chrome (controls panel, selected-aircraft panel, status strip) unchanged.
- `src/flightIntel.ts` — dropped its private `distanceKm` implementation; now imports/re-exports the canonical one from `radarGeometry.ts`.
- `src/flightIntel.test.ts` — added a regression test pinning `distanceKm` to the canonical implementation.
- `src/App.css` — added `.radar-selection-bracket` styling and merged `.radar-target-label` into the existing `.radar-target text` rule.
- `docs/MARIA_V0_2_RENDERER_AUDIT.md` — appended a Checkpoint 2 progress section.

## RadarScreen.tsx line count

793 → 699 lines (-94). The removed lines are the inline SVG projection/rendering block; no chrome, controls, or panel logic was touched.

## Scene model

`src/lib/radar-engine/types.ts` defines `RadarScene`, `RadarSceneTarget`, `RadarRenderMode`, `RadarRenderProfile`, and `RadarTargetPriority` per the Phase 3 spec, built on the existing `RadarRange`, `AlertZoneThresholds`, `AltitudeFilter`, `Freshness`, and `SourceState` types rather than redefining them.

`sceneBuilder.ts`'s `buildRadarScene()` is pure and deterministic: given the same aircraft array, center, range, preferences, and an **explicit timestamp** (never `Date.now()` internally — this is what makes future playback/testing reproducible), it returns byte-identical scenes. It never mutates its input. It reuses `radarGeometry.ts` (projection), `alertZones.ts` (classification), and `altitudeFilter.ts` (filtering) unchanged — no geometry was reimplemented.

## Target priority

`targetPriority.ts` implements `selected > critical > warning > nearby > normal > stale > hidden`, derived only from alert-zone classification and freshness — no hostile/friendly terminology. `compareTargetPriority()` gives a deterministic sort with distance and id as tiebreakers.

## Layer system

Ten layer components under `src/components/radar-engine/layers/`, each receiving only `{ scene, profile }` (plus the minimal extra prop a layer needs, e.g. `AircraftLayer`'s `onSelect`). None fetch data, own global state, or recompute projection — projection happens once in `sceneBuilder.ts`. `OverlayLayer` is a typed no-op stub for the future overlay-plugin system (Checkpoint 5).

`RadarViewport.tsx` renders layers in the fixed Phase-10 z-order and skips any layer absent from the active profile's `visibleLayers` — verified by test (Minimal profile's viewport omits sweep/alert-zone markup that Tactical's includes).

## Mode registry

`renderProfiles.ts` declares full `RadarRenderProfile` data for all five modes (including Minimal's target/label/trail caps of 12/6/8 called for in Phase 9). `modeRegistry.ts` exposes `RADAR_RENDER_MODES`, defaults to `tactical`, and `resolveRadarRenderMode()` falls back to the default for any unknown or not-implemented value without throwing. Preference key: `maria.radar.renderMode` (not yet wired to a UI selector — that's Checkpoint 4).

**Only `tactical.implemented === true`** in this checkpoint; `listImplementedModes()` returns just Tactical, so no mode selector would expose the other four yet even once built.

## Tactical mode behavior

`TacticalRadarMode` is a thin wrapper around `RadarViewport` pinned to `TACTICAL_PROFILE`. Preserved from the prior implementation, unchanged:

- target selection (click/keyboard), labels toggle, trails toggle, auto-select nearest
- range control, altitude filter, source mode selector, alert-zone editor
- selected-aircraft detail panel, 8 deterministic DEMO targets
- truthful source-state badges (DEMO/CACHE/LIVE/OFFLINE) and wording
- reduced-motion sweep behavior (unchanged CSS `@media (prefers-reduced-motion: reduce)` rule, confirmed present)

**One intentional visual addition:** a selected-target bracket (`SelectionLayer`), called for by Phase 5 but absent from the prior UI. Everything else in the scope render is pixel-for-pixel identical (same viewBox math: `-250 -250 500 500` at range radius 220, same class names, same ring/trail/target markup).

## Tests added

31 new tests across 5 files:

- `targetPriority.test.ts` (8) — selected-wins, critical-beats-warning, stale handling, deterministic ordering, no-mutation
- `sceneBuilder.test.ts` (9) — determinism, no-mutation, range filtering, alert-zone classification, selected-target priority, source-state propagation, DEMO-never-LIVE, null-center safety, explicit-timestamp freshness
- `modeRegistry.test.ts` (8) — default mode, only-Tactical-implemented, all-five-declared, invalid/unimplemented fallback, preference round-trip, no-storage fallback, Minimal caps
- `RadarViewport.test.tsx` (5) — Tactical layer visibility, Minimal layer omission, selection-bracket presence/absence, paused class, reduced-motion CSS still present
- `flightIntel.test.ts` (+1) — canonical `distanceKm` reference check

## Validation results

- `npm run lint` (oxlint): clean, exit 0
- `npm test` (vitest): **12 files, 68 tests passed** (37 pre-existing + 31 new)
- `npm run build` (tsc -b && vite build): clean
- `npm run format:check` (prettier): clean after `prettier --write` on new/changed files
- Manual smoke check: `npm run dev:all`, confirmed `/api/radar/snapshot` returns simulation aircraft and `GET /radar` returns 200; dev servers stopped afterward.
- Backend and firmware directories: **untouched** (confirmed via `git status --short` — no `backend/` or `firmware/` paths modified).

## Known limitations

- Only Tactical is implemented; Mission Control/Classic/Presentation/Minimal are typed registry placeholders only — not selectable, not rendered.
- No mode selector UI yet (Checkpoint 4).
- Scene rebuilds are not yet memoized against a stable clock tick — `radarScene` recomputes each render using `Date.now()` at call time rather than a shared tick; acceptable at today's 8-target demo scale, flagged for the Checkpoint 5 performance pass.
- `LabelLayer`'s label placement is a direct pass-through (`labelAnchor = projected position`) — the collision-avoidance label-placement algorithm (Phase 12) is not yet built.
- No target/label/trail caps are enforced at render time yet (Minimal's limits exist in the profile but nothing reads them until Checkpoint 4).

## Risks for Checkpoint 3

- Mission Control must reuse the *existing* `missionControl.tsx`/`.css` page chrome (already MARIA's current look) around `RadarViewport` — the risk is building new chrome instead of wrapping the existing shell, which would duplicate work and diverge visually from what's already shipped.
- Classic Radar's phosphor/persistence sweep has no prior implementation; must respect the single-shared-animation-clock and no-full-screen-blur constraints (Phase 14) from the start rather than retrofitting them.
- Flipping `implemented: true` for a second mode means the mode registry's `listImplementedModes()` output changes — any future selector UI test written against "only Tactical" will need updating in the same commit.

## Guardrail confirmations

- USB helper files (`docs/MARIA_ESP32_USB_DETECTION.md`, `scripts/check-maria-board.sh`, `scripts/identify-usb-serial.sh`): untouched, still untracked.
- No push, no PR, no merge performed.
