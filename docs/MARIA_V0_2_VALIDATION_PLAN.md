# MARIA v0.2 Validation Plan

Status: MARIA v0.2.0-beta.1 candidate validation complete.

Node 22 (`export PATH="/opt/homebrew/opt/node@22/bin:$PATH"`).

## Automated

### Root

```
npm ci
npm run lint
npm test
npm run build
npm run format:check
npm audit --omit=dev
```

### Backend

```
cd backend
npm ci
npm run lint
npm test
npm run format:check
npm audit --omit=dev
cd ..
```

Confirm API contracts unchanged, OpenSky remains optional/disabled, DEMO
endpoints work, no paid provider added.

### Firmware (no upload, no physical validation claim)

```
cd firmware
pio test -e native
pio run -e maria-m5stack-core2
pio run -e maria-m5stack-core2-diag
pio run -e maria-esp32-2432s028r
pio run -e maria-esp32-2432s028r-diag
cd ..
```

## Runtime (DEMO)

```
npm run dev:all
```

- `http://127.0.0.1:8081/health`
- `http://127.0.0.1:8081/api/radar/source-status`
- `http://127.0.0.1:8081/api/radar/snapshot`
- `http://127.0.0.1:5175/radar` (+ `?radarMode=` for each mode)
- `/map`, `/dashboard` for regressions

Confirm Ctrl-C clears ports.

## Manual functional (DEMO)

- /radar opens; default mode is Tactical with no valid stored preference.
- All five modes selectable; preference persists; reset restores Tactical.
- Switching mode does not refetch aircraft solely due to the render choice.
- Selection, labels, trails, range, altitude filter, auto-select nearest work in all modes.
- Selected target survives the Minimal cap; Minimal caps enforced.
- Reduced motion works; invalid stored preference falls back; source stays DEMO; no LIVE wording in DEMO.

## Browser and responsive validation

The real Vite application was exercised with Playwright against the
deterministic DEMO backend. Every mode was loaded at every listed viewport.

Sizes: 1440×900, 1280×720, 1024×768, 800×480, 768×1024, 390×844, and
320×240-equivalent for Minimal.

- PASS: no horizontal overflow at any mode/viewport combination.
- PASS: radar remains contained and useful; selector and details remain reachable.
- PASS: Mission Control stacks, Presentation stays clipped to its stage, and
  Classic remains contained.
- PASS: Minimal renders a complete 4:3, 320×240-equivalent frame.
- PASS: all modes display DEMO, never LIVE; no private coordinates are shown.
- PASS: radar targets expose keyboard focus, Enter changes selection, and the
  focused target has a visible 4px stroke.
- PASS: reduced motion removes sweep animation; essential target and status
  information remains static and visible.

Confirmed defects corrected during this pass:

- Ambiguous negative coordinates generated an invalid selected-target SVG
  bracket path and repeated browser console errors.
- The Minimal Embedded scope's intrinsic square dimensions expanded its outer
  frame beyond the promised 4:3 ratio.

## Screenshots

Five real-browser PNGs are present under `docs/assets/screenshots/v0.2/`.
See that directory's README for dimensions, filenames, and reproduction steps.

## Security / privacy

- No secrets, tokens, API keys, or absolute local paths in changed files.
- No private coordinates, receiver identifiers, or raw captures.
- No paid API, no OpenSky enablement, no external telemetry.
- localStorage limited to `maria.radar.*` preference keys.
