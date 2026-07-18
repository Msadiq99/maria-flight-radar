# MARIA Public Release Readiness RC1

## Metadata

- Date: 2026-07-18
- Branch: `chore/maria-public-release-rc1`
- Starting commit: `76818780f0d505b4af3d1a85093cece91de3bd4c`
- Ending commit: this report's commit on the preparation branch
- Target release: `v0.1.0-alpha`
- Repository visibility: unchanged by this work

## Security

Current-tree Git-native scans found no tracked credential values, private keys,
or sensitive environment files. No dedicated external scanner was installed;
neither `gitleaks` nor `trufflehog` was available. History pattern scans found
old configuration and privacy examples, but no credential-shaped token or key.

Credentials requiring rotation: none found. History rewrite is not required for
credential remediation. The owner should decide whether to rewrite historical
private-network examples before publication. See
[the security audit](PUBLIC_RELEASE_SECURITY_AUDIT.md).

Status: **PASS WITH WARNINGS**.

## Privacy

Current public examples use generic serial devices, backend host placeholders,
and blank receiver coordinates. Local configuration, runtime data, build output,
and receiver data are ignored. Current-tree scans found no absolute user paths,
private LAN addresses, or specific USB serial identifiers.

## Documentation and Governance

README, Apache-2.0 license, contribution guide, Code of Conduct, security and
support policies, changelog, roadmap, installation, architecture, release
process, firmware support matrix, board porting guide, multi-firmware strategy,
publication checklist, and alpha release notes are present. Relative Markdown
links passed a local audit.

GitHub issue forms, pull-request template, Dependabot configuration, and public
CI workflow are present.

## CI and Validation

- Root: lint passed; 27 tests passed; production build passed; format check
  passed.
- Backend: lint passed; 17 tests passed; format check passed.
- Firmware: Core2 normal/diagnostic and ESP32-2432S028R normal/diagnostic
  environments built successfully.
- Native firmware tests: 15 of 15 passed.
- Production dependency audit: root 0 vulnerabilities; backend 0
  vulnerabilities.
- Clean clone: root and backend checks, all four firmware builds, and native
  tests passed after copying the safe firmware example configuration.

The local host supplied Node 20.15.1 while the project requires Node 22.12 or
newer. Checks passed after adding a local-only oxlint platform binding; use the
declared Node version in CI and release environments.

## Demo Mode

A clean clone started with `LOCAL_ADSB_SIMULATOR=true` and
`OPENSKY_ENABLED=false`. The web route, health endpoint, and radar snapshot
responded successfully. The deterministic local simulation returned eight
targets. The launcher shutdown was verified not to leave ports 5175 or 8081
listening.

## Live ADS-B and Hardware

- Live ADS-B: **SOFTWARE READY - hardware validation pending**.
- M5Stack Core2: builds, native tests, upload, and hash verification recorded;
  display and touch evidence remain pending.
- ESP32-2432S028R: normal and diagnostic builds pass; physical validation is
  pending.

## Known Limitations

- No real receiver hardware evidence is included.
- Physical validation differs by board and is not implied by CI builds.
- The current host did not meet the declared Node engine.
- Historical privacy examples require owner review before publication.

## Manual GitHub Actions Required

1. Review the audit and decide on history cleanup.
2. Push this preparation branch and open a pull request to `main`.
3. Review CI, merge, and configure branch protections.
4. Enable available security features and change repository visibility to public.
5. Tag `v0.1.0-alpha`, create the GitHub Release from the alpha notes, verify a
   public clone, and publish announcements.

## Final Decision

**READY WITH WARNINGS**: public-tree security and release validation pass, but
the owner must review historical privacy examples and use the declared Node
runtime for release operations.
