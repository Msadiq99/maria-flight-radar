# MARIA v0.2 Radar Rendering Engine Report

Status: MARIA v0.2.0-beta.1 candidate — final browser review complete. Not
released, published, or tagged.

## Metadata

- Branch: `feature/maria-v0.2-radar-rendering-engine`
- Starting commit (milestone): `b6f7fb2` (main after PR #11)
- Checkpoint 5 start: `c5e5376`
- Candidate baseline: `a113adf`
- Ending commit: browser validation commit (see `git log`)
- Node: v22.23.1 · npm: 10.9.8

## Commits (Checkpoint 5)

- `885b47f` Add radar overlay extension contracts
- `42a2b23` Add immutable snapshot and playback foundations
- `467922d` Add accessibility completion for the radar engine
- `a113adf` Add final v0.2 documentation and validation report
- (this commit) Prepare v0.2.0-beta.1 browser validation evidence

Earlier checkpoints (1–4) landed the audit, scene model, layer stack,
five modes, theme registry, profile enforcement, selector, and
persistence — see `MARIA_V0_2_CHECKPOINT_1..4` and the renderer audit.

## Files added (Checkpoint 5)

```
src/lib/radar-engine/overlays/{types,registry,featureFlags,capabilityChecks,index,overlays.test}.ts
src/lib/radar-engine/playback/{types,snapshots,timeline,index,playback.test}.ts
src/components/radar-engine/RadarOverlayHost.tsx
src/components/radar-engine/useRadarAnnouncements.ts
src/components/radar-engine/useRadarAnnouncements.test.ts
docs/MARIA_RADAR_VISUAL_CONTRACT.md
docs/MARIA_RADAR_FUTURE_OVERLAYS.md
docs/MARIA_V0_2_RADAR_RENDERING_ENGINE.md
docs/MARIA_V0_2_VALIDATION_PLAN.md
docs/MARIA_V0_2_RADAR_ENGINE_REPORT.md
```

## Files modified (Checkpoint 5)

- `src/components/radar-engine/RadarViewport.tsx` — four formalized overlay slots interleaved at stable z-positions.
- `src/components/radar-engine/layers/AircraftLayer.tsx` + `src/App.css` — critical-target marker ring (non-color cue).
- `src/RadarScreen.tsx` — uses `useRadarAnnouncements` for change-only aria-live (mode/selection/source).
- `src/lib/radar-engine/index.ts` — exports overlays, playback, theme registry, profile enforcement.
- `README.md`, `ROADMAP.md`, `CHANGELOG.md` — v0.2 "in development" entries.
- `docs/MARIA_RADAR_RENDER_MODES.md` — already present from Checkpoint 4.

## Architecture

- **Scene builder** — pure, explicit-timestamp, deterministic; reuses projection/alert-zone/altitude/priority modules.
- **Immutable scene model** — `RadarScene` / `RadarSceneTarget`; targets priority-sorted.
- **Target priority** — selected > critical > warning > nearby > normal > stale > hidden.
- **applyRenderProfile** — one shared, pure cap step (target/label/trail) before layers render; selected never dropped.
- **Layer stack** — fixed z-order; profile-gated visibility; four overlay slots.
- **Theme registry** — typed themes → `--radar-*` CSS variables; layers are color-free.
- **Mode registry** — five implemented modes; safe fallback to Tactical.
- **Selector and persistence** — implemented-modes-only selector; `maria.radar.renderMode`; query-param→stored→Tactical precedence.
- **Animation** — one shared CSS sweep keyframe; no JS animation loop (test-enforced).
- **Overlay contract** — typed, disabled-by-default plugins with capability gating; all planned overlays inactive.
- **Snapshot/playback contract** — immutable snapshot/timeline/state types + pure helpers; no storage or UI.

## Modes

All five reuse the same scene, projection, selection, and source-state
logic; they differ only in theme, layers, animation, and caps.

| Mode             | Purpose             | Layers                         | Animation             | Caps (tgt/lbl/trail) | Reduced motion        | Screenshot                                                     |
| ---------------- | ------------------- | ------------------------------ | --------------------- | -------------------- | --------------------- | -------------------------------------------------------------- |
| Tactical         | Default operational | full + slots                   | moderate sweep        | none/none/30         | static sweep          | [PNG](assets/screenshots/v0.2/maria-radar-tactical.png)        |
| Mission Control  | Dense desktop ops   | full + overlay slot            | restrained sweep      | none/none/30         | static sweep          | [PNG](assets/screenshots/v0.2/maria-radar-mission-control.png) |
| Classic Radar    | Green phosphor      | no grid/alertZone              | brighter/faster sweep | none/none/20         | static highlight      | [PNG](assets/screenshots/v0.2/maria-radar-classic.png)         |
| Presentation     | Cinematic 2.5D      | full + overlay                 | wide sweep + CSS tilt | none/none/40         | static tilt, no drift | [PNG](assets/screenshots/v0.2/maria-radar-presentation.png)    |
| Minimal Embedded | ESP32 preview       | rings/aircraft/label/selection | static / none         | 12/6/8               | no sweep              | [PNG](assets/screenshots/v0.2/maria-radar-minimal.png)         |

Responsive behavior: modes reuse the responsive mission-control shell;
Minimal is a 320×240-equivalent frame; Presentation's tilt is inside an
`overflow: hidden` stage. Accessibility: change-only aria-live, native
selector, non-color cues (bracket, stale opacity, critical marker, red
critical), reduced motion in all modes.

## Future readiness

- **Overlays** — typed contract, four slots, eight planned entries, all inactive (`MARIA_RADAR_FUTURE_OVERLAYS.md`).
- **History/playback** — immutable snapshot/timeline helpers; scenes carry an explicit timestamp for deterministic replay.
- **Weather / airports / receiver coverage / heat maps / route projection / aircraft metadata** — planned overlays, capability-gated, none implemented.
- **Multi-receiver, 3D evolution** — scene model is platform-independent and renderer-agnostic; Presentation is a 2.5D CSS step, not a 3D engine.
- **Firmware alignment** — `MARIA_RADAR_VISUAL_CONTRACT.md`; shared design contract only, no shared code, no firmware changes.

## Validation

- **Root:** lint clean (oxlint); **131 tests / 19 files pass** (vitest); build clean (tsc + vite); format clean (prettier); `npm audit --omit=dev` → 0 vulnerabilities.
- **Backend:** lint clean (eslint); 17 tests pass (node:test); format clean; audit → 0 vulnerabilities. API contracts unchanged; OpenSky optional/disabled; DEMO endpoints work; no paid provider.
- **Firmware:** `pio test -e native` → 15 test cases pass. Builds SUCCESS for `maria-m5stack-core2`, `maria-m5stack-core2-diag`, `maria-esp32-2432s028r`, `maria-esp32-2432s028r-diag`. No upload; firmware source unchanged.
- **Runtime (DEMO):** `/health` 200; `/api/radar/source-status` reports `simulation`; snapshot returns 8 aircraft; `/radar` (+ all `?radarMode=`), `/map`, `/dashboard` all 200; ports clear on shutdown.
- **Browser/responsive:** all five modes pass at 1440×900, 1280×720,
  1024×768, 800×480, 768×1024, and 390×844; Minimal also passes as a
  320×240-equivalent frame. No horizontal overflow, clipped controls, or inaccessible
  mode selector/details were observed.
- **Accessibility:** change-only announcement logic unit-tested; non-color critical cue tested; reduced-motion CSS verified.
- **Source-state:** tests assert DEMO never renders LIVE in any mode.
- **Security/privacy:** no secrets, private coordinates, absolute paths, paid APIs, OpenSky enablement, or external telemetry in changed files; localStorage limited to `maria.radar.*`.

## Known limitations

- No physical firmware/board validation claimed.
- No real RTL-SDR/live validation in this milestone.
- No implemented overlays; no playback UI; no label-collision engine.
- `prediction` / `leaderLine` / `map` layers reserved but not implemented.

## Recommended next step

**MARIA v0.2.1 — Live Receiver Integration Validation:** readsb live
feed, target-volume performance, stale-data transitions, receiver
disconnect/reconnect behavior, renderer profiling, and an actual
hardware-terminal parity review.
