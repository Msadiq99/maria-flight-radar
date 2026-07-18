# MARIA Public Release Readiness RC2

Date: 2026-07-18
Branch: `chore/maria-public-release-rc2`
Release target: `v0.1.0-alpha`
Runtime verified: Node.js `v22.23.1`, npm `10.9.8`, PlatformIO `6.1.19`

## Decision

**READY WITH WARNINGS.** The source-only alpha is ready for review and manual
publication after the branch is pushed and its pull request is approved. It is
not a claim of completed physical hardware or live receiver validation.

## Release Content

- Original hero artwork: `docs/assets/branding/maria-radar-hero.png`.
- Original 1280x640 social preview:
  `docs/assets/release/maria-github-social-preview.png`.
- Local-first architecture diagram:
  `docs/assets/diagrams/maria-local-first-architecture.svg`.
- Verified, sanitized radar demo screenshot:
  `docs/assets/screenshots/maria-web-radar-demo.png`.
- Public README, installation, contribution, security, and alpha release notes
  are present and linked from the repository.

The browser screenshot shows eight deterministic demo targets. It contains no
live receiver capture, API credential, raw aircraft feed, or private
coordinate. The dashboard map screenshot was intentionally excluded because
it could expose a rendered location.

## Source and Privacy Review

- `MARIA_HISTORY_PRIVACY_REVIEW.md` records the full reachable-history review.
- No credential-shaped tokens, private keys, API secrets, or raw private
  coordinates were found in committed history.
- Historic local-network, machine, and USB-serial examples are low-risk
  development evidence, not secrets.
- **Decision: no history rewrite is required.** An owner may choose a rewrite
  later for stricter privacy preferences, but it is not a release blocker.
- The current tree contains no tracked local configuration, captures,
  screenshots with private location data, or generated build artifacts.

## Node 22 Validation

The release was validated with Homebrew `node@22` used only through the
current command environment; no shell profile or global project configuration
was changed.

| Surface                          | Result            |
| -------------------------------- | ----------------- |
| Root `npm ci`                    | Passed            |
| Root lint                        | Passed            |
| Root tests                       | 28 passed         |
| Root production build            | Passed            |
| Root format check                | Passed            |
| Root production audit            | 0 vulnerabilities |
| Backend `npm ci`                 | Passed            |
| Backend lint                     | Passed            |
| Backend tests                    | 17 passed         |
| Backend format check             | Passed            |
| Backend production audit         | 0 vulnerabilities |
| Firmware native tests            | 15 passed         |
| M5Stack Core2 build              | Passed            |
| M5Stack Core2 diagnostic build   | Passed            |
| ESP32-2432S028R build            | Passed            |
| ESP32-2432S028R diagnostic build | Passed            |

`npm ci` reports development-dependency audit notices at the root. The
production-only audit is clean; no automatic dependency upgrade was made for
this alpha.

## Runtime Demo Verification

With `LOCAL_ADSB_SIMULATOR=true OPENSKY_ENABLED=false`:

- `npm run dev:all` completed preflight and started web and backend services.
- `npm run dev:check` reported `frontend=ok`, `backend=ok`, and
  `radar-api=ok targets=8`.
- `http://127.0.0.1:5175/radar` returned the Vite application (`200`).
- `http://127.0.0.1:8081/health` returned `200`.
- `http://127.0.0.1:8081/api/radar/snapshot` returned `200` with 8 targets.
- Browser verification shows **DEMO AIRSPACE MONITOR**, deterministic source
  detail, and a **Traffic DEMO** status. A regression test ensures simulator
  tracks routed through the local ADS-B adapter cannot be presented as live.
- The temporary services were stopped and their ports released after checks.

## Clean-Clone Verification

A disposable `git clone --no-local` was created from this branch. In that
clone, root and backend dependencies were installed with Node 22, all root and
backend checks passed, `firmware/include/config.example.h` was copied to the
ignored local `config.h`, all four firmware environments built, native tests
passed, and the deterministic runtime check returned 8 targets. The temporary
clone was removed after validation.

## Hardware and Live-Data Status

- M5Stack Core2 and ESP32-2432S028R source targets build successfully, but
  physical display, touch, SD, Wi-Fi, and flashing confirmation remain pending.
- RTL-SDR/readsb/dump1090 integration is software-ready; live receiver
  hardware validation remains pending.
- OpenSky is optional, disabled by default, and not exercised against the
  external service. Its use remains subject to its terms, rate limits,
  approval, and licensing requirements.
- The alpha is source-only. Do not attach firmware binaries or claim
  operational aviation use.

## Manual Owner Actions

1. Review and approve the RC2 pull request.
2. Merge only after review and CI are satisfactory.
3. Change repository visibility manually when ready for publication.
4. Create and push annotated tag `v0.1.0-alpha` manually after merge.
5. Create the GitHub release manually using
   `MARIA_V0_1_0_ALPHA_RELEASE_NOTES.md`.

No repository-visibility change, tag, GitHub Release, merge, or force push was
performed during RC2 preparation.
