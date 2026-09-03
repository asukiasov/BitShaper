# BitShaper — `samples/63/4.svg` as a curated mark

**Date:** 2026-09-03
**Status:** done (OpenSpec skipped by owner request)

## Result

`4.svg` is catalogued as **`Pinwheel Aperture`** — `BS-4X4-SUSUQGIOSMKUQOQOS`
(12 `bulge` + 4 `fillet`, layout below). Round-trips through the codec;
silhouette agreement against the reference ~99.72% (verified with a throwaway
`@resvg/resvg-js` + `pixelmatch` mask compare, tight-viewBox reference).
`npm test` 378/378, `lint` clean, `build` green; `web/` rebuilt and its 60
tests pass — the mark now appears in "Curated marks". `7.svg` dropped;
follow-up note added to `docs/primitive-survey-63.md`.

## Why

The owner wants the `samples/63/4.svg` mark available in the web app's
"Curated marks" section (rendered from `src/library/catalog.json` via
`listCatalog()`). A sibling request to add `samples/63/7.svg` is **dropped**:
`7.svg` is a parametric size-morph (one triangle scaled progressively down the
grid), which BitShaper's discrete cell model cannot represent. See
`docs/primitive-survey-63.md`. A roadmap note points at the `ramp` modifier as
a possible future revisit.

## What

Add exactly one entry to `src/library/catalog.json` for `4.svg`. **No new
primitive, no registry change, no ID-codec change, no web code change.**

## Decomposition

`4.svg` is a `BS-4X4` shape (cell = 64 after the reference SVG is
bounding-box cropped and rescaled to 256, matching the survey pipeline).

- Four **three-quarter-disc lobes**, each centered on an interior grid vertex,
  radius exactly `cellSize`. Each lobe = 3 `bulge` quarter-disc cells (the
  filled quarters); the fourth quarter (facing grid center) is the "mouth".
- A central **4-point star** = 4 `fillet` cells (cell minus a corner
  quarter-disc of radius `cellSize`) in the four center cells. Verified: the
  sample's star arc (path 6) is centered on the lobe center at radius
  `cellSize` — the same arc `fillet` draws.

Grid layout (primitive / rotation in degrees), row-major:

```
b180  b270   b180  b270
b90   f0     f90   b0
b180  f270   f180  b270
b90   b0     b90   b0
```

(`b` = `bulge`, `f` = `fillet`; `invert` false throughout.)

The survey's earlier "4×4 bulge/fillet, 99.13%, radius error" note came from
testing at the wrong grid scale (lobe radius ≠ `cellSize` at 2×2). At 4×4 the
radius *is* `cellSize`, so the decomposition is geometrically exact.

## Plan

1. **Rasterizer (throwaway).** A scratch script: `renderShape(id)` → raster;
   load `samples/63/4.svg`, bounding-box crop, rescale to 256, raster;
   pixel-compare. Not committed (matches how `docs/primitive-survey-63.md` was
   produced).
2. **Build the ID.** Construct the `ShapeDef` above, `encodeShapeId`, record
   the ID, assert `encodeShapeId(decodeShapeId(id)) === id`.
3. **Verify.** Render the ID whole, compare against the cropped/rescaled
   reference. Require **≥ 99.6%** full-image agreement (the catalog bar). Minor
   rotation/arrangement tuning permitted.
4. **Catalog entry.** On pass, append to `src/library/catalog.json`:
   `{ "id": "<id>", "name": "Pinwheel Aperture", "tags": ["geometric", "rotational", "from-sample"] }`.
5. **Fallback.** If it cannot clear 99.6% after tuning: stop and report. Two
   options then — a `pac` primitive (its own change) or defer `4.svg` like the
   other sub-99.6% near-misses. Do not lower the bar silently.
6. **Verify repo.** `npm test`, `npm run lint`, `npm run build` all green.
   Rebuild `web/` against root `dist/`; confirm the new mark renders in
   "Curated marks".
7. **Roadmap note.** Add a deferred-exploration line for `7.svg` /
   parametric-morph in `openspec/roadmap.md` (or the roadmap design doc).

## Out of scope

ID codec, existing primitives, a new primitive, the CLI, `web/` behavior,
`7.svg`, and any change to the 99.6% verification bar.
