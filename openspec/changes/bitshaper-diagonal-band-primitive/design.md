## Context

See proposal.md for the why. Constraints this design works within:

- `src/core/registry.ts`'s `PRIMITIVE_REGISTRY` is append-only; a primitive's
  array index is baked into every shape ID ever issued referencing it.
  `diagonal-band` becomes index 12.
- `src/core/primitives/*.ts` files are pure functions
  `(cellSize, rotation, invert) => PathSegment[]`, building local `[0,cellSize]^2`
  geometry that `src/core/primitives/transform.ts` then rotates/inverts —
  primitives never emit their own rotation/invert logic.
- Every composition below was derived by measurement and confirmed by rendering
  the full candidate `ShapeDef` with the *compiled package* and pixel-comparing
  its full 256×256 raster against the reference SVG's raster. Method: for each
  grid hypothesis (2×2 / cellSize 128, 4×4 / cellSize 64) and each cell, render
  every registered primitive × 4 rotations × 2 inverts, rasterize, and compare
  only that cell's pixel region against the reference; anything below ~98% was
  treated as "wrong shape family", not "close enough".

## Goals / Non-Goals

**Goals:**
- Add `diagonal-band` as a normal registry citizen: same `PrimitivePathBuilder`
  contract, same rotation/invert handling via `transformPathSegment`, no
  special-casing in `render.ts`/`id.ts`.
- Reproduce `samples/svgs/Shape 11, 12, 16, 17, 18, 19, 20, 21, 22` exactly,
  verified by rendering + pixel comparison (≥99.6% full-image agreement).
- Append those nine verified entries to the catalog without disturbing the
  existing nine.

**Non-Goals — shapes deferred (did not fit a clean, high-confidence grid story):**

| Shape | Best grid match | What it actually is |
|---|---|---|
| `Shape 13` | 4×4 `fill` ~94.7% | A single large circle (radius 92, off any grid) plus an L-shaped border block — a freeform composition, not a grid of cells. |
| `Shape 14` | 4×4 ~88.9% | Straight-line chamfer/arrow triangles at non-grid coordinates (`27.598`, `48`, `92.402`) — same family as the deferred `Shape 7`. |
| `Shape 15` | 4×4 ~95.4% | Nested chevron/arrow outline, non-grid slants — same family as `Shape 7`/`14`. |
| `Shape 23`, `24` | 2×2 ~74%, 4×4 ~76–84% | Concentric bullseye targets. Ring radii (128/96/72/40/16) are not fractions of any cell size and the `arc-band` inner ratio is fixed at 1/2. |
| `Shape 25` | 2×2 ~97.3% | A canvas-spanning semicircle (radius 128, two cells wide) over a half-annulus of thickness 56 — neither is a single-cell primitive. |
| `Shape 26` | 4×4 ~98.4% | Rounded-square outer border (corner radius 20) around a 4-petal pinwheel. No primitive produces a `r=cellSize/6.4` rounded outer corner. |
| `Shape 27` | 4×4 ~95.3% / 2×2 ~93.7% | 2×2 `round-corner` outer shell is close, but the diagonally-oriented central "leaf" (two radius-96 arcs across the 4-cell meeting point) has no primitive. |
| `Shape 28` | 4×4 ~89.7% | Interlocking circles / figure-eight at radii 128/72/24 — off-grid, not cell-decomposable. |
| `Shape 29` | 4×4 ~83.3% | Concentric C-shaped rings (open horseshoes) — arcs span >90° with gaps; no primitive is a partial-sweep ring. |
| `Shape 30` | 4×4 ~85.6% | Nested rounded-rectangle "comb"/maze with radius-24 corners — a continuous meander, not a grid of independent cells. |

Also out of scope: any change to the ID codec, existing primitives, the CLI, or
`web/`; a generalized "arbitrary thickness/shear" parameter for `diagonal-band`
(it fixes its `1/2` ratio as a named constant, matching every other primitive).

## Decisions

### `diagonal-band`: parallelogram band, vertical thickness `cellSize / 2`

**Decision:** `diagonal-band`'s default (rotation 0, invert false) geometry is a
parallelogram sheared corner-to-corner across the whole cell:

```
w = cellSize / 2
M (0, 0)
L (cellSize, w)
L (cellSize, cellSize)
L (0, w)
Z
```

