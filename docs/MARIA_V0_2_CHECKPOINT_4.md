# MARIA v0.2 Checkpoint 4 — Presentation + Minimal Modes, Selector, Persistence, Caps

Status: In development.

Branch: `feature/maria-v0.2-radar-rendering-engine`
Starting commit: `42d7cb1` (Checkpoint 3)

## Summary

Completes all five render modes by adding Presentation (2.5D) and
Minimal Embedded, a shared profile cap-enforcement step, a production
mode selector with preference persistence, and accessibility/responsive
refinements. Future overlay plugins and label-collision optimization are
intentionally not started.

## Files added

```
src/lib/radar-engine/applyRenderProfile.ts
src/lib/radar-engine/applyRenderProfile.test.ts
src/components/radar-engine/RadarModeSelector.tsx
src/components/radar-engine/RadarModeSelector.test.tsx
src/components/radar-engine/modes/PresentationRadarMode.tsx
src/components/radar-engine/modes/MinimalEmbeddedRadarMode.tsx
docs/MARIA_V0_2_CHECKPOINT_4.md
docs/MARIA_RADAR_RENDER_MODES.md
```

## Files modified

- `src/components/radar-engine/RadarViewport.tsx` — applies `applyRenderProfile(scene, profile)` (memoized) before rendering layers; all layers now consume the derived render scene.
- `src/components/radar-engine/modes/RadarModeRenderer.tsx` — dispatches Presentation and Minimal.
- `src/lib/radar-engine/renderProfiles.ts` — Presentation and Minimal flipped to `implemented: true`; Presentation layer set trimmed to implemented layers; map/prediction hints turned off to match what renders.
- `src/lib/radar-engine/themeRegistry.ts` — real Presentation and Minimal themes (replacing the Tactical placeholders).
- `src/radarEngine.css` — Presentation stage/plane perspective + halo + vignette, Minimal 320×240 frame, mode selector styling, visually-hidden helper, reduced-motion rules.
- `src/RadarScreen.tsx` — render mode is now state (query-param → stored preference → Tactical), persisted on selection; renders `<RadarModeSelector>` and an `aria-live` mode-change region.
- `src/lib/radar-engine/modeRegistry.test.ts`, `src/components/radar-engine/modes/RadarModeRenderer.test.tsx` — updated for five implemented modes.

## RadarScreen.tsx line count

713 → 750 (+37: render-mode state, `changeRenderMode`, aria-live effect, selector, live region).

## Presentation status — implemented

2.5D via a CSS perspective tilt on a wrapper around the shared
`RadarViewport`/`RadarScene`. Target coordinates are unchanged — a test
asserts the in-SVG `translate(...)` values are identical across all five
modes, so there is no separate projection and the tilt cannot desync
positions. No WebGL/Three.js, no second scene model, no invented 3D
positions. Interactive (selection, labels, trails, range, altitude,
selected-aircraft details). Reduced motion keeps the static tilt but
drops drift and sweep rotation. DEMO stays DEMO; no invented metrics.

## Minimal status — implemented

High-contrast flat preview framed at 320×240-equivalent (4:3). No
glow/blur/shadow (test asserts no `blur`/`drop-shadow` in its markup),
static (no sweep layer). Caps 12 targets / 6 labels / 8 trail points via
the shared enforcement step. No firmware code changed; web and firmware
share the design contract only.

## Profile enforcement status

`applyRenderProfile(scene, profile)` — pure, deterministic, immutable;
enforces target/label/trail caps at one shared point before layers
render (memoized in `RadarViewport`). Selected target never removed by a
cap and always keeps its label; trails keep newest points; source scene
never mutated. Ten unit tests.

## Selector status

`RadarModeSelector` — native-radio radiogroup over `listImplementedModes()`
only (five modes, no placeholders), text descriptions, keyboard/touch
operable, visible focus, reset-to-default (disabled when already
default). Placed in the radar controls panel (reflows on mobile).

## Persistence status

Key `maria.radar.renderMode`. Precedence: `?radarMode=` query param sets
the initial view (debug, not persisted) → stored preference → Tactical.
Invalid stored value, invalid param, and unavailable/throwing storage
all fall back to Tactical without crashing. User selection persists;
reset restores Tactical. Mode change causes no API refetch and no
source-state change (render mode is independent of the traffic source).

