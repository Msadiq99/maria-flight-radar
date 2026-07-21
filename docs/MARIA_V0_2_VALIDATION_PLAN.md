# MARIA v0.2 Validation Plan

Status: MARIA v0.2 — in development.

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

## Responsive (manual — no browser automation available)

Because this environment has no Playwright/Puppeteer/Chromium, responsive
validation is **structural/CSS-level**, plus these manual browser steps to
run where a browser is available. For each size, load each mode via
`?radarMode=` and verify:

Sizes: 1440×900, 1280×720, 1024×768, 800×480, 768×1024, 390×844, and
320×240-equivalent for Minimal.

- No horizontal page overflow; radar keeps non-zero useful height.
- Mode selector reachable; target selection works; details readable.
- Presentation transform does not clip controls; Classic circle stays contained; Mission Control stacks; Minimal preview usable.
- Reduced motion works; DEMO stays DEMO.

## Screenshots

Capture only with a real browser (none here — never fabricate). See
`docs/assets/screenshots/v0.2/README.md` for the exact procedure and the
five target filenames.

## Security / privacy

- No secrets, tokens, API keys, or absolute local paths in changed files.
- No private coordinates, receiver identifiers, or raw captures.
- No paid API, no OpenSky enablement, no external telemetry.
- localStorage limited to `maria.radar.*` preference keys.
