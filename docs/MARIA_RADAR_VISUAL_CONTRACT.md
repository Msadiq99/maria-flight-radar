# MARIA Radar Visual Contract (Web ↔ Firmware)

Status: MARIA v0.2 — in development.

## What this document is

A **shared design contract** between the MARIA web radar and the MARIA
firmware terminals (ESP32 small displays). It defines the visual
concepts both should express consistently — colors, states, symbols,
priorities, terminology, and Minimal-Embedded limits — so the two
surfaces feel like one product.

> **A shared design contract does not mean shared executable rendering
> code.** The web renderer is React + SVG + CSS. The firmware renderer is
> native TFT graphics primitives. **No web React/SVG/CSS code runs on the
> ESP32.** They share _meaning and appearance targets_, implemented
> separately for each platform.

No firmware code is modified in v0.2. This is a documentation and
alignment artifact.

## Shared concepts

- **Render mode names:** Tactical, Mission Control, Classic Radar, Presentation, Minimal Embedded. Firmware targets the Minimal Embedded language.
- **Source states:** `DEMO`, `CACHE`, `LIVE`, `OFFLINE` — same four states, same wording rules on both platforms. DEMO is never shown as LIVE.
- **Target priority order:** selected > critical > warning > nearby > normal > stale > hidden. Same ordering drives which targets/labels survive density caps.
- **Selected-target shape:** a distinct bracket/corner treatment, not color alone.
- **Alert states:** warning (amber), critical (red — kept red on every platform for safety), stale (dimmed + a non-color cue).
- **Aircraft symbol categories:** generic fixed-wing / heavy / light / helicopter / unknown. A specific symbol is used only when metadata supports it; otherwise generic/unknown.
- **Heading:** the symbol rotates to the aircraft heading; labels stay upright.
- **Range-ring hierarchy:** rings at ¼ / ½ / ¾ / full range, with range labels.
- **Label abbreviations:** callsign first; short forms on small displays.
- **Trail behavior:** newest points kept, older points dropped/faded; disabled when trails are off.
- **Freshness:** live / delayed / stale, surfaced as text, never color-only.
- **Alert-zone terminology:** critical / warning / advisory / normal.
- **Reduced-motion / low-animation:** web honors `prefers-reduced-motion` (static sweep, no drift); firmware uses an equivalent low-animation mode (static or event-driven redraw).

## Minimal Embedded caps (shared numeric contract)

| Cap                     | Value |
| ----------------------- | ----- |
| Max targets             | 12    |
| Max labels              | 6     |
| Max trail points/target | 8     |

These are the same numbers the web Minimal profile enforces (via
`applyRenderProfile`) and the values firmware should target. The selected
target is never dropped by a cap on either platform.

## Web ↔ Firmware mapping

| Concept         | Web                              | Firmware                           | Shared meaning                                 | Implementation difference                    |
| --------------- | -------------------------------- | ---------------------------------- | ---------------------------------------------- | -------------------------------------------- |
| Selected target | SVG bracket + halo               | TFT rectangle / corner ticks       | Current operator-selected aircraft             | Vector path vs. drawn primitives             |
| Critical target | Red fill + dashed marker ring    | Red fill + outline/blink-free ring | Highest-attention aircraft                     | SVG `<circle>` vs. TFT circle primitive      |
| Warning target  | Amber fill                       | Amber fill                         | Elevated-attention aircraft                    | Same intent, platform draw calls             |
| Stale target    | Dimmed fill + reduced opacity    | Dimmed color                       | Reading may be out of date                     | CSS opacity vs. color math                   |
| Range rings     | SVG circles + CSS var color      | TFT circle outlines                | Distance reference                             | Scalable vector vs. fixed-resolution raster  |
| Sweep           | One CSS-variable-driven rotation | Optional low-rate redraw / static  | Decorative scan; never gates target visibility | CSS animation vs. firmware frame budget      |
| Source state    | Badge (DEMO/CACHE/LIVE/OFFLINE)  | Text/LED indicator                 | Truthful data provenance                       | DOM badge vs. panel text/LED                 |
| Labels          | SVG text, upright                | TFT text, abbreviated              | Identify the target                            | Font rendering differs; abbreviations shared |
| Reduced motion  | `prefers-reduced-motion`         | Low-animation mode                 | Accessibility / low-power calm rendering       | Media query vs. firmware setting             |

## Firmware roadmap (documentation only — no code changes here)

- **v0.2.1** — token and terminology alignment (colors, state names, caps documented above adopted by firmware).
- **v0.2.2** — Minimal Embedded renderer refactor on device to match this contract.
- **v0.2.3** — physical-device performance validation (on real hardware).
- **v0.2.4** — visual parity review across web Minimal preview and firmware output.

No physical-device validation is claimed in v0.2. No firmware behavior is
changed in this milestone.
