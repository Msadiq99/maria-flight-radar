# MARIA v0.2 Radar Mode Screenshots

Planned deterministic DEMO screenshots for the render-mode comparison:

- `maria-radar-tactical-checkpoint3.png`
- `maria-radar-mission-control-checkpoint3.png`
- `maria-radar-classic-checkpoint3.png`

## Status — not captured in Checkpoint 3

These PNGs are **not yet committed.** The Checkpoint 3 development
environment has no headless browser (Playwright, Puppeteer, and Chromium
are all absent — verified), and screenshots must never be fabricated or
mocked. They will be captured from a real browser once one is available
(or in Checkpoint 5 alongside the full mode gallery).

## Capture procedure (deterministic, DEMO only)

1. Start demo mode with Node 22:

   ```
   npm run dev:all
   ```

2. Open each mode using the development-only render-mode query parameter,
   against the deterministic simulation dataset (source stays `DEMO`):

   - Tactical: `http://127.0.0.1:5175/radar?radarMode=tactical`
   - Mission Control: `http://127.0.0.1:5175/radar?radarMode=mission-control`
   - Classic: `http://127.0.0.1:5175/radar?radarMode=classic`

3. Confirm before capturing each frame:
   - source badge reads **DEMO** (never LIVE),
   - the center shows "Sanitized demo center" (no private coordinates),
   - no personal browser chrome/data is in frame,
   - the same simulation aircraft set is present in every shot.

4. Save each frame under this directory with the filename above.

Do not enable OpenSky, a live receiver, or any real location when
capturing — every published screenshot must depict DEMO data only.
