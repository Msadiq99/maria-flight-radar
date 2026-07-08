# MARIA Flight Radar firmware

Firmware for the MARIA Flight Radar GPS/IMU tracker unit, targeting an **M5StickC
PLUS2** (ESP32-PICO-V3-02). Reads position from an external GPS module and
orientation/acceleration from the onboard IMU, then POSTs telemetry over
Wi-Fi to a backend API on a fixed interval.

## Hardware

- **MCU**: M5StickC PLUS2 (ESP32-PICO-V3-02, 8MB flash)
- **GPS**: external NEO-6M / NEO-M8N (UART, 9600 baud) — not built in
- **IMU**: onboard MPU6886, read via the M5Unified library (auto-detects the
  correct chip driver rather than assuming MPU6050 register maps)

PlatformIO has no dedicated PLUS2 board definition yet; `m5stick-c` targets
the same chip family and builds/flashes correctly. Its profile assumes 4MB
flash even though the real chip has 8MB, so the default partition table
doesn't use the extra space — fine for now, worth revisiting if the binary
grows a lot (currently ~82% of the 4MB partition).

### Wiring

The PLUS2 only exposes 4 GPIOs on its 8-pin HAT connector: `G26, G36/G25, G0`
(plus 5V/3V3/GND/BAT). The onboard IMU uses the internal I2C bus and needs no
external wiring.

| Module | Pin | ESP32 pin |
|--------|-----|-----------|
| GPS    | TX  | G26 (RX2, receive-only) |
| GPS    | RX  | not connected — firmware never transmits to the GPS |
| GPS    | VCC/GND | 3.3V / GND (via HAT connector) |

Pin assignments live in `include/pins.h`.

## Setup

1. Install [PlatformIO](https://platformio.org/) (CLI or VS Code extension).
2. Copy `include/config.example.h` to `include/config.h` and fill in your
   Wi-Fi credentials and backend API details. `config.h` is gitignored so
   secrets never get committed.
3. Build and flash over USB:
   ```
   pio run -t upload
   pio device monitor
   ```
   PlatformIO auto-detects the USB serial port; pass `--upload-port
   /dev/cu.usbserial-XXXX` explicitly if it picks the wrong one (check with
   `pio device list`).

## Architecture

- `wifi_manager` — connects to Wi-Fi and reconnects with exponential backoff
  without blocking sensor reads.
- `gps_reader` — wraps TinyGPS++ over `Serial2`, polled every loop iteration
  so incoming bytes are never dropped.
- `imu_reader` — reads the onboard MPU6886 via M5Unified.
- `telemetry_client` — serializes the latest GPS fix + IMU sample to JSON and
  POSTs it to the backend.
- `main.cpp` — wires the above together in a single loop, sending telemetry
  every `TELEMETRY_INTERVAL_MS` (default 2s).

No RTOS tasks yet — a single loop is enough for one GPS + one IMU at a 2s
telemetry rate. If more sensors or a faster IMU sample rate are added later,
move sensor polling to a FreeRTOS task pinned to core 0 and keep networking
on core 1.

## Backend API contract

The companion backend in `../backend` implements the telemetry endpoint used by
this firmware:

```
POST {API_HOST}{API_TELEMETRY_PATH}   (default path: /api/telemetry)
Content-Type: application/json
X-API-Key: <matches API_KEY in config.h>

{
  "device_id": "MARIA-001",
  "uptime_ms": 123456,
  "gps": {
    "fix": true,
    "lat": 47.6062,
    "lon": -122.3321,
    "alt_m": 56.2,
    "speed_kmph": 830.5,
    "course_deg": 271.4,
    "satellites": 9
  },
  "imu": {
    "valid": true,
    "accel": { "x": 0.01, "y": -0.00, "z": 1.00 },
    "gyro": { "x": 0.02, "y": 0.00, "z": -0.01 },
    "temp_c": 28.4
  }
}
```

Note: `accel` is in g (not m/s²) and `gyro` is in deg/s (not rad/s) — that's
what M5Unified reports for the onboard MPU6886.

Expected response: `200 OK` (body ignored by the firmware). Any other status
or a connection failure is logged over serial; the packet is dropped, not
retried (next cycle will send fresh data anyway).

## Known gaps / next steps

- No local buffering if Wi-Fi is down for an extended period — packets are
  simply dropped.
- No OTA update support yet.
- No power management beyond what M5Unified sets up by default — PLUS2 runs
  off its internal battery, so add deep-sleep/low-power handling before
  relying on battery-only operation for long stretches.
- GPS part number (NEO-6M/M8N) is a default chosen for prototyping; swap the
  driver in `gps_reader` if the final hardware uses a different module.
