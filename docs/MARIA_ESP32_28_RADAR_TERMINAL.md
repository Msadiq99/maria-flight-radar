# MARIA ESP32 2.8-Inch Radar Pocket Terminal

## Supported Board

Target PlatformIO environment:

```sh
pio run -e maria-esp32-2432s028r
```

Expected hardware family:

- ESP32 2.8-inch integrated display board
- Confirmed PCB marking from photos: `2.8 LCD Display ESP32-32E 240x320 Resistance Touch`
- Expected display: 320x240 landscape, ILI9341
- Expected touch: XPT2046 resistive touchscreen

Hardware validation status: partially verified from PCB photos. No powered
ESP32-32E board test has been performed by Codex.

## PCB Revision Assumptions

The profile is now tied to the photo-confirmed PCB marking, but the GPIO table
remains a template. Before flashing production hardware, inspect and record the
exact TFT controller, touch controller, GPIO routing, display rotation,
backlight behavior, SD routing, and speaker behavior.

Do not treat the pin table below as physically validated until the board is
connected and the first-boot checklist passes.

## Pin Profile

Pin values live in one place:

```text
firmware/include/board_profiles/esp32_2432s028r.h
```

| Function             |             GPIO | Status                                     |
| -------------------- | ---------------: | ------------------------------------------ |
| TFT MISO             |               12 | UNVERIFIED_UNTIL_POWERED_TEST              |
| TFT MOSI             |               13 | UNVERIFIED_UNTIL_POWERED_TEST              |
| TFT SCLK             |               14 | UNVERIFIED_UNTIL_POWERED_TEST              |
| TFT CS               |               15 | UNVERIFIED_UNTIL_POWERED_TEST              |
| TFT DC               |                2 | UNVERIFIED_UNTIL_POWERED_TEST              |
| TFT RST              |               -1 | UNVERIFIED_UNTIL_POWERED_TEST              |
| Backlight            |               21 | UNVERIFIED_UNTIL_POWERED_TEST, active HIGH |
| Touch MISO           |               39 | UNVERIFIED_UNTIL_POWERED_TEST              |
| Touch MOSI           |               32 | UNVERIFIED_UNTIL_POWERED_TEST              |
| Touch SCLK           |               25 | UNVERIFIED_UNTIL_POWERED_TEST              |
| Touch CS             |               33 | UNVERIFIED_UNTIL_POWERED_TEST              |
| Touch IRQ            |               36 | UNVERIFIED_UNTIL_POWERED_TEST              |
| RGB LED R/G/B        |      4 / 16 / 17 | UNVERIFIED_UNTIL_POWERED_TEST              |
| SD MISO/MOSI/SCLK/CS | 19 / 23 / 18 / 5 | UNVERIFIED_UNTIL_POWERED_TEST              |
| Speaker              |               -1 | UNVERIFIED, disabled                       |
| Serial monitor       |           115200 | configured                                 |

## Libraries

The new target uses:

- `TFT_eSPI` for ILI9341 display rendering
- `XPT2046_Touchscreen` for resistive touch input
- `ArduinoJson` for bounded traffic response parsing
- `WiFiManager` for the existing non-blocking provisioning flow
- `TinyGPSPlus` for GPS parsing
- `Preferences` / NVS for radar settings

The existing M5StickC PLUS2 target remains on `M5Unified`.

## Diagnostic Mode

Diagnostic mode starts when either BOOT is held during reset or the
`maria-esp32-2432s028r-diag` environment is flashed.

Serial fallback commands:

```text
help info display touch wifi backend sd led speaker demo normal reboot retest wifi-clear
```

Documented build flags:

- `MARIA_DIAGNOSTIC_MODE`
- `MARIA_FORCE_DEMO_MODE`
- `MARIA_DISABLE_TOUCH`
- `MARIA_DISABLE_SD`
- `MARIA_DISABLE_AUDIO`
- `MARIA_VERBOSE_SERIAL`

## Screen Architecture

The pocket terminal is a dedicated embedded interface, not a compressed web UI.
It provides four screens:

- Radar
- Aircraft details
- System status
- Settings

The radar screen uses a dark aviation-console theme with cyan rings, green
normal targets, amber warning targets, red critical targets, selected-target
highlight, a stepped sweep line, target count, active range, GPS/feed state,
and paused/running sweep state.

Touch targets along the bottom bar are approximately 58-64 px wide by 34 px
tall on a 320x240 display.

## Backend URL

The terminal reuses the existing MARIA backend contract:

```text
GET {API_HOST}/api/traffic/nearby?lat={lat}&lon={lon}&radius_km={range}
```

Configure `API_HOST` and `API_KEY` in `firmware/include/config.h`. That file is
gitignored and must not be committed.

If `API_HOST` is empty, the terminal uses simulated aircraft data for a
display-only demo path.

## Wi-Fi Configuration

