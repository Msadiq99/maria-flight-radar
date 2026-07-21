# MARIA v0.2 Radar Mode Screenshots

Deterministic DEMO screenshots for the five-mode comparison:

- `maria-radar-tactical.png`
- `maria-radar-mission-control.png`
- `maria-radar-classic.png`
- `maria-radar-presentation.png`
- `maria-radar-minimal.png`

## Status — captured and verified

The five PNGs were captured from the real Vite application with Playwright.
Tactical, Mission Control, Classic Radar, and Presentation use a 1440×900
browser viewport. Minimal Embedded is an element capture of the exact 320×240
CSS frame (the PNG is 320×241 because the browser rounds its fractional border
bounds). Browser chrome is excluded.

| Mode             | Screenshot                                                         |
| ---------------- | ------------------------------------------------------------------ |
| Tactical         | [maria-radar-tactical.png](maria-radar-tactical.png)               |
| Mission Control  | [maria-radar-mission-control.png](maria-radar-mission-control.png) |
| Classic Radar    | [maria-radar-classic.png](maria-radar-classic.png)                 |
| Presentation     | [maria-radar-presentation.png](maria-radar-presentation.png)       |
| Minimal Embedded | [maria-radar-minimal.png](maria-radar-minimal.png)                 |

## Reproduction procedure (deterministic, DEMO only)

1. Start demo mode with Node 22:

   ```
   npm run dev:all
   ```

2. Open each mode using the development-only render-mode query parameter,
   against the deterministic simulation dataset (source stays `DEMO`):

   - Tactical: `http://127.0.0.1:5175/radar?radarMode=tactical`
   - Mission Control: `http://127.0.0.1:5175/radar?radarMode=mission-control`
   - Classic: `http://127.0.0.1:5175/radar?radarMode=classic`
   - Presentation: `http://127.0.0.1:5175/radar?radarMode=presentation`
   - Minimal Embedded: `http://127.0.0.1:5175/radar?radarMode=minimal`

   (Or select the mode from the "Render mode" control in the radar
   controls panel — it persists to `maria.radar.renderMode`.)

3. Confirm before capturing each frame:
   - source badge reads **DEMO** (never LIVE),
   - the center shows "Sanitized demo center" (no private coordinates),
   - no personal browser chrome/data is in frame,
   - the same simulation aircraft set is present in every shot.

4. Save each frame under this directory with the filename above.

Do not enable OpenSky, a live receiver, or any real location when
capturing — every published screenshot must depict DEMO data only.
