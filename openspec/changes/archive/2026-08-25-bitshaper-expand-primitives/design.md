## Context

Six primitives to implement: `circle`, `wedge`, `cap`, `pinwheel-arc` are already illustrated as
hand-sketched geometry in `docs/primitives/*.CANDIDATE.svg` (from `docs/primitive-survey.md`).
`step` and `ogee` have no prior illustration — they were named and described only in prose in
`docs/primitive-survey-screens2.md`, so this design pins down exact, implementable geometry for
both, the way `pinwheel-arc`'s 0.78× radius ratio was pinned down as an empirical fit when it was
first proposed.

All primitives follow the existing `PrimitivePathBuilder` contract (`src/core/primitives/transform.ts`):
build local-coordinate geometry for rotation 0 / no invert using only `M`/`L`/`A`/`Z` segments
(no cubic Bezier command exists in the `PathSegment` union), then map every segment through
`transformPathSegment`. Every primitive below is designed within that constraint.

## Decision: geometry per primitive

### `circle` (index 4)
Two arcs forming a full circle, radius `r = cellSize / 2`, centered at the cell center —
tangent to all four sides:
```
M 0, r
A r, r, 0, 1, 0, cellSize, r
A r, r, 0, 1, 0, 0, r
Z
```
Matches `docs/primitives/circle.CANDIDATE.svg` exactly (at `cellSize = 256`, `r = 128`).
The traced *locus* is invariant under rotation/invert (every point stays the same distance from
the cell center, which is fixed by rotation/invert), so the rendered circle looks identical at
every rotation/invert combination — but the emitted path *segments* still change (the start
point rotates to a different point on the circle, and `invert` flips both arcs' sweep flags, per
`transformPathSegment`), the same as every other primitive. Rotation/invert are accepted as
parameters purely for `PrimitivePathBuilder` contract consistency.

### `wedge` (index 5)
Straight corner-to-corner cut, filled region = the triangle at the top-right/top-left/bottom-right
corners (before rotation):
```
M 0, 0
L cellSize, 0
L cellSize, cellSize
Z
```
Matches `docs/primitives/wedge.CANDIDATE.svg` exactly. The diagonal cut is the implicit closing
edge from `(cellSize, cellSize)` back to `(0, 0)`.

### `cap` (index 6)
Single semicircular arc spanning the bottom edge, radius `r = cellSize / 2`, bulging upward into
the cell:
```
M 0, cellSize
A r, r, 0, 0, 1, cellSize, cellSize
Z
```
Matches `docs/primitives/cap.CANDIDATE.svg` exactly.

### `pinwheel-arc` (index 7)
Concave arc anchored at the bottom-right corner, radius `r = 0.78 × cellSize` (pinned ratio from
`docs/primitive-survey.md`), leaving a straight stub of length `cellSize - r` along each of the
two adjacent edges before the arc begins:
```
M cellSize, cellSize
L cellSize, cellSize - r
A r, r, 0, 0, 0, cellSize - r, cellSize
Z
```
Matches `docs/primitives/pinwheel-arc.CANDIDATE.svg`'s structure (at `cellSize = 256`,
`r ≈ 200`, stub ≈ 56). `0.78` stays an empirical ratio, not an exact fraction — recorded as a
named constant in the implementation, not re-derived from scratch, and open to revision if a
future sample batch narrows it further.

### `step` (index 8) — new geometry, pinned here
A corner-to-corner cut like `wedge`, but the connecting edge is a 3-segment polyline (diagonal →
short horizontal jog → diagonal) instead of one straight line, matching the "dogleg" motif from
`docs/primitive-survey-screens2.md` (samples 1, 4, 15). Jog half-width `j = cellSize / 8`,
chosen as the simplest ratio that keeps the jog visually distinct from a straight `wedge` cut
without dominating the cell — an arbitrary but documented pin, the same status `pinwheel-arc`'s
ratio had before this change:
```
M 0, 0
L cellSize, 0
L cellSize, cellSize
L cellSize/2 + j, cellSize/2
L cellSize/2 - j, cellSize/2
Z
```
The polygon is simple (non-self-intersecting) for any `0 < j < cellSize / 2`; `j = cellSize / 8`
is well inside that range. The two diagonal segments are symmetric under 180° rotation about the
cell center, matching the visual rhythm seen across all three source samples.

### `ogee` (index 9) — new geometry, pinned here
A band from the top edge down to an S-curve, built from two arcs of equal radius
`r = cellSize / 4` (a quarter-cell each, chosen so the two halves of the S have matching
curvature and meet with continuous — tangent-matched — direction at the cell's horizontal
midpoint, rather than as an empirical fit):
```
M 0, 0
L cellSize, 0
L cellSize, cellSize/2
A r, r, 0, 0, 1, cellSize/2, cellSize/2
A r, r, 0, 0, 0, 0, cellSize/2
Z
```
The first arc (center `(3·cellSize/4, cellSize/2)`, `sweepFlag = 1`) bulges downward; the second
(center `(cellSize/4, cellSize/2)`, `sweepFlag = 0`) bulges upward — opposite sweep flags on
matching-radius arcs is what produces the S rather than a single semicircle "smile". Both arc
endpoints sit at `y = cellSize / 2`, satisfying "tangent to the left/right cell edges at their
vertical midpoint" from the survey's description.

## Registry order and index assignment

Appended in survey-ranking order (most independently-reused motif first, ties broken by the
existing survey's stated priority): `circle=4, wedge=5, cap=6, pinwheel-arc=7, step=8, ogee=9`.
This is append-only per `src/core/registry.ts`'s existing invariant — no reordering of `empty=0,
fill=1, fillet=2, bulge=3`.

## Interaction with `bitshaper-id-format-v2`

`ogee` at `type=9` produces flat indices up to `9×8 + 3×2 + 1 = 79`, which exceeds the
version-1 ceiling of 61 for several rotation/invert combinations. `step` at `type=8` maxes out
at `8×8+3×2+1=71`, also over 61. Both rely on `bitshaper-id-format-v2` (already implemented and
archived) to encode at all rotation/invert combinations — `encodeShapeId` transparently upgrades
to a version-2 ID (`BS2-...`) for any shape using one of these cells at a high enough
rotation/invert combination; no special handling is needed in the primitive code itself.

## Alternatives considered

- **Cubic Bezier for `ogee`**: would produce a cleaner, single-command S-curve, but the
  `PathSegment` type only supports `M`/`L`/`A`/`Z` (matching the samples' arc-and-line-only
  style throughout `fillet`/`bulge`/`cap`). Rejected — two matching-radius arcs reproduce an S
  shape without widening the type contract.
- **`step`'s jog as a vertical offset instead of horizontal**: geometrically equivalent under a
  90° rotation, so this is purely a convention choice. Horizontal was picked because it matches
  the source samples' visual orientation before any rotation is applied.
- **Re-deriving `pinwheel-arc`'s ratio from scratch**: `docs/primitive-survey.md` already flagged
  `0.78` as approximate and worth a "second look... before committing it to the registry." This
  change does not re-derive it — it implements the existing pinned value as-is, since no new
  sample data narrowing that ratio has come in since the original survey.
