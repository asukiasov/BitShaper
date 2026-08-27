## Why

This continues the catalog-from-real-reference-art work started by
`bitshaper-round-corner-primitive` (which reproduced `samples/svgs/Shape 1–10`,
excluding `Shape 7`). Reproducing the next batch — `samples/svgs/Shape 11.svg`
through `Shape 30.svg` — by the same measure-then-pixel-verify method found:

- **Nine shapes reproduce exactly (≥99.6% full-image pixel agreement)**:
  - `Shape 11, 12, 17` — 4×4 grids of the existing `fill`/`wedge`/`empty`.
  - `Shape 18, 19` — 4×4 grids of the existing `bulge`/`fill`.
  - `Shape 20, 21` — `round-corner` (2×2 and 4×4) — the primitive added last round,
    whose `cellSize * 25/32` radius is exactly these samples' 100 px arc radius.
  - `Shape 22` — 2×2 `arc-band` — a canvas-centred annulus, again exactly the
    primitive added last round.
  - `Shape 16` — needs one geometry no existing primitive produces (below).
- **`Shape 16.svg`** decomposes into a 2×2 grid where every cell is a full-width
  **parallelogram band** sheared corner-to-corner (vertical thickness `cellSize/2`).
  `wedge` is the triangle from the same corner-to-corner cut; no existing
  primitive is the *band* between two parallel diagonal cuts.
- **Eleven shapes don't fit any clean grid hypothesis** and are deferred (see
  design.md Non-Goals): `Shape 13, 14, 15, 23, 24, 25, 26, 27, 28, 29, 30` —
  mostly off-grid circular compositions (concentric bullseyes, C-rings,
  figure-eights), non-grid chevron/arrow patterns (like `Shape 7`), and nested
  rounded-rectangle mazes.

## What Changes

- New primitive `diagonal-band`: a filled parallelogram band sheared across the
  cell — the straight-line sibling of `arc-band` and the band sibling of
  `wedge`. At rotation 0 / invert false the band enters at the cell's top-left
  corner and exits at its bottom-right corner with a vertical thickness of
  `cellSize / 2`. Appended to the registry as index 12.
- Append nine real curated marks (reproduced from `samples/svgs/Shape 11, 12,
  16, 17, 18, 19, 20, 21, 22`) to `src/library/catalog.json`, each verified by
  rendering and pixel-comparing against its reference SVG (≥99.6% full-image
  agreement), not eyeballed. The existing nine catalog entries are unchanged;
  the catalog grows from 9 to 18.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `shape-rendering`: the primitive registry's starter set gains one primitive,
  `diagonal-band`, with its own geometry requirement/scenario alongside the
  existing twelve.

## Impact

- New file `src/core/primitives/diagonal-band.ts`; `src/core/primitives/index.ts`
  and `src/core/registry.ts` each gain one export/entry (registry append, index 12).
- New test file `test/core/primitives/diagonal-band.test.ts`;
  `test/core/registry.test.ts` gains a pinned-index test for index 12 and an
  updated "contains exactly N primitives" assertion (twelve → thirteen);
  `test/core/render.test.ts`'s "one past the last primitive" sentinel bumps from
  type 12 to type 13.
- `src/library/catalog.json` gains nine entries (9 → 18). No change to
  `src/library/index.ts`'s accessors or their behavior.
- No change to the ID codec, existing primitives' geometry, the CLI, or the web
  app (`web/`) — the web app consumes `listCatalog()`/the registry as-is and
  picks up the new content automatically.
