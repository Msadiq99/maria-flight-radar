# MARIA Radar Console RC UI-1

## Objective

RC UI-1 adds a dedicated aviation radar console while retaining the existing long-form tracker dashboard and Leaflet map.

## Architecture

The application uses the existing telemetry and nearby-traffic hooks. `RadarScreen` projects predicted aircraft into an SVG scope using the pure functions in `src/radarGeometry.ts`. `/map` is a focused Leaflet view and `/dashboard` preserves the existing dashboard. The backend API contracts and firmware are unchanged.

## Routes and features

- `/radar` provides the full-screen scope, range selection, labels, pause/resume, target navigation, selection details, and telemetry status bar.
- `/map` provides the existing Leaflet map as a focused operational view.
- `/dashboard` preserves the long-form dashboard, alerts, history, exports, saved locations, localization, themes, and accessibility controls.

Radar controls persist range, labels, trails, auto-selection, and sweep state through the existing persistent-state utility. Target selection survives refreshes when the target remains in range and falls back to the nearest target when enabled.

## Geometry

The geometry module calculates normalized bearing, great-circle distance, range visibility, north-up/east-right projection, and four ring values for 25, 50, 100, and 200 km scopes. It has unit coverage for cardinal directions, zero distance, boundaries, normalization, ring values, and invalid inputs.

## Responsive and accessibility behavior

The console uses a dense three-column layout on wide displays and stacks panels below 900px. Controls use semantic buttons, links, selects, and checkboxes with touch-sized targets. Targets are keyboard focusable, and reduced-motion users receive a static sweep.

## Validation

Root lint, tests, build, and formatting checks pass. Backend lint, tests, and formatting checks pass when local socket access is available to the integration test process. Firmware remains unchanged and is validated separately with PlatformIO.

## Known limitations

The focused map currently uses the default tracker rather than the full dashboard device selector. Browser navigation is link-based and does not yet provide history-state routing. Radar trail rendering is retained in the traffic hook but the SVG trail visualization is planned for the next UI pass.

## Recommended RC UI-2

Prioritize configurable alert zones, altitude filtering, richer aircraft metadata, and historical radar replay. Weather integration and hardware display strategy should follow those operator workflows.
