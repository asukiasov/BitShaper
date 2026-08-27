# Primitive Survey — `samples/screens2/` (20 raster samples)

Surveyed all 20 PNGs in `samples/screens2/` against the registry's implemented primitives
(`empty`, `fill`, `fillet`, `bulge`, indices 0–3) **and** the four candidates already proposed
in `docs/primitive-survey.md` (`circle`, `wedge`, `cap`, `pinwheel-arc`) — since those candidates
fill the registry's last 4 open slots before the 8-type ceiling, any genuinely new motif found
here has nowhere to go without a format revision, so reuse was checked especially hard before
naming anything new.

These are raster PNGs, not SVGs with path data, so grid/motif inference is visual — repeat-unit
counting by eye, cross-checked against the pixel silhouette of each candidate's known geometry
(straight corner-to-corner cut for `wedge`, quarter-circle for `fillet`/`bulge`, etc.).

**Result:** 10 of the 20 samples reduce cleanly to `wedge` alone (by far the most reinforced
candidate in this batch — strong independent confirmation of `docs/primitive-survey.md`'s #2
ranking). `fillet`, `bulge`, and `pinwheel-arc` each pick up further supporting samples. One
genuinely new motif recurs across 3 independent samples (a "stepped"/dogleg diagonal cut that
plain `wedge` tiling cannot produce, since two `wedge` cells sharing an edge on a strict grid
always meet in an unbroken straight line — never a jog). One single-occurrence curved motif
(an S-curve/ogee band) is flagged as low-confidence. 2 samples are bespoke one-offs.

## Per-image grid inference and decomposition

