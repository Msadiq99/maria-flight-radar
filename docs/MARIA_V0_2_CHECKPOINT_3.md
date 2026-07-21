# MARIA v0.2 Checkpoint 3 — Mission Control + Classic Modes, Theming, Shared Animation

Status: In development.

Branch: `feature/maria-v0.2-radar-rendering-engine`
Starting commit: `c8e3910` (Checkpoint 2)

## Summary

Adds two more implemented render modes (Mission Control, Classic Radar)
on top of the Checkpoint 2 foundation, introduces a typed per-mode theme
registry driving all radar geometry colors through CSS variables, and
settles the shared-animation approach as a single CSS-variable-driven
sweep. Presentation and Minimal remain typed placeholders.

## Files added

```
src/lib/radar-engine/themeRegistry.ts
src/lib/radar-engine/themeRegistry.test.ts
src/radarEngine.css
src/components/radar-engine/modes/types.ts
src/components/radar-engine/modes/MissionControlRadarMode.tsx
src/components/radar-engine/modes/ClassicRadarMode.tsx
src/components/radar-engine/modes/RadarModeRenderer.tsx
src/components/radar-engine/modes/RadarModeRenderer.test.tsx
docs/MARIA_V0_2_CHECKPOINT_3.md
docs/assets/screenshots/v0.2/README.md
```

## Files modified

