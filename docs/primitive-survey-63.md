# Primitive Survey — `samples/63/` (9 SVG icons)

Surveyed all 9 files in `samples/63/` against the full 14-primitive registry (as of
`bitshaper-leaf-primitive`) using the same pixel pipeline as the main survey: per-cell
brute-force match against every primitive × 4 rotations × 2 inverts on each grid hypothesis
(2×2 … 8×8), then a full-image raster comparison of the assembled `ShapeDef` against the
reference. Two extra candidate primitives — `diamond` (inscribed rotated square) and `pac`
(three-quarter disc / notched circle) — were prototyped and tested alongside the registry.

These SVGs use a 48×48 viewBox with a ~1 px margin and are multi-`<path>` (one path per shape
element), unlike `samples/svgs/`'s single-path 256×256 marks. The reference raster is
bounding-box–cropped and rescaled to 256 before matching so the margin doesn't bias alignment.

**Result: nothing to add.** This is a *morphing-grid* icon family — each icon is one shape
**interpolated** across the grid (ellipse width, diamond aspect ratio, triangle size,
diagonal→square shear, circle→line flattening). BitShaper's model is discrete: each cell is one
primitive at one of 4 rotations, ± mirror, sized to the cell. It has no per-cell scale or aspect
parameter, so a row of "the same ellipse at 20% → 100% width" cannot be encoded at all. No new
primitive changes that.

## Per-icon findings

| # | What it is | Best match | Agreement | Verdict |
|---|---|---|---|---|
| 1 | 6×3 grid of ellipses, width morphing left→right (sliver → circle) | 8×8 `fill`/`bulge`/`round-corner` | ~88% | Parametric morph — not expressible |
| 2 | Diamond (rotated-square) tessellation, aspect morphing flat→tall top→bottom | 8×8 mixed | ~87% | Parametric morph. `diamond` prototype tested — only fits the near-square middle rows, ~78–89% |
| 3 | 8-pointed star (two overlapped squares) on a light ground | 8×8 `fill`/`bulge`/`fillet` | 92.6% | Star edges are at **22.5°**; `wedge` only cuts 45°. Not expressible |
| 4 | Circle-lobe pinwheel with a 4-point-star negative-space hole | **4×4 `bulge`/`fillet`** — `BS-4X4-RTRTPGHORLJTPOPOG` | **99.13%** | Closest of all 9. Still under the 99.6% bar, and the lobe radius is not exactly `cellSize` (real geometry error, not just rescale noise). `pac` prototype **not** needed — the clean decomposition is `bulge`/`fillet` |
| 5 | 4×4 grid morphing from thin diagonal bands (top) to full squares (bottom) | 8×8 mixed | ~94% | Parametric shear morph — not expressible |
| 6 | Row of vertical ellipses, width morphing thin→wide→thin | 8×8 `cap` pairs | ~80% | Parametric morph — not expressible |
| 7 | Triangle grid, size morphing small (top) → large (bottom) | 8×8 `wedge`/`pinwheel-arc` | ~88% | Parametric morph — not expressible |
| 8 | 2×4-ish grid of circles flattening left→right into thin lenses/lines | 4×4 `bulge`/`ogee` | 94.9% | Parametric morph — not expressible |
| 9 | Centre circle + corner quarter-discs + edge half-discs, with negative-space gaps | 4×4 `bulge` | 98.4% | Under bar. The gap structure (empty cells between the discs) isn't captured by the bulge-only fill |

## Candidate primitives evaluated and rejected

- **`pac`** (three-quarter disc / notched circle) — first-glance read of icon 4; the actual clean
  decomposition is `bulge` + `fillet`, so `pac` is unnecessary. Never preferred by the per-cell
  matcher on any icon.
- **`diamond`** (square rotated 45°, vertices at the four edge midpoints) — did not rescue icon 2
  (the diamonds are *morphing*, so a fixed-aspect diamond is only "right" in the middle rows).
  A diamond is also already expressible as four corner `wedge`s, or a 2×2 `wedge` tile.
- **`ellipse` with a width ratio** — would break the "every primitive fixes its own single ratio,
  parameterised only by `cellSize`" design constraint, and would still only capture one column of
  a morph.

## The real gap

This set doesn't reveal a missing *primitive* — it reveals that BitShaper can't do **parametric
interpolation across a grid** (progressive size / aspect / shear). Supporting it would mean a
per-cell scale parameter or a generator-level "morph mode", a much larger design change than a
registry append, and is out of scope for primitive work. Recorded here (and worth a line in the
project roadmap's deferred-explorations section) so the idea isn't lost.

Icons 4 and 9 are the only near-misses that are *structurally* expressible; neither clears the
99.6% verification bar, so neither is catalogued.