| # | File | Inferred grid | Decomposition |
|---|---|---|---|
| 1 | shape-sample-1 | ~2 cols × 4 rows, diagonal stripes at 45° | **New: `step` candidate** — diagonal band with a horizontal jog partway; see below |
| 2 | shape-sample-2 | 3 cols × 2 rows | `wedge` at two rotations per column, forming a Z/S block per column |
| 3 | shape-sample-3 | 1 col × 4 rows | **New: `ogee` candidate (low confidence, 1 sample)** — horizontal S-curve band |
| 4 | shape-sample-4 | ~2 cols × 3 rows, diagonal stripes | **New: `step` candidate** (same motif as #1, wider bands) |
| 5 | shape-sample-5 | 3 cols × 2 rows | `wedge` pairs forming right-pointing chevrons/arrows |
| 6 | shape-sample-6 | 2 cols × 2 rows | `fillet` (concave arc) at 4 rotations around a shared center, leaving a diamond gap |
| 7 | shape-sample-7 | 2 cols × 2 rows | `wedge` combos forming an angular arrow/lightning mark |
| 8 | shape-sample-8 | 2 cols × 1 row | `wedge` (straight bevel corners) + `bulge`/`fillet` (rounded corners) on the remaining corners — two interlocking beveled blobs |
| 9 | shape-sample-9 | 3 cols × 2 rows over a rounded-square background | `wedge` diagonal stripes (light, cut through) + `fill` background; outer corner rounding is the decorative frame convention already noted in the main survey, not a primitive |
| 10 | shape-sample-10 | not grid-tileable | **Bespoke** — asymmetric interlocking hook/arrow mark, same family as Shape 31 ("maze/interlock") in the main survey |
| 11 | shape-sample-11 | not clearly grid-tileable (concentric, not repeating) | **Partial** — outer diamond ring reduces to `wedge` at 4 rotations, but the nested inner diamonds are concentric scaling, not same-size cell tiling; flagged as partially unexplained |
| 12 | shape-sample-12 | 4 cols × 2 rows | `wedge` forming horizontal chevron/zigzag bands |
| 13 | shape-sample-13 | 2 cols × 2 rows | `wedge` (each cell split diagonally, alternating fill/empty) reads as basket-weave parallelograms across cell boundaries |
| 14 | shape-sample-14 | 2 cols × 2 rows | `wedge` at 4 rotations — classic pinwheel/bowtie demo, strong clean match |
| 15 | shape-sample-15 | ~3 cols × 2 rows, diagonal stripes | **New: `step` candidate** (same motif as #1/#4) |
| 16 | shape-sample-16 | 3 cols × 3 rows | `fill` + `wedge` (corner bevels) around the outer ring, center cell = `empty` (reads as an inset square "window") — see note below on an alternative reading |
| 17 | shape-sample-17 | 2 cols × 2 rows (badge shape) + 2 cols × 1 row (bottom notch) | `wedge` (top corner bevels) + `bulge`/`fillet` (bottom rounded corners) + `wedge` pair forming the downward triangular notch |
| 18 | shape-sample-18 | 3 cols × 3 rows | `wedge`, same rotation/invert repeated in every cell — clean, exact confirmation sample |
| 19 | shape-sample-19 | 2 cols × 2 rows | `pinwheel-arc` at 4 rotations — offset-radius arcs leaving a residual straight-edge gap, matching the candidate's description closely |
| 20 | shape-sample-20 | 4 cols × 3 rows | `wedge` forming horizontal "M/W" chevron bands (same family as #12) |

## New candidate: `step` (dogleg diagonal)

A straight-edged cut that runs diagonally from one corner partway across the cell, turns 90° for
a short run along an intermediate line, then continues diagonally to the opposite corner — i.e.
a *kinked* corner-to-corner cut, versus `wedge`'s single unbroken corner-to-corner line. This is
not reproducible by tiling `wedge` on a strict same-size grid: two `wedge` cells sharing an edge
always meet in an unbroken straight line (their corner-to-corner hypotenuses share the same
slope and pass exactly through the shared corner), so a visible jog mid-band is a distinct
geometric feature, not a tiling artifact.

- **Samples:** shape-sample-1, shape-sample-4, shape-sample-15 (3 independent samples, all in
  this batch — not seen in the original 72-sample survey).
- **Geometric description:** anchored on two opposite corners like `wedge`, but the connecting
  edge is a 3-segment polyline (diagonal → short straight run parallel to one cell edge →
  diagonal) rather than a single straight segment, splitting the cell into two regions with a
  stepped boundary.

## New candidate: `ogee` (S-curve band) — low confidence

A horizontal band bounded by two S-shaped curves (concave then convex, or vice versa), each
tangent to the left and right cell edges at their vertical midpoint. Distinct from `fillet`/
`bulge` (single quarter-circle, corner-anchored) and `cap` (single semicircle spanning one edge).

- **Samples:** shape-sample-3 only.
- Single-occurrence — per the main survey's ranking convention this stays below the bar for a
  registry slot recommendation; flagged here so it isn't lost if more S-curve samples turn up
  in a future batch.

## Fits within the 8-type ceiling

The registry's 4 open slots (indices 4–7) are already earmarked by `docs/primitive-survey.md`
for `circle`, `wedge`, `cap`, `pinwheel-arc`, in that priority order. This batch doesn't change
that recommendation — it reinforces `wedge` (10 of 20 samples touch it, the single strongest
signal in this survey) and `pinwheel-arc` (1 more sample) but finds nothing that unseats them.

`step` (3 samples) and `ogee` (1 sample) have **no open slot** to land in under the current
8-type ceiling — both would need to wait for a 9th-slot format revision alongside whichever of
`cap`/`pinwheel-arc` loses the tie-break noted in the main survey. Between the two, `step` is
the stronger candidate (3 independent samples vs. 1) and should be the first thing evaluated
once a format revision is on the table.

## Adjacency (edge-signature)

Evidence for `wedge` neighbor behavior, read directly off the multi-cell samples in this batch
(orientation follows the existing candidate SVG: rotation 0° fills the upper-right triangle,
hypotenuse running corner-to-corner from top-left to bottom-right):

| Primitive A (rot/invert) | Shared edge | Primitive B (rot/invert) | Verdict | Why | Evidence |
|---|---|---|---|---|---|
| `wedge` 0° | right↔left | `wedge` 0° | good — continuous | hypotenuse exits the shared corner at the same point/slope it entered on the neighbor, no seam | shape-sample-18 (3×3, uniform rotation) |
| `wedge` 0° | bottom↔top | `wedge` 180° | good — continuous | 180° rotation puts the matching corner-point on the shared edge, arms line up | shape-sample-14 (2×2 pinwheel) |
| `wedge` 0° | right↔left | `wedge` 90° | good — alternation | corner-touch-point on one side meets full-edge fill on the other every cell, repeats as the chevron rhythm | shape-sample-12, shape-sample-20 (chevron bands) |
| `wedge` 0° | bottom↔top | `wedge` 0°, offset one column | bad | straight cut continues instead of jogging — this is why the observed dogleg in samples 1/4/15 can't be `wedge` alone; a plain `wedge`-to-`wedge` boundary never produces a mid-band kink | shape-sample-1, shape-sample-4, shape-sample-15 (ruled out `wedge`-only explanation) |
| `fillet` 0° | all 4 | `fillet` at 90° steps | good — continuous | concave arcs meet at each shared corner tangentially, converging on one shared center point | shape-sample-6 (2×2, diamond-gap center) |
| `pinwheel-arc` 0° | all 4 | `pinwheel-arc` at 90° steps | good — continuous | offset-radius arcs meet at shared corners, residual straight edges align into the star-shaped center gap | shape-sample-19 (2×2) |

## Samples not yet explained

- **shape-sample-10** — bespoke asymmetric interlocking hook/arrow mark; doesn't decompose into
  any repeating single-cell motif. Same family as Shape 31 in `docs/primitive-survey.md`.
- **shape-sample-11** (partial) — outer diamond ring reduces to `wedge` at 4 rotations, but the
  nested inner diamond rings are concentric same-center scaling within what reads as a single
  cell, not same-size grid tiling. BitShaper's grid model doesn't have a natural "scale down and
  repeat inward" composition, so this remains only partially explained.

One more note on **shape-sample-16**: the inset square "window" was read above as an `empty`
center cell in a 3×3 grid (reusing existing primitives), but the outer shape doesn't show clear
cell-boundary lines the way shape-sample-18's does, so a competing reading — a small
inward-inset square punched into the middle of one larger `fill` cell, never touching that
cell's own edges — is also plausible. If the 3×3-grid reading turns out wrong once real SVG/path
samples of this motif are available, that would be a new "punch"/inset-square primitive
candidate; flagged here rather than silently assumed away.

## Addendum (2026-08-27): "punch" candidate did not recur; nothing further to add

Revisited during the `samples/63/` survey. Three inset-square candidate primitives — `frame`
(square annulus), `punch` (small centred square), `diamond-inset` (edge-midpoint diamond) —
were rendered as mask libraries and run through the per-cell matcher against all 21 deferred
`samples/svgs/` shapes and the `samples/63/` set. **No cell in any shape preferred any of the
three** over the existing registry. shape-sample-16's inset "window" stays best-explained as an
`empty` center cell in a 3×3 grid; the "punch" primitive has no second occurrence anywhere in
the corpus and is not pursued.

The `step` and `ogee` candidates from this survey were both implemented (registry indices 8 and
9) in `bitshaper-id-format-v2` / `bitshaper-expand-primitives`. Nothing else in
`samples/screens2/` produced a catalog entry: the PNGs are ~150 px, heavily anti-aliased
rasters with no crisp ground-truth edges, so they cannot be pixel-verified to the ≥99.6% bar
the catalog requires — visual motif inference (as done above) is the appropriate and final
treatment for this set.
