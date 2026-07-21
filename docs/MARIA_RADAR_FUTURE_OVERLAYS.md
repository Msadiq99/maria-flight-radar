# MARIA Radar — Future Overlays

Status: MARIA v0.2 — in development. **All overlays below are planned and
inactive.** None are implemented, none render, none are exposed in the
production UI, and no overlay data is fetched or fabricated.

## Extension model

Overlays are typed plugins (`RadarOverlayPlugin`,
`src/lib/radar-engine/overlays/`). A plugin declares:

- `id`, `label`, `description`
- `slot` — where it inserts in the layer stack
- `zIndex` — order within a slot
- `implemented`, `enabledByDefault` — both `false` for every planned overlay
- `supportedModes` — modes it may appear in
- `requiredCapabilities` — data capabilities that must be available
- `legendItems`, `settingsSchema`, `dataFreshnessPolicy`
- `renderLayer?` — present only once implemented (absent for planned overlays)

An overlay renders only when it is **implemented AND enabled AND supports
the active mode AND all required capabilities are available AND it has a
renderer** (`isOverlayActive`). With the shipped defaults — no
capabilities available, no flags on, nothing implemented — this is always
false, so every slot is empty. This is enforced by tests.

Overlays receive the **derived render scene** (post `applyRenderProfile`)
as read-only data. They cannot fetch data or mutate the scene.

## Overlay slots (stable z-order)

| Slot             | Position                                        |
| ---------------- | ----------------------------------------------- |
| `below-rings`    | above background/grid, beneath range rings      |
| `below-targets`  | above rings/sweep/alert zones, beneath aircraft |
| `above-targets`  | above aircraft, beneath labels/selection        |
| `system-overlay` | topmost (status / cinematic overlays)           |

## Planned overlays

| Overlay             | Slot           | Required capability    | Status  |
| ------------------- | -------------- | ---------------------- | ------- |
| Weather             | below-rings    | `weather-data`         | Planned |
| Airports            | below-targets  | `airport-database`     | Planned |
| Receiver coverage   | below-rings    | `receiver-coverage`    | Planned |
| Heat map            | below-targets  | `historical-snapshots` | Planned |
| Historical playback | system-overlay | `historical-snapshots` | Planned |
| Airspace boundaries | below-targets  | `airspace-boundaries`  | Planned |
| Route projection    | above-targets  | `route-intelligence`   | Planned |
| Aircraft photos     | system-overlay | `aircraft-media`       | Planned |

## Capabilities

`weather-data`, `airport-database`, `receiver-coverage`,
`historical-snapshots`, `airspace-boundaries`, `route-intelligence`,
`aircraft-media`. **None are available** in the current build
(`DEFAULT_AVAILABLE_CAPABILITIES` is empty), so no overlay's requirements
can be met.

## Rules for implementing an overlay later

1. Provide a real capability source (no fabricated data).
2. Add a `renderLayer` that reads only the read-only scene.
3. Set `implemented: true`; keep `enabledByDefault: false` until vetted.
4. Gate exposure behind a feature flag; never present DEMO overlay data as live.
5. Add legend items and a settings schema; keep truthful source-state wording.
