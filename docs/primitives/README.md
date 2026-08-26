# Primitives Reference

Visual reference for BitShaper's grid-cell primitives — one shape per file, rendered at a single 1×1 cell, rotation 0, no invert.

This is a reference for the *building blocks* only. For target shapes we should eventually be able to reproduce by composing these on a grid, see `samples/svgs/` (72 reference marks) and `samples/screens2/` (20 raster marks).

## Implemented (registered in `src/core/registry.ts`)

Rendered directly from the real, tested code — not mockups.

| File | Registry index | Description |
|---|---|---|
| `empty.svg` | 0 | No path segments (blank cell). |
| `fill.svg` | 1 | A solid unit square. |
| `fillet.svg` | 2 | A concave quarter-circle corner cut (radius = cell size). |
| `bulge.svg` | 3 | A convex quarter-circle corner (radius = cell size). |
| `circle.svg` | 4 | Filled circle, centered, tangent to all four sides. |
| `wedge.svg` | 5 | Straight diagonal cut corner-to-corner (right triangle) — the straight-line sibling of `fillet`/`bulge`. |
| `cap.svg` | 6 | Single semicircular arc spanning one full cell edge (stadium end). |
| `pinwheel-arc.svg` | 7 | Smaller-radius fillet/bulge (0.78× cell), offset from the corner, leaving straight stub edges. |
| `step.svg` | 8 | Corner-to-corner cut like `wedge`, but the connecting edge is a diagonal-jog-diagonal polyline instead of one straight line. |
| `ogee.svg` | 9 | Horizontal S-curve band, built from two opposite-sweep arcs tangent to the left/right edges at their vertical midpoint. |

`circle`, `wedge`, `cap`, and `pinwheel-arc` were first surveyed from `samples/svgs/`
(`docs/primitive-survey.md`); `step` and `ogee` were first surveyed from `samples/screens2/`
(`docs/primitive-survey-screens2.md`). All six were implemented together in
`bitshaper-expand-primitives` (`openspec/changes/archive/2026-08-25-bitshaper-expand-primitives/`),
which depended on `bitshaper-id-format-v2` raising the registry ceiling from 8 to 480 types —
`step`/`ogee` (types 8/9) need format-version-2 shape IDs at some rotation/invert combinations.

See `docs/primitive-survey.md` and `docs/primitive-survey-screens2.md` for the full surveys
(all candidates considered, priority reasoning, and reference samples that don't decompose into
any repeating motif).
