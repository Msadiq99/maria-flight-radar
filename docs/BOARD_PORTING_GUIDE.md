# Board Porting Guide

Do not add a board until its owner can validate it. Collect manufacturer, exact
model, ESP32 variant, flash size, PSRAM, display resolution/controller, touch
controller, pin map, backlight, SD, speaker, power-management chip, rotation,
USB-UART chip, PlatformIO board ID, official datasheet, photographs, and a
tester with the physical board.

Shared boundaries are aircraft model, API client, source state, radar geometry,
selection, formatting, and demo/cache behavior. Board-specific boundaries are
display driver, touch driver, pin map, storage, backlight, power management,
physical controls, and resolution-specific layout.

Use environment names `maria-<board-name>` and
`maria-<board-name>-diag`. Add native tests where logic is shared, document the
pin map, compile in CI, and provide display/touch/Wi-Fi/backend evidence before
marking a board supported.
