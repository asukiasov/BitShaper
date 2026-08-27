## Context

See proposal.md for the why. Constraints this design works within:

- `src/core/registry.ts`'s `PRIMITIVE_REGISTRY` is append-only; a primitive's
  array index is baked into every shape ID ever issued referencing it. `leaf`
  becomes index 13.
- `src/core/primitives/*.ts` files are pure functions
  `(cellSize, rotation, invert) => PathSegment[]`, building local
  `[0,cellSize]^2` geometry that `src/core/primitives/transform.ts` then
  rotates/inverts — primitives never emit their own rotation/invert logic.
- The 8-type ID ceiling was lifted by `bitshaper-id-format-v2`: two base62
  characters per cell allow flat indices up to 3843, so `type` can reach 480.
  Appending a 14th primitive needs no format work.
- Every composition below was derived by measurement and confirmed by
  rendering the full candidate `ShapeDef` with the *compiled package* and
  pixel-comparing its full 256×256 raster against the reference SVG's raster.
  Method: for each grid hypothesis (2×2 / cellSize 128, 4×4 / cellSize 64,
  8×8 / cellSize 32) and each cell, render every registered primitive × 4
  rotations × 2 inverts, rasterize, and compare only that cell's pixel region
  against the reference; anything below ~98% was treated as "wrong shape
  family", not "close enough". The chosen `ShapeDef` was then rendered whole
  and compared full-image; only ≥99.6% agreement counts as verified.

## Goals / Non-Goals

**Goals:**
- Add `leaf` as a normal registry citizen: same `PrimitivePathBuilder`
  contract, same rotation/invert handling via `transformPathSegment`, no
  special-casing in `render.ts`/`id.ts`.
- Reproduce `samples/svgs/Shape 31, 32, 33, 34, 38, 40, 43, 45, 49, 51, 53,
  55, 60, 65, 67, 70, 71` exactly, verified by rendering + pixel comparison
  (≥99.6% full-image agreement).
- Append those seventeen verified entries to the catalog without disturbing
  the existing eighteen.

**Non-Goals — shapes deferred (did not fit a clean, high-confidence grid story):**

