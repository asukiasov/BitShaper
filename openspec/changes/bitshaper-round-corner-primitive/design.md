## Context

See proposal.md for the why. Constraints this design works within:

- `src/core/registry.ts`'s `PRIMITIVE_REGISTRY` is append-only; a primitive's array index is baked into every shape ID ever issued referencing it. `round-corner` becomes index 10, `arc-band` becomes index 11.
- `src/core/primitives/*.ts` files are pure functions `(cellSize, rotation, invert) => PathSegment[]`, building local `[0,cellSize]^2` geometry that `src/core/primitives/transform.ts` then rotates/inverts — primitives never emit their own rotation/invert logic.
- Every composition below was derived by measurement, not eyeballing, and confirmed by rendering the full candidate `ShapeDef` and pixel-comparing its full 256×256 raster against the reference SVG's raster. All 9 shapes reproduced (1–6, 8–10) hit ≥99.8% pixel agreement (residual is anti-aliasing noise at cell/arc edges, not shape error).
- Method used throughout: (1) extract each cell's cubic-Bezier arc control points from the reference; (2) compute the arc's true center from the Beziers' tangent directions at both endpoints (tangent ⊥ radius pins the center uniquely, so this doesn't depend on assuming where the center is); (3) render sweep-flag/rotation candidates and pixel-diff each against a cropped, upscaled raster of the reference cell; (4) once a primitive's geometry is nailed down for one cell, repeat the corner/radius measurement per cell to get that shape's full composition.

## Goals / Non-Goals

**Goals:**
- Add `round-corner` and `arc-band` as normal registry citizens: same `PrimitivePathBuilder` contract, same rotation/invert handling via `transformPathSegment`, no special-casing in `render.ts`/`id.ts`.
- Reproduce `samples/svgs/Shape 1.svg` through `Shape 10.svg` (excluding `Shape 7.svg`) exactly, verified by rendering + pixel comparison.
- Replace the catalog's placeholder content with these 9 real, verified entries.