The two long edges — `(0,0)→(cellSize,w)` and `(0,w)→(cellSize,cellSize)` — are
parallel diagonals (rise `w`, run `cellSize`). The two short edges are vertical
stubs of length `w` at `x=0` (top half) and `x=cellSize` (bottom half). This is
exactly `wedge`'s corner-to-corner cut, doubled into a band: `wedge` fills the
triangle on one side of a single diagonal; `diagonal-band` fills the strip
between two parallel diagonals, leaving a matching empty triangle above and
below.

The thickness ratio `1/2` is an **exact fraction** — `Shape 16.svg`'s band edges
sit precisely on the cells' vertical midpoints (`128 * 1/2 = 64`, measured with
zero rounding error). A named constant `DIAGONAL_BAND_WIDTH_RATIO = 1 / 2` in
`diagonal-band.ts` follows the existing per-primitive ratio-constant pattern
(`arc-band.ts`'s `ARC_BAND_INNER_RADIUS_RATIO`, `round-corner.ts`'s
`ROUND_CORNER_RADIUS_RATIO`).

**Alternatives considered:**
- A `wedge`-only 4×4 approximation of `Shape 16` — rejected: best score ~90.8%,
  clearly the wrong shape (fills the whole triangle, not a band).
- Exposing thickness/shear as a per-cell parameter — rejected: `1/2` fit exactly
  with no search once the parallelogram structure was identified, matching how
  every other primitive fixes its own single ratio.

### Compositions

All verified against the compiled package at the stated full-image agreement
(residual is anti-aliasing noise at cell/arc edges, not shape error). Each ID's
`encodeShapeId(decodeShapeId(id)) === id` round-trip was confirmed.

| Shape | Grid | ID | Agreement |
|---|---|---|---|
| `Shape 11` | 4×4 `fill`/`wedge` | `BS-4X4-8i8ie8e88i8ie8e8S` | 100.000% |
| `Shape 12` | 4×4 `fill`/`wedge` | `BS-4X4-8ig8e88fg8g88f8fP` | 100.000% |
| `Shape 16` | 2×2 `diagonal-band` | `BS2-2X2-1Y1Y1Z1Z6E` | 100.000% |
| `Shape 17` | 4×4 `wedge`/`fill`/`empty` | `BS-4X4-e8i00e8ie8i00e8iw` | 100.000% |
| `Shape 18` | 4×4 `bulge` | `BS-4X4-TTRRPPOORRTTOOPPm` | 99.811% |
| `Shape 19` | 4×4 `bulge`/`fill` | `BS-4X4-RTRTP8P8R8R8POPOa` | 99.861% |
| `Shape 20` | 2×2 `round-corner` | `BS2-2X2-1L1L1L1L5M` | 99.957% |
| `Shape 21` | 4×4 `round-corner`/`fill` | `BS2-4X4-081J1I081N08081L1I08081J081L1N08Be` | 99.934% |
| `Shape 22` | 2×2 `arc-band` | `BS2-2X2-1T1V1R1Q5p` | 99.837% |

`Shape 16` (2×2 `diagonal-band`), row-major: `[{r:0,i:false}, {r:0,i:false},
{r:0,i:true}, {r:0,i:true}]` — top row bands run TL→BR, bottom row bands are
mirrored to run BL→TR.

### Catalog append scope

**Decision:** append the nine new entries; leave the existing nine untouched.
The catalog goes from 9 to 18 real, verified marks. Matches the last change's
append-only treatment of `catalog.json`.

## Risks / Trade-offs

- **[Trade-off]** `diagonal-band` is justified by a single reference shape
  (`Shape 16`), unlike `arc-band` (four). Accepted: it is a canonical geometric
  primitive (the straight sibling of the arc-band family) and reproduces its
  reference at 100%, versus the best existing-primitive approximation at ~91%.
- **[Risk]** Eleven of the twenty shapes in this batch are deferred. This batch
  is genuinely dominated by off-grid circular and meander compositions; forcing
  them into the catalog at 84–98% would ship marks that visibly don't match
  their reference. Flagged by name in Non-Goals rather than silently dropped.
- **[Risk]** `diagonal-band`'s `1/2` ratio is derived from `Shape 16` alone. A
  future sample needing a visually similar but different band thickness would
  need a new primitive or accepting `1/2` as "close enough" — noted for whoever
  reproduces the next straight-band sample.
