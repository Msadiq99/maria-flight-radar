# MARIA Flight Radar v0.1.0-alpha Release Record

## Release Metadata

- Release date: 2026-07-18.
- Repository: <https://github.com/Msadiq99/maria-flight-radar>.
- Release: <https://github.com/Msadiq99/maria-flight-radar/releases/tag/v0.1.0-alpha>.
- Release PR: <https://github.com/Msadiq99/maria-flight-radar/pull/3>.
- Merge commit: `bd73cc2a90a32ff0fe9a1f0e26f56a94f8273087`.
- Tag: `v0.1.0-alpha`.
- Tagged commit: `bd73cc2a90a32ff0fe9a1f0e26f56a94f8273087`.
- Release type: public GitHub prerelease.
- Asset policy: source-only; no firmware binaries or other release assets.

## Validation Summary

- Node.js `v22.23.1`; npm `10.9.8`; PlatformIO `6.1.19`.
- Root lint, production build, and format check passed; 28 tests passed.
- Backend lint and format check passed; 17 tests passed.
- Root and backend production-only audits reported 0 vulnerabilities.
- Native firmware tests: 15 passed.
- Firmware builds passed for M5Stack Core2 normal/diagnostic and
  ESP32-2432S028R normal/diagnostic environments.
- Disposable clean-clone and public HTTPS-clone validation passed.
- Public clone installation, production build, and 28 root tests passed.
- Deterministic demo returned 8 targets. The UI labels the source as `DEMO`,
  never live traffic.

## Repository Configuration

- Visibility: public.
- Default branch: `main`.
- Description: Open-source local-first ADS-B flight radar with a web console
  and ESP32/M5Stack terminals.
- Topics: `ads-b`, `aircraft-tracking`, `aviation`, `dump1090`,
  `embedded-systems`, `esp32`, `flight-radar`, `iot`, `m5stack`,
  `open-source`, `platformio`, `radar`, `readsb`, `rtl-sdr`, `typescript`.
- Issues: enabled.
- Security: Dependabot security updates, vulnerability alerts, secret
  scanning, secret-scanning push protection, and private vulnerability
  reporting are enabled.
- Branch protection/rulesets: not configured automatically. This avoids
  unintentionally locking out the sole maintainer; configure reviewed
  pull-request and status-check requirements manually if desired.
- Social preview: manual upload pending. Use
  `docs/assets/release/maria-github-social-preview.png` in Repository Settings
  > General > Social preview.

## Hardware Status

- M5Stack Core2: source and diagnostic builds passed; physical display and
  touch validation remain pending.
- ESP32-2432S028R: source and diagnostic builds passed; physical validation
  remains pending.
- RTL-SDR: local receiver integration is software-ready; real receiver and
  aircraft-data validation remain pending.

## Safety and Scope

MARIA is not for aviation navigation or other safety-critical use. This is a
source-only alpha, has no paid-service requirement, keeps OpenSky disabled by
default, and does not claim live receiver or physical hardware validation.

## Known Limitations

- No live RTL-SDR evidence yet.
- No physical Core2 display/touch evidence yet.
- No physical ESP32-2432S028R evidence yet.
- Firmware binaries are intentionally not published.

## Next Milestone

MARIA v0.2.0-beta will focus on live RTL-SDR/readsb validation, real aircraft
data and LIVE/CACHE/DEMO/OFFLINE transitions, Core2 and ESP32 physical
validation, hardware evidence, and a later decision on experimental firmware
binaries with checksums.

## Guardrails Preserved

- No history rewrite or force push occurred.
- No existing tag was moved or overwritten.
- No new ESP32 target was added.
- No paid service was introduced; OpenSky remains disabled by default.
- No false live-data or physical-validation claim was added.
- No firmware binary was attached to the release.
- The pre-existing untracked USB helper files remained untouched.

## Post-Release Documentation

This record is intentionally on a separate documentation branch. The published
`v0.1.0-alpha` tag remains fixed at the release commit and must not be moved to
include this file.
