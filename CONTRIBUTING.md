# Contributing to MARIA Flight Radar

MARIA welcomes focused contributions to the web, backend, documentation, and
firmware. Keep changes small, reviewable, and compatible with the local-first
architecture.

## Before You Start

- Use a descriptive branch name such as `feature/<area>-<change>` or
  `fix/<area>-<issue>`.
- Open an issue for bugs or substantial proposals before investing in a large
  implementation.
- Never commit secrets, private coordinates, receiver captures, local paths,
  generated artifacts, or device-specific configuration.

## Pull Requests

Use clear, imperative commits and explain the behavior changed. Update tests and
documentation with the code. Before opening a pull request, run:

```bash
npm run lint && npm test && npm run build && npm run format:check
cd backend && npm run lint && npm test && npm run format:check
cd ../firmware && pio test -e native
```

Build any firmware environment affected by the change. Preserve backend API
contracts unless the pull request documents a deliberate migration.

## Firmware Contributions

Board requests belong in the board request issue template. A board is not
considered supported until its firmware builds, tests pass, its pin mapping is
documented, and physical display/touch evidence is supplied. Include board
model, PlatformIO environment, logs, and photos for hardware claims.

## Coding and Documentation

Follow established project patterns, run format checks, and write documentation
for configuration or user-visible behavior. Do not claim live receiver or
physical hardware validation without evidence.

## Pull Request Checklist

- Scope is focused and backwards compatibility was reviewed.
- Tests, builds, and documentation are updated.
- No secrets, private data, or generated artifacts are included.
- Firmware matrix and hardware evidence are updated where applicable.
