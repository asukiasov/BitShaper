# BitShaper web — two Randomize buttons + Invert (Change F)

**Date:** 2026-09-07
**Status:** accepted

Small follow-up to Change E. Web-only.

## 1. Two Randomize buttons

The Composition panel's single `Randomize` (which already generated from the
selected primitives) becomes a grouped pair at the **top of the panel**,
above columns/rows/seed:

- **🎲 Randomize** — generates from the currently-selected primitive toggles
  (unchanged behaviour, `onRandomize`).
- **🎲 Surprise me** — generates from *every* registered primitive, ignoring
  the toggles; the toggle state is left untouched (`onSurprise`).

Both roll a fresh seed on every click. Pressing Enter in the seed field still
re-runs that seed through the selected-primitives path.

`CompositionPanelOptions` gains `onSurprise: () => void`. `main.ts` factors a
`randomizeFrom(allowed: number[])` helper; `onRandomize` passes
`composition.allowedTypes()`, `onSurprise` passes
`listPrimitives().map(p => p.index)`.

CSS: new `.composition-actions` flex row; `.randomize-button` gets the accent
border so the primary action reads first.

## 2. Invert button

New `.id-action` button **Invert** in the shape-ID row (between `PNG` and
`→ Poster`), disabled until a shape is loaded. Clicking it flips every cell's
`invert` flag on the current shape and shows the result (pushed to history, so
Back undoes it; clicking Invert again is the exact inverse). Grid and any Morph
ramp are preserved.

New pure helper `invertShapeId(shapeId)` in `web/src/generate.ts`: decode →
flip each cell's `invert` → re-encode (carrying `ramp`); returns the input
unchanged if it can't decode.

## Tests

- `web/test/composition-panel.test.ts` — Surprise me rolls a seed, calls
  `onSurprise` (not `onRandomize`), and does not change `allowedTypes()`.
- `web/test/generate.test.ts` — `invertShapeId` flips every flag, is its own
  inverse, and passes through an undecodable id.
- `web/test/main-layout.test.ts` — the ID row lists
  `Copy ID / SVG / PNG / Invert / → Poster`; Invert twice round-trips the
  shape ID.

## Non-goals

Nothing in `src/core`. No change to how generation or the ID codec work.
