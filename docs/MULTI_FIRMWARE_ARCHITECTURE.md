# Multi-Firmware Architecture

## Existing Environments

The current `platformio.ini` provides `m5stick-c-plus2`, Core2 normal and
diagnostic environments, ESP32-2432S028R normal and diagnostic environments,
and native tests.

## Current Boundaries

Shared code includes radar models, geometry, settings, touch action semantics,
traffic client behavior, diagnostics, and Wi-Fi/backend services. Board profiles
and board implementation files contain display, touch, pin, and resolution
coupling. `main.cpp` still coordinates multiple target paths and is an area for
careful future extraction.

## Safe Future Extraction

1. Keep existing environments compiling while extracting shared domain headers.
2. Move shared services only after native test coverage protects them.
3. Extract one board adapter at a time with physical validation evidence.
4. Expand CI before declaring a target stable.

Future environment names should be `maria-<board-name>` and
`maria-<board-name>-diag`. Stable targets require CI, documented pins, and
physical display/touch/network evidence; other targets remain experimental.
Release binaries should include board, environment, version, and commit.

## Future Direction

This is a proposed layout, not the current layout:

```text
firmware/
├── include/maria/
│   ├── aircraft_model.h
│   ├── radar_geometry.h
│   ├── source_state.h
│   ├── api_client.h
│   └── target_selector.h
├── src/shared/
├── src/boards/
│   ├── m5stack_core2/
│   └── esp32_2432s028r/
├── test/
└── platformio.ini
```
