# MARIA Mission-Control Design System

## Design Goals

MARIA's web radar uses a mission-critical industrial language: dense telemetry,
rigid modules, inset displays, restrained state lighting, and an aerospace
control-room hierarchy. The system is specific to MARIA and preserves the
existing application architecture, radar geometry, routes, and data contracts.

## Tokens

The semantic layer lives in `src/missionControl.css`. Components consume
`--maria-background`, `--maria-panel`, `--maria-panel-raised`,
`--maria-panel-inset`, `--maria-border`, `--maria-text`,
`--maria-text-muted`, `--maria-primary`, `--maria-active`,
`--maria-caution`, `--maria-critical`, and `--maria-focus`. Raw palette values
are centralized at `:root` rather than repeated through components.

## Typography

- Headings: Barlow Condensed with Arial Narrow and sans-serif fallbacks.
- Telemetry: JetBrains Mono with SFMono-Regular, Consolas, and monospace
  fallbacks.
- Body: Inter with system UI fallbacks.

No font files or external font service are bundled.

## State Colors

| State              | Treatment            | Required text             |
| ------------------ | -------------------- | ------------------------- |
| Live / active      | Green                | `LIVE`                    |
| Selected / command | Primary blue         | Descriptive command label |
| Demo               | Amber                | `DEMO`                    |
| Cache / stale      | Amber                | `CACHE`                   |
| Critical / error   | Red                  | Descriptive error label   |
| Offline / unknown  | Muted red or neutral | `OFFLINE` or `UNKNOWN`    |

Color is always paired with text. Simulator tracks are classified before
rendering, so they cannot receive the `LIVE` badge.

## Panel Types

- `MissionPanel`: beveled module frame with semantic section or aside support.
- `MissionPanelHeader`: module identifier, title, and compact metadata.
- `InsetDisplay`: recessed display well for radar or dense data.
- `TelemetryReadout`: label/value pair with optional semantic tone.
- `StatusLamp` and `SourceStateBadge`: non-color operational states.
- `SegmentedMeter`: compact bounded quantity display.
- `ChamferButton`: touch-sized technical command control.
- `TechnicalDivider`: module separator.
- `ModuleIdentifier`: stable system/module naming.
- `SystemStatusStrip`: compact operational readout footer.

## Responsive Layout

- Desktop: 12-column grid with controls at 3 columns, radar at 6, and selected
  target at 3.
- Tablet and 800x480: radar spans the full width; controls and selected target
  form two columns below it.
- Mobile: radar, controls, and selected target stack in that priority order.
  The system strip uses two columns and the navigation can scroll internally.

The radar display has a stable square aspect ratio. Module widths use
`minmax(0, 1fr)` so content cannot force document-level horizontal overflow.

## Accessibility Rules

- Native labels, selects, inputs, checkboxes, and buttons remain intact.
- Targets support Enter and Space and expose their selected state with
  `aria-pressed`.
- Command state changes use a polite live region; empty target states use
  `role="status"`.
- `:focus-visible` uses the high-contrast semantic focus token.
- Controls retain at least 44px touch targets.
- Reduced-motion mode removes sweep animation and shortens transitions.
- State is always communicated by text as well as color.

## Performance Constraints

The interface uses CSS gradients for scan lines, grid texture, and panel glare.
It avoids bitmap textures, continuous blur, large SVG filters, and new runtime
dependencies. Radar geometry and SVG target rendering remain unchanged.

## Web and Embedded Adaptation

The web console can use the full responsive grid and semantic HTML controls.
Embedded terminals should reuse the state vocabulary, module identifiers, and
color roles while adapting density and input size to their display. This phase
does not modify firmware behavior or embedded contracts.

## Implemented Components

All core primitives listed under Panel Types are implemented and used by the
radar console. Source-state derivation, selected-target wording, and empty-state
copy are isolated as pure tested helpers.

## Planned Components

Future work may adapt the mission-control primitives to the map and long-form
dashboard after separate UX review. No unimplemented controls or telemetry are
shown in this phase.
