# Firmware Support Matrix

Build status is not physical validation. “Unverified” means hardware evidence
has not established complete display, touch, network, and runtime behavior.

| Board / target             | PlatformIO environment       | Status                | Display         | Touch           | Demo mode   | Backend live data | Diagnostic build             | Physical validation                    |
| -------------------------- | ---------------------------- | --------------------- | --------------- | --------------- | ----------- | ----------------- | ---------------------------- | -------------------------------------- |
| M5StickC PLUS2             | `m5stick-c-plus2`            | Experimental          | Board-specific  | Board-specific  | Implemented | Software ready    | No dedicated environment     | Unverified                             |
| M5Stack Core2              | `maria-m5stack-core2`        | Experimental          | ILI9342C        | FT6336U         | Implemented | Software ready    | `maria-m5stack-core2-diag`   | Upload verified; display/touch pending |
| M5Stack Core2 diagnostic   | `maria-m5stack-core2-diag`   | Experimental          | ILI9342C        | FT6336U         | Forced demo | Diagnostic API    | Yes                          | Unverified                             |
| ESP32-2432S028R            | `maria-esp32-2432s028r`      | Experimental          | ILI9341 profile | XPT2046 profile | Implemented | Software ready    | `maria-esp32-2432s028r-diag` | Unverified                             |
| ESP32-2432S028R diagnostic | `maria-esp32-2432s028r-diag` | Experimental          | ILI9341 profile | XPT2046 profile | Forced demo | Diagnostic API    | Yes                          | Unverified                             |
| Native firmware tests      | `native`                     | Supported test target | N/A             | N/A             | Tested      | N/A               | N/A                          | N/A                                    |

See [the board porting guide](BOARD_PORTING_GUIDE.md) before proposing a new
target.