The target reuses the existing `WifiManager` provisioning behavior:

- Uses configured SSID/password when present.
- Starts the `MARIA-Setup` captive portal when credentials are missing.
- Reconnects with capped backoff.
- Does not embed personal credentials in source control.

## Settings and Persistence

Radar settings are stored in NVS under the `maria-radar` namespace.

Persisted fields:

- Range: 25, 50, 100, 200 km
- Brightness
- Labels enabled
- Trails enabled
- Sweep paused
- Altitude filter
- Alert-zone thresholds
- Touch calibration bounds

The schema is versioned and validated on load. Corrupt or invalid settings fall
back to safe defaults.

## Touch Calibration

Default touch calibration values are template values:

```text
minX=300 maxX=3800 minY=300 maxY=3800
```

These must be verified on physical hardware. The current firmware maps raw
touch readings through the stored bounds, debounces taps, ignores invalid
coordinates, and applies landscape-aware hit testing.

## Modes

First bring-up modes:

- Display-only demo: set `API_HOST` to an empty string in local `config.h`.
  The terminal renders simulated aircraft without backend traffic.
- Touch-test mode: use the diagnostic touch screen for raw/mapped coordinates
  and five-point calibration.
- Simulated-aircraft demo: enabled by empty `API_HOST`; uses four bounded demo
  targets.

## Build and Flash

Build existing firmware:

```sh
cd firmware
pio run -e m5stick-c-plus2
```

Build the 2.8-inch terminal:

```sh
cd firmware
pio run -e maria-esp32-2432s028r
```

Build the first-flash diagnostic image:

```sh
cd firmware
pio run -e maria-esp32-2432s028r-diag
```

Flash the 2.8-inch terminal:

```sh
cd firmware
pio run -e maria-esp32-2432s028r -t upload
```

Flash the diagnostic image:

```sh
cd firmware
pio run -e maria-esp32-2432s028r-diag -t upload
```

Use `pio device list` to identify the serial port when auto-detection chooses
the wrong device.

## Tests

Host-side testable logic is covered with the PlatformIO native environment:

```sh
cd firmware
pio test -e native
```

Covered logic:

- Distance and bearing projection
- Range clipping
- Invalid coordinate rejection
- Altitude filtering
- Selection after filtering
- Alert-zone boundaries
- Freshness state
- Vertical state
- Preference validation
- Diagnostic serial command parsing
- Calibration mapping and validation
- Backend and Wi-Fi status classification
- RGB active-level conversion
- Simulated aircraft movement

## Performance Limits

Compiled targets:

- Maximum aircraft count: 32
- Trail-point limit: 8 per aircraft reserved in the model
- Traffic refresh: 3 seconds after success, capped retry backoff to 30 seconds
- Status redraw: 1 second
- Sweep redraw target: 120 ms when running
- HTTP timeout: 2.5 seconds
- JSON response capacity guard: 24 KB

Measured build size for `maria-esp32-2432s028r`:

- Normal RAM: 57,292 bytes, 17.5%
- Normal flash: 1,136,541 bytes, 57.8%
- Diagnostic RAM: 57,888 bytes, 17.7%
- Diagnostic flash: 1,188,337 bytes, 60.5%

Runtime free heap must still be measured on physical hardware.

## First-Boot Checklist

Run this checklist on the actual board before calling the profile validated:

1. Confirm exact PCB marking and photograph/scribble the revision.
2. Flash `maria-esp32-2432s028r`.
3. Confirm no reset loop on serial monitor.
4. Confirm landscape orientation.
5. Confirm backlight control.
6. Confirm readable cyan/green/amber/red graphics.
7. Confirm touch maps to the correct bottom controls.
8. Confirm Wi-Fi provisioning via `MARIA-Setup`.
9. Confirm backend traffic fetch.
10. Confirm range changes.
11. Confirm aircraft previous/next selection.
12. Confirm stale-data indication after backend interruption.
13. Restart and confirm settings persistence.

## Troubleshooting

- Blank screen: verify TFT pins, backlight GPIO, active level, and ILI9341
  controller.
- Mirrored/rotated touch: update touch calibration bounds and rotation mapping.
- No touch input: verify XPT2046 CS/IRQ and whether the board uses shared or
  separate SPI routing.
- Backend unavailable: confirm `API_HOST`, Wi-Fi state, backend port, and
  `/api/traffic/nearby` availability.
- No GPS: enable `SIMULATE_GPS_WHEN_NO_FIX` for bench testing or verify UART
  pins for the GPS module.

## Known Limitations

- Pin mapping is not physically validated.
- Touch diagnostics include a five-point calibration flow, but physical
  coordinate correctness is still unverified.
- Trails are persisted in settings but not rendered yet on the pocket terminal.
- Factory reset is modeled in settings code, but the UI still needs a
  long-press confirmation flow before it is exposed as a normal action.
- No physical hardware results are available from this run.
