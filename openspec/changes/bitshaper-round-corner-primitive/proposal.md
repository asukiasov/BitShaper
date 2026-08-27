## Why

The curated catalog (`src/library/catalog.json`) currently ships 13 placeholder entries that were composed by hand rather than derived from the project's actual design reference art (`samples/svgs/`). The catalog should instead be built from real reference shapes, reproduced exactly using the current primitive registry, so `bitshaper list` and the web app's catalog view show marks that are genuinely representative of the intended aesthetic. Reproducing the first reference shapes (`samples/svgs/Shape 1.svg` through `Shape 10.svg`, excluding `Shape 7.svg`) revealed two corner-cut geometries not achievable with any existing primitive:

- `Shape 1.svg`: a quarter-circle arc centered *inward* from the cut corner by its own radius (the "rounded rectangle corner" construction) — `fillet`/`bulge` center their arc *at* the corner instead (a much larger cut/bulge), and `pinwheel-arc` does the same at a smaller radius.
- `Shapes 2–5.svg`: a quarter-*annulus* band (the region between two concentric arcs from the same corner) — no existing primitive produces a band; all existing arc primitives are solid single-arc regions.

`Shape 6.svg`, `8.svg`, `9.svg`, and `10.svg` reproduce exactly with the *existing* primitive set (`wedge`, `fill`, `empty`, `bulge`) — no new primitive needed for those; they're included here purely as verified catalog content. `Shape 7.svg` is a pure straight-line chamfer/arrow pattern that didn't fit any grid hypothesis tried (2×2 or 4×4) — deferred to a follow-up change rather than forcing an uncertain match.

## What Changes

- New primitive `round-corner`: a filled cell with one corner (default top-left) rounded off by a quarter-circle arc of radius `cellSize * 25/32`, centered inset from that corner by the radius along both axes. Appended to the registry as index 10.
- New primitive `arc-band`: a filled cell with one corner (default top-left) occupied by a quarter-annulus band — the region between two concentric arcs of the same corner-center, outer radius `cellSize`, inner radius `cellSize / 2`. Appended to the registry as index 11.
- Replace all 13 existing placeholder entries in `src/library/catalog.json` with 9 real curated marks reproduced from `samples/svgs/` reference art (`Shape 1` through `Shape 10`, excluding `Shape 7`), each verified by rendering and pixel-comparing against its reference SVG (≥99.8% full-image pixel agreement) rather than eyeballed. `Shape 7` and any further reference shapes are reproduced in later changes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `shape-rendering`: the primitive registry's starter set gains two primitives, `round-corner` and `arc-band`, each with its own geometry requirement/scenario alongside the existing ones (`wedge`, `cap`, etc.).

## Impact

- New files `src/core/primitives/round-corner.ts` and `src/core/primitives/arc-band.ts`; `src/core/primitives/index.ts` and `src/core/registry.ts` gain two exports/entries each (registry append, indices 10 and 11).
- New test files `test/core/primitives/round-corner.test.ts` and `test/core/primitives/arc-band.test.ts`; `test/core/registry.test.ts` gains pinned-index tests for indices 10–11 and an updated "contains exactly N primitives" assertion.
- `src/library/catalog.json` content fully replaced (13 placeholder entries removed, 9 real entries added). No change to `src/library/index.ts`'s accessors or their behavior.
- No change to the ID codec, existing primitives' geometry, the CLI, or the web app (`web/`) — the web app consumes `listCatalog()`/the registry as-is and picks up the new content automatically.
