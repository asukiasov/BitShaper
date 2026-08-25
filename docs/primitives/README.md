# Primitives Reference

Visual reference for BitShaper's grid-cell primitives — one shape per file, rendered at a single 1×1 cell, rotation 0, no invert.

This is a reference for the *building blocks* only. For target shapes we should eventually be able to reproduce by composing these on a grid, see `samples/svgs/` (72 reference marks).

## Implemented (registered in `src/core/registry.ts`)

Rendered directly from the real, tested code — not mockups.

| File | Registry index | Description |
|---|---|---|
| `empty.svg` | 0 | No path segments (blank cell). |
| `fill.svg` | 1 | A solid unit square. |
| `fillet.svg` | 2 | A concave quarter-circle corner cut (radius = cell size). |
| `bulge.svg` | 3 | A convex quarter-circle corner (radius = cell size). |

## Candidates (`*.CANDIDATE.svg`) — not yet implemented

Hand-sketched illustrative geometry from `docs/primitive-survey.md`'s survey of the 72 reference SVGs — proposed next primitives to fill the registry's remaining 4 slots (before the 8-type ID-format ceiling forces a format revision). **Not real code, not registered, not tested.** Exact ratios/anchoring are approximate and will be pinned down if/when each is actually implemented via an OpenSpec change.

| File | Reuse (of 72 samples) | Description |
|---|---|---|
| `circle.CANDIDATE.svg` | 16 | Filled circle, centered, tangent to all four sides. |
| `wedge.CANDIDATE.svg` | 13 | Straight diagonal cut corner-to-corner (right triangle) — the straight-line sibling of `fillet`/`bulge`. |
| `cap.CANDIDATE.svg` | 6 | Single semicircular arc spanning one full cell edge (stadium end). |
| `pinwheel-arc.CANDIDATE.svg` | 12 | Smaller-radius fillet/bulge (~0.78× cell), offset from the corner. |

See `docs/primitive-survey.md` for the full survey (all candidates considered, priority reasoning, and the 8 reference samples that don't decompose into any repeating motif).
