## Why

The primitive registry currently has 4 of its 8 version-1 slots filled (`empty`, `fill`,
`fillet`, `bulge`). Two independent geometric surveys of reference material
(`docs/primitive-survey.md`, 72 SVGs; `docs/primitive-survey-screens2.md`, 20 PNGs) identified
six next-best motifs, ranked by how many independent samples they explain: `circle`, `wedge`,
`cap`, `pinwheel-arc` (both surveys), plus `step` and `ogee` (screens2 survey only, lower
sample counts). `bitshaper-id-format-v2` has already raised the registry ceiling to 480 types,
so all six can now be registered together rather than splitting into a "fits under 8" batch and
a deferred batch.

## What Changes

- Add six new primitives to `src/core/primitives/`, each a pure `(cellSize, rotation, invert) =>`
  path-segment-commands function matching the existing `PrimitivePathBuilder` contract:
  - `circle` — a filled circle centered in the cell, tangent to all four sides. Rotation/invert
    are no-ops geometrically (centrally symmetric) but are still accepted for API consistency.
  - `wedge` — a straight (non-curved) diagonal cut from one corner to the opposite corner,
    producing a right-triangle half of the cell — the straight-line sibling of `fillet`/`bulge`.
  - `cap` — a single semicircular arc spanning one full cell edge (radius = half the edge
    length, centered on the edge midpoint), rounding both of that edge's corners with one
    smooth curve.
  - `pinwheel-arc` — a concave/convex quarter-arc like `fillet`/`bulge` but with radius smaller
    than `cellSize` (0.78× cell) and anchored at a fixed offset along each edge rather than
    corner-to-corner, leaving short straight residual edges before/after the arc.
  - `step` — a corner-to-corner cut like `wedge`, but the connecting edge is a 3-segment polyline
    (diagonal → short straight run parallel to one cell edge → diagonal) instead of one straight
    line, producing a "dogleg"/kinked boundary rather than `wedge`'s single hypotenuse.
  - `ogee` — a horizontal S-curve band: two opposing-curvature arcs (concave then convex)
    tangent to the left and right cell edges at their vertical midpoint.
- Append all six to `PRIMITIVE_REGISTRY` in `src/core/registry.ts`, in the priority order above
  (indices 4–9) — the append-only, never-reorder invariant already documented on that array
  applies here unchanged. Index 9 (`ogee`, type=9) needs `type × 8 + rotation × 2 + invert` up to
  79 for some rotation/invert combinations, which exceeds the version-1 ceiling of 61 — those
  cells will encode as format-version-2 IDs, per `bitshaper-id-format-v2`.
- Extend the pinned-index registry test to also assert
  `circle=4, wedge=5, cap=6, pinwheel-arc=7, step=8, ogee=9`.
- Regenerate `docs/primitives/README.md`'s "Implemented" table to include all six new
  primitives, removing the now-empty "Candidates" section.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `shape-rendering`: the "Starter primitive set" requirement's list of primitives grows from 4
  to 10, each new primitive's exact geometry gets its own scenario.

## Impact

- `src/core/primitives/circle.ts`, `wedge.ts`, `cap.ts`, `pinwheel-arc.ts`, `step.ts`, `ogee.ts`
  (new files)
- `src/core/primitives/index.ts` (export the six new primitives)
- `src/core/registry.ts` (append 6 entries)
- `test/core/primitives/` (new test files per primitive) and `test/core/registry.test.ts`
  (extend pinned-index assertions)
- `docs/primitives/README.md` (move all six candidates into "Implemented", regenerate their
  SVGs from real code instead of hand-sketched geometry)
- No change to the public API surface (`encodeShapeId`, `decodeShapeId`, `renderShape`,
  `generateShapeDef`, `generateShapeId`) — existing shape IDs referencing indices 0–3 continue
  to decode identically; the seeded generator can now pick indices 0–9, some of which will
  naturally produce version-2 IDs per `bitshaper-id-format-v2`.
