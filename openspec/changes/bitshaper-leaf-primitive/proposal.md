## Why

This continues the catalog-from-real-reference-art work of
`bitshaper-round-corner-primitive` (Shapes 1–10) and
`bitshaper-diagonal-band-primitive` (Shapes 11–30). Reproducing the final
batch — `samples/svgs/Shape 31.svg` through `Shape 72.svg` — by the same
measure-then-pixel-verify method (per-cell brute-force match against every
registered primitive × 4 rotations × 2 inverts, then full-image raster
comparison against the reference at ≥99.6% agreement) found:

- **Seventeen shapes reproduce exactly (≥99.6% full-image pixel agreement)**
  using the existing registry plus one new primitive:
  - `Shape 32, 45, 60` — 8×8/4×4/2×2 grids of `fill`/`empty`/`wedge` (100%).
  - `Shape 31` — 4×4 `fill`/`fillet` (99.93%). The primitive survey guessed
    this was a bespoke "maze/interlock" mark; pixel verification shows it is a
    clean grid.
  - `Shape 34, 49, 70` — 4×4/2×2 grids of `bulge`/`fill`.
  - `Shape 33, 38, 40, 43, 55, 65, 71` — grids of `round-corner`/`bulge`/`fill`,
    the primitives added in the two prior rounds.
  - `Shape 51` — 2×2 `circle`. `Shape 67` — 8×8 `fill`/`empty`/`pinwheel-arc`.
  - `Shape 53` — 2×2 of the new `leaf` primitive (99.72%).
- **`Shape 53`** decomposes into a 2×2 grid where every cell is a pointed lens
  (vesica) spanning the cell diagonally — the region shared by two
  quarter-disks of radius `cellSize` centered on opposite cell corners.
  Drawing `bulge` twice fills the *union* of those disks (a blob); no existing
  primitive traces the single closed outline of their *intersection*.
- **Twenty-five shapes don't fit any clean grid hypothesis** and are deferred
  (see design.md Non-Goals): mostly canvas-centered compositions (a small dot
  or ring sitting on a grid vertex, not in a cell), off-grid circle rosettes
  and spinner/compass marks, non-grid chevron/arrow stars, and continuous
  rounded-rectangle meanders.

## What Changes

- New primitive `leaf`: a pointed lens (vesica) spanning the cell along its
  anti-diagonal — bounded by two arcs of radius `cellSize` (the same
  corner-to-corner arc `fillet`/`bulge`/`arc-band` already use), one bowing
  toward the top-left corner and one toward the bottom-right, meeting at sharp
  points on the top-right and bottom-left corners. Appended to the registry as
  index 13.
- Append seventeen real curated marks (reproduced from `samples/svgs/Shape 31,
  32, 33, 34, 38, 40, 43, 45, 49, 51, 53, 55, 60, 65, 67, 70, 71`) to
  `src/library/catalog.json`, each verified by rendering and pixel-comparing
  against its reference SVG (≥99.6% full-image agreement), not eyeballed. The
  existing eighteen catalog entries are unchanged; the catalog grows from 18
  to 35.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `shape-rendering`: the primitive registry's starter set gains one primitive,
  `leaf`, with its own geometry requirement/scenario alongside the existing
  thirteen.

## Impact

- New file `src/core/primitives/leaf.ts`; `src/core/primitives/index.ts` and
  `src/core/registry.ts` each gain one export/entry (registry append, index 13).
- New test file `test/core/primitives/leaf.test.ts`;
  `test/core/registry.test.ts` gains a pinned-index test for index 13 and an
  updated "contains exactly N primitives" assertion (thirteen → fourteen);
  `test/core/render.test.ts`'s "one past the last primitive" sentinel bumps
  from type 13 to type 14.
- `src/library/catalog.json` gains seventeen entries (18 → 35). No change to
  `src/library/index.ts`'s accessors or their behavior.
- No change to the ID codec, existing primitives' geometry, the CLI, or the
  web app (`web/`) — the web app consumes `listPrimitives()`/`listCatalog()`
  as-is and picks up the new primitive and marks automatically.