## Accessibility status

- `aria-live="polite"` region announces "Radar mode: <label>" on actual change only (mount-guarded).
- Selector: semantic radiogroup + legend, native keyboard operation, non-color descriptions, visible focus (inherits existing focus-visible ring).
- Reduced motion respected in all five modes (Minimal has no sweep; Presentation keeps a static tilt).
- Non-color signals retained/added: selection bracket (shape), `is-stale` opacity, critical stays red in every mode. Sweep is `aria-hidden`.
- **Deferred:** a formal Classic phosphor contrast audit and selected-aircraft-change announcements (Phase 22 polish).

## Responsive validation

- Mechanism: modes reuse the existing responsive `mission-control-console` shell (three-column desktop → stacked ≤900px). Minimal is constrained to `min(100%, 320px)` at 4:3, so it stays compact and cannot overflow. Presentation's tilted plane is wrapped in an `overflow: hidden` stage and uses relative widths, so the transform cannot overflow the page.
- **Not exhaustively re-measured** at each listed breakpoint (1440×900 … 390×844, plus 320×240) — no visual/browser harness is available in this environment. Structural review only; full per-breakpoint measurement remains a Phase 21 task and a known limitation.

## Tests

**+20 tests (86 → 106), 16 files, all passing.**

- `applyRenderProfile.test.ts` (10) — target/label/trail caps, selected preserved under tiny cap, selected always labelled, no-op for uncapped, no mutation, determinism, visibleCount/totalCount, DEMO preserved.
- `RadarModeSelector.test.tsx` (5) — implemented modes only, accessible radiogroup, active checked, reset disabled/enabled.
- `RadarModeRenderer.test.tsx` — extended to five modes: identical coordinates across modes, Presentation stage / Minimal frame wrappers, no glow/blur in Minimal, no WebGL/Three import, reduced-motion for presentation, unknown-mode fallback.
- `modeRegistry.test.ts` — five implemented modes, resolve-each, invalid stored → Tactical, throwing storage → Tactical.

Regression: all Tactical/Mission Control/Classic tests still pass; single sweep animation source and no `requestAnimationFrame`/`setInterval` still enforced across all engine files.

## Validation results

- `npm run lint` (oxlint): clean, exit 0
- `npm test` (vitest): **16 files, 106 tests passed**
- `npm run build`: clean
- `npm run format:check`: clean
- Runtime smoke (`npm run dev:all`): `/radar?radarMode=` returns 200 for all five modes and an invalid value (falls back to Tactical); backend snapshot returns the deterministic 8-aircraft DEMO set. Dev servers stopped; radar ports clear.
- Backend and firmware: **untouched** (git status shows no `backend/` or `firmware/` paths).

## Screenshots

Not captured — no headless browser in this environment; images are never
fabricated. Filenames and the manual capture procedure (all five modes,
DEMO-only checks) are in `docs/assets/screenshots/v0.2/README.md`.

## Source-state safeguards

DEMO/CACHE/LIVE/OFFLINE and wording come from the single scene builder /
`missionControlState`, identical across all five modes. Tests assert a
DEMO scene never renders LIVE wording in any mode.

## Known limitations

- Full per-breakpoint responsive measurement and Classic contrast audit deferred (no browser harness).
- Label placement is still a direct pass-through; collision-avoidance (Phase 12) not implemented.
- Prediction and leader-line layers are not implemented (omitted from Presentation's layer set for now).
- Screenshots not captured.
- Scene still rebuilds with `Date.now()` at call time rather than a shared clock tick (Checkpoint 5 performance pass).

## Risks for Checkpoint 5

- Future overlay plugins need a typed extension interface (`OverlayLayer` is a stub) without letting inactive/planned overlays reach normal users — feature flags must default off.
- History/playback readiness wants the scene's explicit `timestamp` to flow through immutable snapshots; the current per-render `Date.now()` should move to an injected clock so playback and screenshots are deterministic.
- Firmware visual-contract alignment (v0.2.1+) must document shared concepts without implying shared executable code.

## Guardrail confirmations

- USB helper files untouched, still untracked.
- OpenSky not enabled; no paid service; no new firmware target; no physical-hardware claims; API contracts unchanged.
- No push, no PR, no merge.