| Shape | What it actually is | Best grid match |
|---|---|---|
| `Shape 35` | Off-grid rosette of five circles (radius 60, centers not on any cell grid). | 8×8 ~92.7% |
| `Shape 36`, `44`, `46`, `59`, `64` | A 2×2 `bulge`/`fillet` base plus a small circle or plus-cutout centred on the canvas centre — i.e. sitting on the 2×2 grid *vertex*, not in any cell. A `corner-dot` primitive was prototyped (quarter-disk radius `3/8·cellSize` at a corner) and rejected: the per-cell matcher never preferred it, and it pushed these shapes *down* (best 91–93% at 4×4). | 2×2 ~97% |
| `Shape 37` | 4×4 `arc-band` ring-corner lattice — genuinely a clean grid, but every cell lands at 99.4–99.5% (systematic sub-pixel arc mismatch) and the full image is **99.593%**, just under the 99.6% bar. Deferred rather than shipped unverified. | 4×4 99.59% |
| `Shape 39` | Circle (radius 128) plus a fan of small bumps along the bottom edge at non-grid offsets — a spinner/loader mark. | 8×8 ~94.8% |
| `Shape 41`, `47` | Ornate concave-cross / Reuleaux emblems built from many overlapping arcs at non-cell-aligned radii. | 8×8 ~96% |
| `Shape 42` | 8×8 woven-circles ("fish-scale") of `bulge`/`fillet` — a clean grid, but the reference's arc radii and the even-odd hole structure put the full image at **99.17%**. Deferred as unverified. | 8×8 99.17% |
| `Shape 48` | Concave-cross/flower emblem (like 41/47) combined with a `leaf`-like centre; the emblem ring is off-grid. | 8×8 ~98.4% |
| `Shape 50` | Bespoke pinwheel/compass logo with irregular offsets. | 8×8 ~92.2% |
| `Shape 52`, `54` | Eight-point compass/arrow stars; vertices at non-grid coordinates (`20.519`, `33`, `191.5`, `223`…). `wedge`-family evidence only, not clean tiles. `Shape 54` scrapes 99.61% at 4×4 but the matcher ties several wedge rotations at 98.4%, i.e. the decomposition is coincidental — deferred. | 4×4 ~99.6% |
| `Shape 56`, `57`, `58` | Interlocking-circle / lozenge yin marks built from radius-64/84 arcs centred on edge midpoints, not corners. | 8×8 ~93–95% |
| `Shape 61`, `62` | Pinwheels of diagonal arrow-bars offset 8–16 px from the cell grid. | 8×8 ~95% |
| `Shape 63` | Four corner "leaf" lobes at radius ~120 (not `cellSize` and not `round-corner`'s `25/32·cellSize`). | 8×8 ~95.8% |
| `Shape 66` | 8×8 grid of small circles with a half-circle border frame — the frame ring is off-grid. | 8×8 ~91.5% |
| `Shape 68` | Single large rounded-rectangle frame (corner radius 90/100), not cell-tileable at any grid. | 8×8 ~95.2% |
| `Shape 69` | Nested rounded-rectangle "pinwheel frame" — a continuous meander with a `pinwheel-arc` centre, not independent cells. | 8×8 ~91.4% |
| `Shape 72` | Two overlapping rounded rectangles plus an off-grid circle. | 8×8 ~98.8% |

Also out of scope: any change to the ID codec, existing primitives, the CLI,
or `web/`; a `corner-dot`/`small-circle` primitive (prototyped, did not help —
see the `Shape 36` row above); and a parametrised "arbitrary radius" family
for `leaf` (it fixes its single radius at `cellSize`, matching every other
arc primitive).

## Decisions

### `leaf`: vesica between two `cellSize`-radius corner arcs

**Decision:** `leaf`'s default (rotation 0, invert false) geometry is a
pointed lens spanning the cell's anti-diagonal:

```
M (cellSize, 0)
A cellSize cellSize 0 0 1 (0, cellSize)   ; centre = top-left corner
A cellSize cellSize 0 0 1 (cellSize, 0)   ; centre = bottom-right corner
Z
```

Both arcs have radius `cellSize` — the exact same corner-to-corner arc
`fillet`, `bulge`, and `arc-band`'s outer edge already emit (control-point
offset `cellSize · 0.5523`, the cubic-Bézier quarter-circle constant,
measured on `Shape 53` with no rounding error). The first arc bows toward the
bottom-right corner, the second toward the top-left; between them is the lens,
pointed on the top-right and bottom-left corners. No named ratio constant is
needed — unlike `pinwheel-arc` (`0.78`), `round-corner` (`25/32`), or
`arc-band` (`1/2`), `leaf` has no sub-`cellSize` measurement.

`leaf` is *not* expressible as two `bulge` calls: `bulge` at the top-left
corner and `bulge` at the bottom-right corner, concatenated into one path,
fill the **union** of the two quarter-disks (nonzero winding) — a bowtie
blob. `leaf` traces the outline of their **intersection**.

**Alternatives considered:**
- Two `bulge` cells — rejected: fills the union, not the lens; best score on
  `Shape 53` was ~74%.
- A `corner-dot` / `small-circle` primitive to rescue the deferred
  centre-dot shapes (36, 44, 46, 59, 64) — prototyped and rejected: those
  dots sit on a grid vertex, not in a cell, so no per-cell primitive can
  place them; adding `corner-dot` lowered every candidate.

### Compositions

All verified against the compiled package at the stated full-image agreement
(residual is anti-aliasing noise at cell/arc edges, not shape error). Each
ID's `encodeShapeId(decodeShapeId(id)) === id` round-trip was confirmed.

