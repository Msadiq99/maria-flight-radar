# MARIA OpenSky OAuth2 Setup

OpenSky is optional, disabled by default, and not required for MARIA Phase 1 or
Phase 2. MARIA must build, test, run, and support Core2/web radar operation
without an OpenSky account, OAuth token, internet connection, or cloud
aircraft-data provider.

OpenSky credentials stay on the backend. Do not put OpenSky credentials in the
web app, firmware, screenshots, or documentation evidence.

1. Copy `backend/.env.example` to a local `.env` file or configure the same
   variables in your process manager.
2. Set `OPENSKY_ENABLED=true`.
3. Set `OPENSKY_CLIENT_ID` and `OPENSKY_CLIENT_SECRET`.
4. Start the backend.
5. Check `GET /api/radar/sources` for OpenSky health.

MARIA uses OAuth2 client credentials. It does not use browser-side OpenSky
calls and does not use legacy username/password Basic authentication.

OpenSky is not guaranteed free for every use case. Its use is subject to
OpenSky's current terms, rate limits, approval process, and licensing
requirements. Verify those directly with OpenSky before enabling it.
