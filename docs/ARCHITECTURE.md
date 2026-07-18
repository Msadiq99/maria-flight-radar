# Architecture

## Current Implementation

The backend accepts telemetry, maintains local SQLite history, and exposes web
and firmware APIs. Its radar service normalizes local readsb/dump1090
`aircraft.json` data into a unified aircraft model. In `auto` mode, it prefers a
healthy local receiver, reuses a recent cached snapshot during a short
interruption, then falls back to deterministic simulation.

The React web application consumes the radar snapshot API. The firmware consumes
a compact Core2 payload and shares aircraft modeling, radar geometry, source
state, selection, settings, and demo/cache behavior across supported targets.

OpenSky is optional, isolated behind `OPENSKY_ENABLED=false`, and is never
needed for build, test, first setup, or normal demo operation.

## Data Flow

```text
Local receiver or simulator -> normalization -> source selection/cache
-> backend APIs -> web radar and compact firmware payload -> board display layer
```

Target prioritization and bounds keep embedded payloads small. Board-specific
code owns display, touch, pin mapping, power, storage, and resolution layout.

## Security Boundaries

Keep receiver services and the backend on trusted local networks. Secrets stay
in ignored local configuration. Do not expose telemetry writes or receiver APIs
to the internet without authentication, TLS, and deployment hardening.

## Planned Architecture

The project will evolve toward clearer board abstraction without changing the
existing working layout prematurely. See
[Multi-firmware architecture](MULTI_FIRMWARE_ARCHITECTURE.md).