- `src/RadarScreen.tsx` — resolves a dev-only `?radarMode=` param, applies the mode class + inline theme vars on the console root, and renders `<RadarModeRenderer>` instead of `<TacticalRadarMode>` directly.
- `src/App.css` — radar geometry rules now read `var(--radar-*, <tactical-fallback>)`; sweep duration/opacity are variables; added `.radar-target.is-stale` styling.
- `src/missionControl.css` — removed the blanket `.mission-control-console .radar-*` **color** overrides (now driven by the `mission-control` theme's `--maria-*`-mapped vars); kept structural + typography rules.
- `src/App.tsx` — imports `radarEngine.css`.
- `src/components/radar-engine/layers/AircraftLayer.tsx` — adds an `is-stale` class when a target's freshness is `stale` (non-color state signal).
- `src/components/radar-engine/modes/TacticalRadarMode.tsx` — refactored to the shared `RadarModeProps` type.
- `src/lib/radar-engine/renderProfiles.ts` — `mission-control` and `classic` flipped to `implemented: true`.
- `src/lib/radar-engine/modeRegistry.test.ts` — updated for three implemented modes.

## Line counts

| File                                    | Before | After                                                       |
| --------------------------------------- | ------ | ----------------------------------------------------------- |
| `src/RadarScreen.tsx`                   | 699    | 713 (+14: mode resolution, theme/class on root, dispatcher) |
| `src/lib/radar-engine/themeRegistry.ts` | —      | 224 (new)                                                   |
| `src/radarEngine.css`                   | —      | 63 (new)                                                    |
| `MissionControlRadarMode.tsx`           | —      | 19 (new)                                                    |
| `ClassicRadarMode.tsx`                  | —      | 17 (new)                                                    |
| `RadarModeRenderer.tsx`                 | —      | 26 (new)                                                    |
| `TacticalRadarMode.tsx`                 | 33     | 12 (shared props type)                                      |

No mission-control React component (`missionControl.tsx`) was changed —
the shell chrome was reused as-is; only its CSS color overrides moved
into the theme system.

## Mission Control status — implemented

`MissionControlRadarMode` renders the shared `RadarViewport`/`RadarScene`
with the `mission-control` profile, inside the existing MARIA
mission-control shell (control panel, selected-aircraft panel, system
status strip) that `RadarScreen` already provides. The `mission-control`
theme maps every palette value back to the shipped `--maria-*` design
tokens, so the command-center look is preserved; the sweep is more
restrained (lower opacity, slower) than Tactical.

Operational values shown (source state, target count, visible count,
selected target, update freshness, backend status, alert count) all come
from the existing shared scene/telemetry. **No receiver-specific metrics
are invented** — no SDR signal, GPS lock, temperature, satellites,
battery, packet loss, or antenna state anywhere.

## Classic status — implemented

`ClassicRadarMode` renders the shared viewport with the `classic`
profile: monochrome green phosphor palette, brighter/faster sweep, and a
restrained drop-shadow glow (`radarEngine.css`) — **no full-screen
blur**. The scope backdrop becomes a near-black green well. Critical
stays red for safety clarity. All targets remain rendered and selectable
regardless of sweep angle (the sweep only changes brightness); labels and
trails toggles still work; the selected target keeps its bracket.

## Animation architecture

**Decision: single CSS-variable-driven sweep (Option A), no JS clock.**
One `@keyframes radar-sweep` in `App.css` is the only animation source;
each mode sets `--radar-sweep-duration`. Benefits: no per-layer or
per-target `requestAnimationFrame`, no 60fps React re-renders, and pause
(`.is-paused`) / reduced-motion handling stay pure CSS. Reduced motion
disables sweep rotation in base and Classic; Classic's reduced-motion
sweep degrades to a static dimmed highlight. Targets stay fully visible
and selectable in every case. Tests enforce the single keyframe source
and the absence of `requestAnimationFrame`/`setInterval` in engine code.

## Theme architecture

`themeRegistry.ts` defines a typed `RadarTheme` (palette + sweep
opacity/duration + glow) per mode. `radarThemeToCssVars(mode)` produces
inline `--radar-*` custom properties applied on the console root by
`RadarScreen`; `App.css` layer rules consume them via `var(--radar-*,
fallback)`. This keeps layer components color-free (class names only) and
makes the theme the single palette source of truth — also the palette
contract future non-CSS renderers (2.5D presentation, firmware) will
read. Mode class `radar-mode-{id}` carries structural/effect rules
(Classic phosphor backdrop + glow).

Implemented after this checkpoint: **Tactical, Mission Control, Classic**.
Placeholders: Presentation, Minimal.

## Layer behavior by mode

- **Tactical:** background, grid, rangeRing, sweep, alertZone, trail, aircraft, label, selection (+ overlay slot).
- **Mission Control:** same as Tactical plus the `overlay` slot; restrained sweep via theme.
- **Classic:** background, rangeRing, sweep, trail, aircraft, label, selection (no grid/alertZone — a cleaner phosphor scope).

No map, weather, airport, coverage, or heat-map layers were added.

## Dev-only mode switching

`?radarMode=tactical|mission-control|classic`, resolved through
`resolveRadarRenderMode` (invalid or not-yet-implemented → Tactical).
Render mode is independent of the traffic **source** mode, so switching
causes no API refetch and no source-state change. No `localStorage`
persistence yet — that arrives with the Checkpoint 4 production selector.
The mechanism is documented here and in the audit doc.

## Tests

**+18 tests (68 → 86), 14 files, all passing.**

- `themeRegistry.test.ts` (7) — theme per mode, all vars emitted, ms/px units, Mission Control → `--maria-*` mapping, Classic critical distinguishable from normal, Classic glow vs Tactical/MC no-glow, mode-class namespacing.
- `RadarModeRenderer.test.tsx` (10) — every implemented mode renders all targets (sweep never hides them), selection bracket present, labels/trails toggles honored, DEMO never renders LIVE wording, unimplemented mode falls back to a working scope; plus the shared-animation group (single keyframe source, variable-driven duration, reduced-motion stops rotation in base + classic, no per-target JS loop).
- `modeRegistry.test.ts` — updated for three implemented modes and implemented-vs-placeholder resolution.

Regression: all Checkpoint 2 tests still pass; Tactical unchanged.

## Validation results

- `npm run lint` (oxlint): clean, exit 0
- `npm test` (vitest): **14 files, 86 tests passed**
- `npm run build` (tsc -b && vite build): clean
- `npm run format:check` (prettier): clean
- Runtime smoke (`npm run dev:all`): `/radar?radarMode=` returns 200 for tactical, mission-control, classic, and an invalid value (client falls back to Tactical); backend `/health` 200 and `/api/radar/source-status` reports `simulation`. Dev servers stopped; radar ports clear afterward.
- Backend and firmware directories: **untouched** (git status shows no `backend/` or `firmware/` paths).

## Responsive validation

The Mission Control layout continues to use the existing
`mission-control-console` responsive grid (three-column desktop →
stacked at ≤900px), unchanged by this checkpoint. Classic reuses the same
shell with the phosphor theme; the scope stays inside the display well
(`aspect-ratio: 1`, `overflow: hidden`) so it cannot overflow its
container. **Full per-breakpoint validation across all listed sizes
(1440×900 … 390×844) is deferred to the Phase 21 responsive pass** and is
listed as a known limitation — it was not exhaustively re-measured here
because no visual/browser harness is available in this environment.

## Accessibility validation

- Preserved from the shared shell: focusable/keyboard-selectable targets, `aria-live` panels, semantic panel headings, visible focus rings, source state conveyed by text (not color alone).
- Added: `is-stale` gives a non-color (opacity) freshness signal; selection uses a bracket shape, not just color. Critical stays a distinct red in every mode. Sweep is `aria-hidden` and not announced.
- Reduced motion respected in all three modes (no rotation, no pulsing/flashing).
- **Deferred:** targeted `aria-live` announcements specifically for mode-change and selected-aircraft-change events (Phase 22 / Checkpoint 4), and formal contrast measurement of the Classic phosphor palette.

## Source-state safeguards

`SourceState` (DEMO/CACHE/LIVE/OFFLINE) and its truthful wording come
from the shared `missionControlState.ts` and the single scene builder —
identical across all three modes. `RadarModeRenderer.test.tsx` asserts a
DEMO scene never renders `LIVE` / "Live target" / "Live airspace" wording
in any implemented mode.

## Backend / firmware

Untouched. No shared contracts changed; only web `src/` and `docs/` were
modified.

## Known limitations

- Presentation and Minimal remain placeholders (not selectable, fall back to Tactical).
- No production mode selector yet; switching is dev-only via query param, no persistence.
- Screenshots not captured — no headless browser in this environment; capture procedure documented in `docs/assets/screenshots/v0.2/README.md`. **No images were fabricated.**
- Tactical currently shares the Mission Control three-column shell (differs by palette only); a radar-first Tactical layout is a Phase 21 refinement.
- Full responsive re-measurement and Classic contrast audit deferred.
- Label-collision placement and target/label/trail render-time caps still not implemented (Checkpoint 4/5).

## Risks for Checkpoint 4

- The production mode selector must expose only `listImplementedModes()` (three now) and persist to `maria.radar.renderMode`; any test asserting the dev-only query-param behavior will need to coexist with the persisted selector.
- Minimal Embedded (Checkpoint 4) is the first mode to actually enforce target/label/trail caps — the scene builder or viewport will need a real cap-application point, which nothing reads yet.
- Presentation's 2.5D perspective is the first mode that may not be expressible purely through the current SVG layer stack + CSS-variable theme; it may need a wrapper transform, which must not disturb the shared scene/interaction contract.

## Guardrail confirmations

- USB helper files (`docs/MARIA_ESP32_USB_DETECTION.md`, `scripts/check-maria-board.sh`, `scripts/identify-usb-serial.sh`): untouched, still untracked.
- OpenSky not enabled; no paid service added; no new firmware target; no physical-hardware claims.
- No push, no PR, no merge.