| Shape | Grid | Primitives | ID | Agreement |
|---|---|---|---|---|
| `Shape 31` | 4×4 | `fill`/`fillet` | `BS-4X4-8L8L80800808H8H8G` | 99.931% |
| `Shape 32` | 8×8 | `fill`/`empty` | `BS-8X8-8888888888888888000000888888808888888088000880888808808888088088C` | 100.000% |
| `Shape 33` | 4×4 | `round-corner`/`bulge`/`fill` | `BS2-4X4-081J080808080P0O0R0T080808081N085f` | 99.895% |
| `Shape 34` | 4×4 | `bulge`/`fill` | `BS-4X4-P88OR88TP88OR88TQ` | 99.860% |
| `Shape 38` | 4×4 | `round-corner`/`bulge`/`fill` | `BS2-4X4-1I08081J080O0P08080T0R081N08081L82` | 99.866% |
| `Shape 40` | 2×2 | `round-corner` | `BS2-2X2-1J1I1J1I5C` | 99.884% |
| `Shape 43` | 2×2 | `round-corner` | `BS2-2X2-1J1I1N1L5J` | 99.902% |
| `Shape 45` | 4×4 | `fill`/`empty` | `BS-4X4-80800808808008082` | 100.000% |
| `Shape 49` | 2×2 | `bulge` | `BS-2X2-TROPh` | 99.861% |
| `Shape 51` | 2×2 | `circle` | `BS-2X2-WWWW4` | 99.719% |
| `Shape 53` | 2×2 | `leaf` | `BS2-2X2-1h1g1g1h6k` | 99.722% |
| `Shape 55` | 4×4 | `round-corner`/`fill` | `BS2-4X4-081L081L1I081I08081L081L1I081I08BY` | 99.884% |
| `Shape 60` | 2×2 | `wedge` | `BS-2X2-ffffe` | 99.997% |
| `Shape 65` | 4×4 | `round-corner`/`fill` | `BS2-4X4-08081I08081L080808081I08081L08086o` | 99.942% |
| `Shape 67` | 8×8 | `fill`/`empty`/`pinwheel-arc` | `BS-8X8-008888000088880088000088880uv088880zx088880000880088880000888800t` | 99.736% |
| `Shape 70` | 4×4 | `bulge`/`fill`/`empty` | `BS-4X4-R88880888808888ON` | 99.968% |
| `Shape 71` | 4×4 | `round-corner`/`bulge`/`fill`/`empty` | `BS2-4X4-0808080T081L000808001I080P0808084n` | 99.933% |

`Shape 53` (2×2 `leaf`), row-major: `[{r:0,i:true}, {r:0,i:false}, {r:0,i:false},
{r:0,i:true}]` — leaves alternate between the two diagonals to form a
four-petal pinwheel.

### Catalog append scope

**Decision:** append the seventeen new entries; leave the existing eighteen
untouched. The catalog goes from 18 to 35 real, verified marks. Matches both
prior changes' append-only treatment of `catalog.json`.

## Risks / Trade-offs

- **[Trade-off]** `leaf` is justified by a single reference shape (`Shape
  53`), as `diagonal-band` was by `Shape 16`. Accepted: it is a canonical
  geometric primitive (the vesica piscis / pointed-lens form), reuses the
  existing corner-arc geometry verbatim, and the same lens motif recurs as
  the negative space in `Shape 40, 43, 55, 65` (reproduced here via
  `round-corner`) — so a future sample is likely to want it as a positive
  shape again.
- **[Risk]** Two borderline shapes (`Shape 37` at 99.59%, `Shape 42` at
  99.17%) are genuinely clean grids that fell just short of the 99.6% bar on
  sub-pixel arc mismatch. They are deferred rather than shipped, and are the
  natural first candidates to revisit if the rasterisation tolerance is
  ever revised.
- **[Risk]** This batch is dominated by canvas-centred and off-grid circular
  compositions — 25 of 42 shapes are deferred. Forcing them into the catalog
  at 91–98% would ship marks that visibly don't match their reference. All
  are flagged by name in Non-Goals rather than silently dropped.
