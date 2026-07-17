# MARIA Core2 Radar Console

Status: IMPLEMENTED. Build, native-test, and flash validation are complete;
physical display and touch confirmation remain pending.

## Layout

The landscape 320x240 Core2 console uses a 22 px header, 18 px status bar,
72 px overview panel, 176 px center region, and 72 px selected-aircraft panel.
The circular radar uses an approximately 160 px diameter scope centered in the
available middle region.

```text
+----------------------------------------------------------------+
| MARIA FLIGHT RADAR                         LIVE       8 AC     |
| OVERVIEW       |             N             | SELECTED           |
| AC / range     |        circular scope     | callsign           |
| labels / mode  |    target markers/labels  | altitude / speed   |
|                |             S             | heading / distance |
| WIFI | API | SOURCE | COUNT | AGE                               |
+----------------------------------------------------------------+
```

## Controls

- Left overview rows: next aircraft, range cycle, labels toggle, status.
- Right panel: next aircraft.
- Bottom bar: previous, next, range, pause/resume, details.
- Existing diagnostics remain available through the normal diagnostic boot path.

## Source states

The header and status bar display LIVE, CACHE, DEMO, or OFFLINE. Simulation is
always displayed as DEMO. No live receiver data is fabricated.

## Density and fallback

The compact payload remains bounded by `CORE2_MAX_TARGETS` (default 12).
The screen renders at most six labels; the selected label is always attempted.
When Wi-Fi or the backend is unavailable, the existing deterministic fallback
keeps the radar visible.

## Validation evidence (2026-07-17)

- PlatformIO 6.1.19 built `maria-m5stack-core2` and
  `maria-m5stack-core2-diag` successfully.
- The native firmware suite passed 15 of 15 tests, including radar geometry,
  source badges, and touch control coverage.
- Normal Core2 firmware uploaded successfully to
  `/dev/cu.usbserial-537A0079331` (`ESP32-D0WDQ6-V3`, revision `v3.0`), with
  the bootloader, partition, and application hashes verified by esptool.
- A non-interactive serial read received `[wifi] not connected (status=1),
  retrying...`. The interactive PlatformIO monitor cannot allocate a terminal
  in the validation environment (`termios: Operation not supported by device`),
  so it did not provide a complete boot capture.
- The local backend smoke test served eight deterministic-simulation aircraft
  with `OPENSKY_ENABLED=false`. This is backend evidence only, not visual
  confirmation of the Core2 screen.

## Physical verification still required

1. Build `maria-m5stack-core2`.
2. Upload to the validated Core2 serial port.
3. Confirm nonblank boot stages followed by the console.
4. Confirm DEMO badge and targets when the backend is unavailable.
5. Tap range, labels, previous/next, and pause controls.
6. Confirm selected aircraft values remain readable.

No screenshot or physical confirmation is included in this repository. Confirm
the screen and touch behavior on the device before declaring hardware success.
