# MARIA M5Stack Core2 Radar Terminal

## Hardware Overview

The M5Stack Core2 target is a second MARIA compact radar terminal profile. It
uses the Core2 ESP32 module, 320x240 ILI9342C landscape display, FT6336U
capacitive touch, AXP192 power management, built-in speaker, built-in microSD,
and USB-C programming.

The original ESP32-32E 2.8-inch 240x320 resistive-touch target remains
supported separately.

## First Hardware Flash Result

The first Core2 diagnostic upload completed successfully on
`/dev/cu.usbserial-537A0079331`. The board displayed the
`MARIA FIRST-FLASH DIAGNOSTICS` menu after flashing, and no visible reboot loop
or crash was observed.

Serial monitor opened on the same port but did not produce boot logs during the
first capture window. Current firmware emits structured `[MARIA]` startup and
diagnostic logs to improve the next capture.

## Branch And Environments

Branch:

```sh
feature/maria-m5stack-core2-radar-terminal
```

Core2 environments:

```sh
maria-m5stack-core2
maria-m5stack-core2-diag
```

Preserved ESP32-32E environments:

```sh
maria-esp32-2432s028r
maria-esp32-2432s028r-diag
```

## First Build

```sh
cd firmware
pio run -e maria-m5stack-core2
pio run -e maria-m5stack-core2-diag
```

## USB Detection

Core2 should appear as a USB serial device when connected with a data-capable
USB-C cable. Check the serial and USB state before uploading:

```sh
pio device list
ls /dev/cu.*
system_profiler SPUSBDataType
```

Do not upload to `/dev/cu.debug-console` or
`/dev/cu.Bluetooth-Incoming-Port`.

The observed Core2 serial format was:

```text
/dev/cu.usbserial-537A0079331
USB VID:PID=1A86:55D4 SER=537A007933
```

## Upload

Diagnostic firmware:

```sh
cd firmware
pio run -e maria-m5stack-core2-diag -t upload
```

Normal firmware:

```sh
cd firmware
pio run -e maria-m5stack-core2 -t upload
```

With an explicit port:

```sh
cd firmware
pio run -e maria-m5stack-core2-diag -t upload --upload-port /dev/cu.usbserial-XXXX
```

## Serial Monitor

```sh
cd firmware
pio device monitor -e maria-m5stack-core2-diag --baud 115200
```

If the monitor is already open, press the Core2 reset/power control to capture
startup logs from reset. Expected startup lines include:

```text
[MARIA][BOOT] Firmware starting
[MARIA][BOARD] M5Stack Core2
[MARIA][MODE] Diagnostic
[MARIA][DISPLAY] Init PASS
[MARIA][TOUCH] Init PASS
[MARIA][RADAR] Offline demo ready
```

If PlatformIO monitor fails with a TTY error in automation, rerun it from a real
terminal.

## Diagnostic Workflow

The diagnostic environment boots into MARIA diagnostics. It supports:

- board information
- display colors and geometry
- touch coordinates
- brightness/display check
- speaker test
- Wi-Fi scan and connection state
- backend health check
- SD card write/read test
- offline radar demo
- restart into normal mode
- diagnostic summary

Use the touch menu or serial commands:

```text
help info display touch wifi backend sd led speaker demo summary normal reboot retest wifi-clear
```

Unsupported diagnostics, such as RGB LED on Core2, are reported as unsupported
instead of successful.

Recommended manual order:

1. Display
2. Touch
3. Board
4. Wi-Fi
5. Backend
6. SD
7. RGB
8. Speaker
9. Radar
10. Summary
11. Normal

Status meanings:

- `NOT`: not tested
- `RUN`: test in progress
- `PASS`: diagnostic condition completed
- `FAIL`: diagnostic detected an error
- `UNSUP`: unsupported on this board profile
- `SKIP`: intentionally skipped or unavailable dependency
- `TIME`: timed out

Overall readiness remains pending until critical diagnostics have completed.
Physical hardware success still requires observed evidence.

## Normal Firmware Workflow

The normal Core2 environment starts the MARIA compact radar terminal. It uses
the same traffic client and payload contract as the existing radar terminal.

The diagnostic Normal item asks for confirmation before transitioning. To return
to diagnostics, flash `maria-m5stack-core2-diag` again or use the diagnostic boot
gesture supported by the firmware.

Touch controls:

- aircraft selection by tapping the radar/details area
- previous/next target controls
- range cycling
- pause/resume
- trails and labels settings

## Wi-Fi And Backend

Wi-Fi provisioning continues to use the existing WiFiManager flow and stored
settings. Backend URL, API key, polling behavior, brightness, demo mode, sound,
touch, and SD behavior are controlled by existing configuration and build flags.
No secrets are hardcoded in the Core2 profile.

When credentials are missing or the device remains disconnected, the Core2
starts the `MARIA-Radar-Setup` captive portal at `192.168.4.1`. The portal
password is configured with `CONFIG_PORTAL_PASSWORD` in `config.h`.

Normal live-radar mode now requests the compact backend payload:

```text
/api/devices/core2/radar?lat=<gps-lat>&lon=<gps-lon>&rangeKm=<range>&mode=auto
```

The firmware still accepts the legacy nearby traffic shape for compatibility,
but the compact payload is preferred for hybrid OpenSky, local ADS-B, and
simulation source metadata.

## Offline Demo

The Core2 target supports `MARIA_FORCE_DEMO_MODE`. The initial Core2
environments enable it so the terminal and diagnostic firmware can be tested
without Wi-Fi, backend access, API credentials, or SD card.

The diagnostic radar demo is offline-first. It shows deterministic aircraft,
range controls, pause/resume, selection, and a Back button.

## Build Flags

Supported flags:

- `MARIA_DIAGNOSTIC_MODE`
- `MARIA_FORCE_DEMO_MODE`
- `MARIA_DISABLE_TOUCH`
- `MARIA_DISABLE_SD`
- `MARIA_DISABLE_AUDIO`
- `MARIA_VERBOSE_SERIAL`

## Differences From ESP32-32E 2.8-Inch Target

- Core2 uses M5Unified for display, touch, AXP192 power, speaker, and SD access.
- ESP32-32E keeps TFT_eSPI and XPT2046 resistive touch.
- Core2 uses capacitive touch and does not need resistive calibration.
- ESP32-32E calibration remains intact.
- Core2 uses a known board definition: `m5stack-core2`.
- ESP32-32E remains on `esp32dev` with the preserved custom pin profile.

## Troubleshooting

- If no serial port appears, verify the cable is data-capable.
- Try direct USB-C connection before using a hub.
- Use `pio device list` and macOS System Information > USB.
- If upload cannot connect, try holding BOOT while starting upload, then release
  after connection begins.
- If display is blank, check serial output first and confirm the diagnostic
  firmware was uploaded.
- If serial output is silent but the display works, keep the monitor open and
  reset the Core2 once. Confirm the monitor baud is `115200`.
- If SD fails, test without requiring SD; offline radar demo does not depend on
  SD.

Manual verification checklist:

```text
docs/MARIA_CORE2_HARDWARE_VALIDATION_CHECKLIST.md
```

Both M5Stack Core2 and ESP32-32E 2.8-inch targets remain supported.
