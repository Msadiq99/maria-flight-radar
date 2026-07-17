# MARIA OpenSky OAuth2 Setup

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

Before production use, verify OpenSky's current usage limits and terms directly
with OpenSky.
