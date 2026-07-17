# MARIA Core2 Wi-Fi Setup Portal

Core2 firmware starts a non-blocking Wi-FiManager captive portal when Wi-Fi
credentials are missing or the device remains disconnected.

- AP SSID: `MARIA-Radar-Setup`
- Default portal address: `192.168.4.1`
- Password comes from `CONFIG_PORTAL_PASSWORD` in `firmware/include/config.h`
- Device hostname comes from `DEVICE_ID`

Use a strong unique portal password before field use. The example config keeps
placeholder values only.