**Non-Goals:**
- `Shape 7.svg` — a pure straight-line chamfer/arrow pattern. Neither a 2×2 nor a 4×4 grid hypothesis produced a good match with the existing primitive set (best scores 0.73–0.97, clearly wrong), and its coordinates suggest a finer grid (cellSize 32, 8×8) with a *partial*-edge diagonal chamfer distinct from `wedge`'s full corner-to-corner cut — a third new primitive, not yet pinned down with confidence. Deferred to a follow-up change rather than forcing an uncertain match into this one.
- Reproducing any further `samples/svgs/` entries beyond 1–10 — later changes.
- Any change to the ID codec, existing primitives, the CLI, or `web/`.
- A generalized "arbitrary radius" parameter for either new primitive — both fix their ratio as a named constant, matching how every other primitive fixes its own ratio (`pinwheel-arc`'s 0.78, `ogee`'s cellSize/4, `step`'s 1/8) rather than exposing it as a per-cell parameter.

## Decisions

### `round-corner`: inset-centered arc, radius `cellSize * 25/32`

**Decision:** `round-corner`'s default (rotation 0, invert false) geometry rounds the cell's top-left corner — consistent with `fillet`/`bulge`'s top-left-corner default:

```
r = cellSize * 25/32          // 0.78125; exact for the reference (100/128)
M (r, 0)
L (cellSize, 0)
L (cellSize, cellSize)
L (0, cellSize)
L (0, r)
A rx=r ry=r xRot=0 largeArc=0 sweep=1  -> (r, 0)
Z
```

The radius ratio `25/32` is used (not a decimal) because it reproduces the reference exactly: `128 * 25/32 = 100`, matching the reference's measured radius with zero rounding error, unlike `pinwheel-arc`'s empirically-fit `0.78` (documented there as "not an exact fraction"). A named constant `ROUND_CORNER_RADIUS_RATIO = 25 / 32` in `round-corner.ts` follows the existing per-primitive ratio-constant pattern (see `pinwheel-arc.ts`'s `PINWHEEL_ARC_RADIUS_RATIO`, `step.ts`'s `STEP_JOG_HALF_WIDTH_RATIO`).

**Alternatives considered:**
- Centering the arc *on* the corner (the `fillet`/`bulge`/`pinwheel-arc` convention) at some radius `< cellSize` — rejected: this is a fundamentally different curve (a large disk-sector cut/bulge, not a corner *rounding*) and cannot reproduce the reference's geometry at any radius; confirmed by direct tangent-based center calculation, not assumption.
- A decimal approximation (`0.78`) matching `pinwheel-arc`'s style — rejected: `25/32` is exact for this primitive's reference.

### `arc-band`: quarter-annulus, outer radius `cellSize`, inner radius `cellSize / 2`

**Decision:** `Shapes 2–5.svg` each decompose into a 2×2 grid where every cell is a quarter-annulus band: the region between two arcs of different radii, both centered at the same cell corner. Default (rotation 0, invert false) geometry, top-left corner:

```
rOuter = cellSize
rInner = cellSize / 2
M (cellSize, 0)
A rx=rOuter ry=rOuter xRot=0 largeArc=0 sweep=1  -> (0, cellSize)
L (0, rInner)
A rx=rInner ry=rInner xRot=0 largeArc=0 sweep=0  -> (rInner, 0)
Z
```

The outer arc is exactly `fillet`/`bulge`'s existing arc (radius `cellSize`, centered on the corner, sweep 1) — `arc-band` is that same outer boundary with a smaller same-centered arc (radius `cellSize/2`, opposite sweep) subtracted near the corner, connected by one straight segment per side. Both radii are exact fractions of `cellSize` (`1` and `1/2`), reproducing all 16 tested cells (4 shapes × 4 cells) at ≥99.8% agreement with zero radius-fitting needed — confirmed by a full sweep-flag/rotation search before locking this in, not assumed from the first cell alone.

**Alternatives considered:**
- A single-arc primitive (tried first, since the automated per-cell matcher's initial "best guess" for these cells landed on `round-corner`/`fillet` at ~89–94% agreement) — rejected once direct Bezier tangent analysis of the reference showed *two* arcs sharing one center, not one; the single-arc candidates' sub-95% scores were the tell that the shape family was wrong, not just mis-parameterized.
- Non-half inner radius — rejected; `cellSize/2` fit exactly (>99.8%) with no search needed once the two-arc structure was identified, so there's no evidence for any other ratio.

### Compositions

`Shape 1` (2×2, `round-corner`), row-major:

| Cell | Cut corner    | Rotation | Invert |
|---|---|---|---|
| TL | bottom-left  | 270 | false |
| TR | top-left     | 0   | false |
| BL | bottom-right | 180 | false |
| BR | top-right    | 90  | false |

`Shape 2` (2×2, `arc-band`), row-major: `[{r:90,i:true}, {r:0,i:false}, {r:90,i:true}, {r:0,i:false}]`

`Shape 3` (2×2, `arc-band`), row-major: `[{r:0,i:true}, {r:0,i:false}, {r:90,i:true}, {r:180,i:true}]`

`Shape 4` (2×2, `arc-band`), row-major: `[{r:0,i:false}, {r:0,i:true}, {r:180,i:true}, {r:90,i:true}]`

`Shape 5` (2×2, `arc-band`), row-major: `[{r:0,i:true}, {r:0,i:true}, {r:0,i:true}, {r:0,i:true}]`

`Shape 6` (4×4, existing `wedge`/`fill` only — no new primitive), row-major:
```
wedge(r90)  fill        fill        wedge(r180)
fill        wedge(r0,i) wedge(r0)   fill
fill        wedge(r180) fill        wedge(r180)
wedge(r0)   fill        wedge(r0)   fill
```

`Shape 8` (4×4, existing `empty`/`fill`/`bulge` only), row-major:
```
empty            fill   fill              bulge(r180,i)
fill             bulge(r0)  empty         fill
fill             empty  bulge(r90,i)      fill
bulge(r0,i)      fill   fill              empty
```

`Shape 9` (4×4, existing `empty`/`fill`/`bulge` only), row-major:
```
empty  fill        fill        empty
fill   bulge(r0)   bulge(r0,i) fill
empty  fill        fill        empty
fill   bulge(r0)   bulge(r0,i) fill
```

`Shape 10` (4×4, existing `empty`/`fill`/`bulge` only), row-major:
```
fill        empty  fill        bulge(r180,i)
bulge(r0,i) fill   empty       fill
fill        empty  fill        empty
bulge(r0,i) fill   bulge(r0,i) fill
```

### Catalog replacement scope

**Decision:** replace all 13 existing `catalog.json` entries with the 9 new, verified entries above (Shapes 1–6, 8–10). `Shape 7` is excluded until its own primitive is designed. Going from 13 placeholder entries to 9 real ones is an accepted, temporary state — more honest than keeping placeholder entries the user has already flagged as low-quality.

**Alternatives considered:** keep the old entries alongside the new ones — rejected per explicit user direction ("remove curated marks that you have added... they look bad").

## Risks / Trade-offs

- **[Trade-off]** Catalog goes from 13 to 9 entries (not the original 13, and not yet 10 — `Shape 7` deferred). Accepted per explicit user direction and roadmap philosophy (real content over placeholders).
- **[Risk]** Both new primitives' ratios (`25/32` for `round-corner`; `1` and `1/2` for `arc-band`) are derived from these specific reference samples. A future sample needing a *visually similar but not identical* radius would need either a new primitive or accepting the existing ratio as "close enough" — not a concern for this change, worth noting for whoever reproduces the next arc-family sample.
- **[Risk]** `Shape 7`'s likely third primitive (a partial-edge diagonal chamfer, distinct from `wedge`) is not designed yet — flagged as a real gap, not silently dropped.
