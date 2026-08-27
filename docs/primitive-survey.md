# Primitive Survey — 72 Reference SVGs

Surveyed all 72 files in `samples/svgs/` against the four primitives already implemented
(`empty`, `fill`, `fillet`, `bulge`, indices 0–3). Each sample's single `<path>` was read as
raw coordinate/curve data and reasoned about geometrically: what grid resolution and
per-cell motif would reproduce it, and whether that motif is something `fillet`/`bulge`
(both fixed at `radius = cellSize`, anchored on a corner) already cover.

Four distinct new motifs recurred often enough across independent samples to be strong
primitive candidates — conveniently exactly filling the four registry slots left before the
8-type ceiling. Two more patterns recur but are borderline (either likely decorative
convention rather than a tileable primitive, or reducible to existing primitives at a finer
grid). 8 of the 72 samples are bespoke marks (custom logos/wordmark-style icons) that don't
decompose cleanly into any repeating single-cell motif and are called out separately so
nothing is silently dropped.

A recurring negative finding worth noting: several samples that *look* elaborate (checkerboards,
stepped/notched squares, fan-of-circles patterns) turned out to be fully reproducible with the
existing four primitives, just tiled at a finer grid (64 or 32-unit cells instead of 128) — no
new primitive needed for those.

## Candidate primitives, ranked by reuse

| Rank | Name | Description | Samples | Representative files |
|---|---|---|---|---|
| 1 | `circle` | A filled circle centered in the cell, tangent to all four sides (diameter ≈ cellSize) — a "dot"/"hole" motif distinct from `fill`'s square and from `fillet`/`bulge`'s corner-anchored quarter-arcs. | 16 | Shape 22, Shape 35, Shape 44, Shape 51, Shape 64 |
| 2 | `wedge` | A straight (non-curved) diagonal cut from one corner to the opposite corner, producing a right-triangle half of the cell — the straight-line sibling of `fillet`/`bulge`'s quarter-circle. | 13 | Shape 60, Shape 61, Shape 62, Shape 16, Shape 17 |
| 3 | `pinwheel-arc` (aka offset-fillet) | A concave/convex quarter-arc like `fillet`/`bulge` but with radius smaller than `cellSize` (empirically ≈0.78× cell, e.g. 100 of 128) and anchored at a fixed offset along each edge rather than corner-to-corner, leaving short straight residual edges before/after the arc. | 12 | Shape 1, Shape 20, Shape 40, Shape 43, Shape 26 |
| 4 | `cap` (stadium end) | A single semicircular arc spanning one full cell edge (radius = half the edge length, centered on the edge midpoint), rounding both of that edge's corners with one smooth curve — not reproducible by two independent `bulge` calls, which would each use the full `cellSize` radius and overlap/cusp instead of blending. | 6 | Shape 49, Shape 57, Shape 19, Shape 30, Shape 55 |

### Lower-confidence / not recommended for the next 4 slots

- **small-dot** — a much smaller circle (~¼ cell diameter) centered in a cell, seen in Shape 23, 24, 66, 67, 72. Likely just the `circle` candidate rendered at a finer grid subdivision rather than a geometrically distinct primitive — folding it into `circle` rather than treating it as separate.
- **rounded-icon-frame corner** — a small fixed-radius (~16–20px out of 256) rounding on the *outer* boundary of several whole icons (Shape 26, 50, 57, 59, 68, 69). This reads as a canvas/frame styling convention for the overall mark, not a per-cell tileable motif, so it's excluded from primitive candidacy — flagged here so it isn't mistaken for a missed motif.

## Fits within the 8-type ceiling

Only 4 slots remain (registry is at `empty=0, fill=1, fillet=2, bulge=3`; next would be
indices 4–7, the last usable before a format revision is required). Recommendation, in
priority order:

1. **`circle`** (16 samples) — most-reused motif found, and geometrically the simplest to
   implement (a closed 4-arc circle path, same `PrimitivePathBuilder` contract, no invert
   asymmetry since it's centrally symmetric — though rotation/invert are presumably still
   accepted as no-ops for API consistency).
2. **`wedge`** (13 samples) — second most-reused, and the natural straight-line counterpart
   to `fillet`/`bulge`, reusing the same "quarter-circle vs. straight diagonal" pairing logic
   the existing two primitives already establish.
3. **`cap`** (6 samples) — fewer hits than `pinwheel-arc` but a clean, unambiguous geometric
   contract (single arc, fixed radius = cellSize / 2, no magic ratio to pin down) — recommended
   over `pinwheel-arc` for the last slot on that basis.
4. **`pinwheel-arc`** (12 samples) — the most-reused of the four after `circle`/`wedge`, but its
   radius ratio (~0.78×) is an empirical fit rather than a clean fraction, and several of its
   occurrences (Shape 1, 20, 40, 43) look like one shared logo template reused near-verbatim
   rather than 12 independent shapes converging on the same primitive by coincidence. Worth a
   second look at the raw ratio before committing it to the registry — if it's confirmed useful,
   swap its priority with `cap` above.

Whichever of `cap` / `pinwheel-arc` doesn't make the cut is the natural first candidate for a
9th slot after a future ID-format revision.

## Samples not yet explained

These 8 files are bespoke single-purpose marks (compass/spinner icons, wordmark-style glyphs,
ornate rounded-cross emblems) whose geometry didn't reduce to any repeating single-cell motif
found above — noted here rather than silently dropped:

- Shape 15 — custom "mountain/flag" mark, irregular non-grid-aligned points.
- Shape 31 — maze/interlock custom mark.
- Shape 41 — ornate concave-cross emblem (Reuleaux-like), built from many overlapping arcs at non-cell-aligned radii.
- Shape 47 — similar concave-cross/flower emblem to Shape 41.
- Shape 48 — similar concave-cross/flower emblem, combined with a `pinwheel-arc`-like center.
- Shape 50 — custom pinwheel/compass logo with irregular offsets.
- Shape 64 — circle mark plus a small bespoke "plus cursor" cutout at center.
- Shape 68 — large single rounded-rectangle frame shape, not cell-tileable at any obvious grid.

Several other samples (Shape 6, 7, 52, 54) contain `wedge`-family diagonal cuts but their overall
composition is a bespoke arrow/star mark rather than a clean tiling — counted as partial evidence
for `wedge` above, not full unexplained one-offs.

## Addendum (2026-08-27): corrections from pixel verification

This survey reasoned about raw path coordinates without rasterisation. Pixel-verifying
Shapes 31–72 (change `bitshaper-leaf-primitive`) overturned two of its calls and confirmed
the rest:

- **Shape 31 is NOT bespoke** — it is a clean 4×4 grid of `fill`/`fillet` (99.93% agreement).
- **Shape 53** needed one genuinely new primitive, `leaf` (a pointed lens / vesica between
  two cell-size corner arcs), not anticipated here.
- Shapes 41, 47, 48, 50, 64, 68 confirmed bespoke/off-grid as flagged. Shapes 52, 54 confirmed
  as non-grid star marks.
- The "small-dot" motif (Shapes 36, 44, 46, 59, 64) is a canvas-centred circle sitting on a
  grid *vertex*, not in any cell — a `corner-dot` primitive was prototyped and rejected
  (no per-cell match ever preferred it). These shapes are deferred.
