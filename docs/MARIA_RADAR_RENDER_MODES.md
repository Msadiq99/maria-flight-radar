# MARIA Radar Render Modes

Status: In development (v0.2 — Radar Rendering Engine).

MARIA's radar renders through one shared pipeline — a single `RadarScene`
built once per data update, a fixed layer stack, a typed render profile,
and a typed theme — with five selectable **render modes** that differ
only in visual styling, density, animation, and performance profile.
They share identical aircraft data, geometry, projection, selection,
trails, alert zones, and source-state handling.

All five modes are implemented and selectable.

## Comparison

| Mode             | Purpose                                                 | Animation             | Target limit | Label limit | Trail limit | Default use                      |
| ---------------- | ------------------------------------------------------- | --------------------- | ------------ | ----------- | ----------- | -------------------------------- |
| Tactical         | Everyday operational radar                              | Moderate sweep        | none         | none        | 30          | **Default** web mode             |
| Mission Control  | Dense desktop command-center                            | Restrained sweep      | none         | none        | 30          | Desktop operations               |
| Classic Radar    | Traditional green phosphor display                      | Brighter/faster sweep | none         | none        | 20          | Nostalgic / focused monitoring   |
| Presentation     | Cinematic 2.5D for demos, exhibitions, captures         | Cinematic, wide sweep | none         | none        | 40          | Screenshots / presentations      |
| Minimal Embedded | High-contrast preview of the ESP32 small-display design | Static / no sweep     | 12           | 6           | 8           | Embedded-terminal design preview |

"none" means no render-time cap — the mode shows every in-range,
altitude-filtered target/label. Density caps for Minimal are enforced by
the shared `applyRenderProfile(scene, profile)` step before any layer
renders; the selected target is never dropped by a cap.

## Mode details

### Tactical (default)

Dark navy scope with cyan/teal geometry and green targets, restrained
alert coloring, a selected-target bracket, short trails, and a moderate
sweep. The default `/radar` view.

### Mission Control

The dense desktop command-center layout (left controls, center radar,
right selected-aircraft panel, bottom status strip). Reuses the existing
MARIA mission-control design tokens (`--maria-*`); the radar geometry
theme maps back to those tokens so the shipped look is preserved. Shows
only real operational values — source state, target/visible counts,
freshness, backend status, alert count — and **invents no receiver
metrics** (no SDR signal, GPS lock, temperature, satellites, battery,
packet loss, or antenna state).

### Classic Radar

Monochrome green phosphor: near-black green scope, green rings and
echoes, a brighter/faster rotating sweep, and a restrained drop-shadow
glow (no full-screen blur). Critical targets stay red for safety
clarity. The sweep only changes brightness — every target stays rendered
and selectable regardless of the beam's angle.

### Presentation

A cinematic 2.5D mode for demos and captures — not the operational
default. The 2.5D effect is a **CSS perspective tilt on a wrapper** around
the same `RadarViewport`/`RadarScene`; SVG target coordinates are
unchanged, so positions still derive from the shared projection. No
WebGL/Three.js, no second scene model, no invented 3D positions. Navy/
black backdrop, cyan–blue grid, brighter trails, wider soft sweep,
selected-target halo, edge vignette. Remains fully interactive.

### Minimal Embedded

A lightweight, high-contrast web preview of the visual language planned
for small ESP32 displays, framed at a 320×240-equivalent (4:3) aspect.
Flat black background, crisp rings, simplified symbols, short labels, no
glow/blur/shadow, static (no sweep). Caps: 12 targets / 6 labels / 8
trail points, applied by the shared profile step. Web and firmware share
this **design contract**, not executable rendering code — no firmware is
changed here.

## Truthfulness (all modes)

Source state (`DEMO` / `CACHE` / `LIVE` / `OFFLINE`) and its wording come
from one shared derivation and the single scene builder, so they are
identical across modes. DEMO data is never presented as LIVE in any mode.

## Screenshots

Deterministic DEMO screenshots are planned under
`docs/assets/screenshots/v0.2/`. They are **not yet captured** — the
current environment has no headless browser, and images are never
fabricated. The manual capture procedure (query params, DEMO checks) is
documented in `docs/assets/screenshots/v0.2/README.md`.
