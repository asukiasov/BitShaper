## Why

`bitshaper-ramp-modifier` (merged) added an optional `ShapeDef.ramp` and the `~` shape-ID
suffix. The hosted web app already *renders* ramped IDs correctly — everything routes through
`decodeShapeId`/`renderShape`, which understand the `~` block (verified on the live site). What
it can't do is let a user **author or edit** a ramp without hand-writing the `~` suffix. This
adds a "Morph" panel to the preview section.

Full design: `docs/superpowers/specs/2026-08-27-bitshaper-web-ramp-panel-design.md`.

## What Changes

- New `web/src/ramp-panel.ts`: `buildRampPanel(container, { onChange })` → a collapsible
  `<details>` panel with a direction select (axis), a curve select, and 0–4 param tracks
  (`scale` / `scaleX` / `scaleY` / `angle`), each with `from`/`to` range sliders snapped to the
  codec's quantization grid. Emits a `Ramp | undefined` on every edit.
- `web/src/main.ts`: build the panel once in the preview section; keep the current decoded
  `ShapeDef` in a closure; on `showShape` call `rampPanel.setFromShape(shape)`; on panel
  `onChange` re-encode the current shape with the new ramp and `showShape` the result
  (`replaceState`, no history entry). Generate/Randomize re-applies the current panel ramp so a
  morph the user is dialing in survives a re-roll.
- New `web/test/ramp-panel.test.ts` (jsdom + vitest, matching `generator-form.test.ts`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-app`: gains ramp-modifier authoring/editing in the preview view (the capability's spec
  delta lives with the not-yet-archived `bitshaper-web-app` change; this change adds a
  requirement scenario for the Morph panel).

## Impact

- New files: `web/src/ramp-panel.ts`, `web/test/ramp-panel.test.ts`.
- Modified: `web/src/main.ts` (build + wire the panel, store the decoded shape), `web/src/style.css`
  (panel styling). Possibly a small extension to an existing `web/test` main-flow test to cover
  "morph survives Randomize".
- No change to the root `bitshaper` package (`src/`, published API, CLI), the catalog, or any
  other web module. `showShape` keeps its signature.
- `pages.yml` already deploys on `web/**` changes.
