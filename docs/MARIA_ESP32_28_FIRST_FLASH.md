# MARIA ESP32 2.8-Inch First Flash

## Confirmed Board Markings

From PCB photos:

```text
2.8 LCD Display ESP32-32E 240x320 Resistance Touch
```

Confirmed physical features from photos:

- ESP32-32E module
- 2.8-inch 240x320 display
- Resistive touch
- USB-C
- microSD slot
- RGB LED
- Speaker connector
- Battery connector
- UART header
- Expansion connector

No powered-device validation has been performed yet.

## Remaining Unverified GPIOs

Every GPIO in the profile remains `UNVERIFIED_UNTIL_POWERED_TEST`, including:

- TFT: `12, 13, 14, 15, 2, -1`
- Backlight: `21`, active HIGH template
- Touch: `39, 32, 25, 33, 36`
- SD: `19, 23, 18, 5`
- RGB LED: `4, 16, 17`
- Speaker: disabled, pin `-1`

## First-Flash Command

```sh
cd firmware
pio run -e maria-esp32-2432s028r-diag -t upload
```

## Serial Monitor Command

```sh
cd firmware
pio device monitor -e maria-esp32-2432s028r-diag
```

Monitor speed is `115200`.

## Diagnostic Menu

The diagnostic image boots directly to the menu. You can also enter diagnostics
from the normal image by holding BOOT during reset.

Serial fallback commands:

```text
help
info
display
touch
wifi
backend
sd
led
speaker
demo
normal
reboot
retest
wifi-clear
```

## Expected Display Behavior

Run `display` from serial. The display test cycles through black, white, red,
green, blue, horizontal gradient, vertical gradient, checkerboard, text,
geometry, corner markers, and an orientation label.

Report black screen, wrong dimensions, inverted colors, mirrored orientation, or
partial-screen rendering.

## Touch Calibration

Run `touch` from serial.

Touch these points in order:

1. top-left
2. top-right
3. bottom-right
4. bottom-left
5. center confirmation

The screen shows raw X/Y, mapped X/Y, touch detected state, rotation, bounds,
and a crosshair. Valid calibration is persisted in NVS.

## Wi-Fi Test

Run `wifi` from serial.

The screen shows connection state, IP, gateway, DNS, MAC, RSSI, and visible
networks. Credentials are never printed.

Use `wifi-clear` only if you intentionally want to clear stored Wi-Fi settings.

## Backend Test

Run `backend` from serial.

The diagnostic uses:

```text
GET {API_HOST}/api/traffic/nearby?lat={lat}&lon={lon}&radius_km=25
```

It reports configured URL, GPS state, HTTP status, request duration, JSON parse
result, traffic count, and last error summary. API keys are not displayed.

## SD Test

Run `sd` from serial.

The test attempts to initialize SD, write `/maria_diag.txt`, read it back, and
delete it. It never erases or formats the card.

## LED And Speaker Safety

Run `led` from serial to step through a slow RGB sequence. LED pins are still
unverified, and the firmware turns the LED off when leaving the LED screen.

Run `speaker` from serial. Speaker output is skipped because the pin remains
unverified. The screen should show `Not tested - pin unverified`.

## Radar Demo

Run `demo` from serial.

The offline demo uses deterministic simulated aircraft, range clipping,
alert-zone colors, selected target highlighting, redraw timing, free heap, and
target count. It requires no backend.

## Common Failure Symptoms

- Blank screen: TFT pin mapping, backlight pin, active level, or controller is
  wrong.
- Wrong colors: TFT color order or controller setup is wrong.
- Rotated or mirrored image: rotation must be adjusted.
- No touch: XPT2046 pins or controller assumption may be wrong.
- Touch offset: run calibration and report raw/mapped values.
- SD failure: SD pins may not match this PCB revision.
- Reset loop: capture serial output and power details.

## User Report Template

- Display powers on: yes/no
- Backlight works: yes/no
- Correct orientation: yes/no
- Colors correct: yes/no
- Touch detected: yes/no
- Touch coordinates correct: yes/no
- SD detected: yes/no
- RGB LED works: yes/no
- Speaker works: yes/no/not tested
- Wi-Fi connects: yes/no
- Backend connects: yes/no
- Radar demo runs: yes/no
- Free heap:
- Any reset loop:
- Serial error:
- Photo/screenshot attached:
