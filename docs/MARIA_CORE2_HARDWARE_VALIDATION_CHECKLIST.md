# MARIA Core2 Hardware Validation Checklist

Use this checklist after flashing `maria-m5stack-core2-diag`. Do not mark a row
passed from compilation alone; each pass requires physical observation or serial
evidence.

| Test                    | Expected behavior                                                         | Observed behavior                                 | Status     | Evidence required                                  | Notes                                        |
| ----------------------- | ------------------------------------------------------------------------- | ------------------------------------------------- | ---------- | -------------------------------------------------- | -------------------------------------------- |
| USB serial detection    | Core2 appears as `/dev/cu.usbserial-*` or equivalent, not debug/Bluetooth | USB serial device detected                        | Pass       | `pio device list` output                           | First flash used a CH340-compatible adapter  |
| Diagnostic upload       | `maria-m5stack-core2-diag` uploads and verifies                           | Upload succeeded                                  | Pass       | PlatformIO upload success log                      | Chip reported ESP32-D0WDQ6-V3 rev v3.0       |
| Normal live upload      | `maria-m5stack-core2` uploads and verifies                                | Upload succeeded                                  | PASS       | PlatformIO upload success log                      | Chip ESP32-D0WDQ6-V3 rev v3.0; hash verified |
| Diagnostic boot display | MARIA first-flash menu appears                                            | Menu visible                                      | Pass       | User visual confirmation                           | Display boot is confirmed                    |
| Startup serial logs     | `[MARIA][BOOT]` and board/mode lines appear at 115200                     | Pending after logging improvement                 | Not tested | Serial monitor capture                             | Reset while monitor is open                  |
| Normal live serial logs | Normal firmware reports boot, Wi-Fi, backend, and aircraft state          | No serial output captured after monitor opened    | PENDING    | Serial monitor capture after physical reset        | Do not mark runtime PASS without logs        |
| Display diagnostic      | Color, grayscale, text, and geometry sequence completes                   | Pending                                           | Not tested | User visual confirmation                           | Mark PASS after sequence completes           |
| Touch diagnostic        | Coordinates update, marker appears, valid touch counted                   | Pending                                           | Not tested | User visual confirmation and serial coordinate log | PASS only after valid touch                  |
| Board info              | Core2 identity, chip, flash, heap, build, display info shown              | Pending                                           | Not tested | Screen photo or serial log                         | No secrets displayed                         |
| Wi-Fi scan              | Nearby SSIDs/RSSI list appears or scan times out cleanly                  | Pending                                           | Not tested | Screen or serial result                            | Scan PASS is separate from connection PASS   |
| Wi-Fi connection        | Connected state and IP appear only after connection                       | Pending                                           | Not tested | Screen or serial result                            | Offline is allowed                           |
| Backend health          | Health endpoint returns HTTP result and latency                           | Pending                                           | Not tested | Screen or serial result                            | No credentials displayed                     |
| SD card                 | Card init, type/size, temp write/read/delete                              | Pending                                           | Not tested | Screen or serial result                            | Missing card is SKIP, not crash              |
| RGB diagnostic          | Core2 marks RGB unsupported                                               | Pending                                           | Not tested | Screen or serial result                            | ESP32-32E RGB path preserved                 |
| Speaker diagnostic      | User taps Play, hears short tone, confirms Heard                          | Pending                                           | Not tested | User audio confirmation                            | No continuous tone                           |
| Offline radar demo      | Circular radar, sweep, demo targets, selection, controls                  | Pending                                           | Not tested | User visual/touch confirmation                     | No Wi-Fi/backend required                    |
| Normal mode transition  | Confirmation appears; confirm restarts into normal mode                   | Pending                                           | Not tested | User confirmation and boot behavior                | Diagnostics can be restored by flashing diag |
| Reboot stability        | No continuous reboot, panic, Guru Meditation, or brownout                 | No visible reboot loop observed after first flash | Partial    | 60+ second observation and serial capture          | Serial confirmation still pending            |

Overall readiness: Pending until display, touch, Wi-Fi scan/connection where
available, backend where available, SD, speaker, radar demo, and normal-mode
transition have evidence.
