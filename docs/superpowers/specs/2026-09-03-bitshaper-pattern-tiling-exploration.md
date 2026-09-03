# BitShaper — Seamless Pattern Tiling (Phase 5 exploration)

**Date:** 2026-09-03
**Status:** exploration / decision document. The §4 MVP was subsequently implemented directly
in `src/core/tiling.ts` + `renderShape`'s `tile` option (owner said "skip openspec, just do
it"); this doc now doubles as the design record for that code. §1–§3 recommendations held; §4's
generator strategy changed during implementation (see the note there).
**Mandate:** `docs/superpowers/specs/2026-08-24-bitshaper-roadmap-design.md` §"Phase 5 — Seamless
pattern tiling (exploration)", which requires "its own design spike before any implementation"
and explicitly keeps tiling out of the Phase 1–3 data model.

## Framing decisions (settled with the project owner before drafting)

1. **Target = true wallpaper.** The pattern must fill an infinite plane: the repeat unit's right
   edge continues into its own left edge, and its bottom edge into its own top edge. This needs
   a real edge-matching model across the *wrap* seam, not merely clean interior cell joins.
   (The three `samples/patterns/*.svg` files turned out to be single composed marks, not proven
   infinite repeats, so they set the aesthetic target, not the technical contract.)
2. **Output = a recommendation per open question**, with rejected alternatives recorded. Still a
   decision doc, not a spec.
3. **Scope = wallpaper group p1 only** — repetition by pure translation of one rectangular unit.
   Reflected/rotated wallpaper groups (pmm, p4, p4m, …) are a non-goal for this exploration.

## What the current model can already express (baseline)

- A shape is a `cols × rows` grid; each cell is one primitive (registry index 0–13) at one of
  four rotations, optionally mirrored. Primitives emit path segments in a local
  `[0, cellSize]²` frame; `render.ts` translates each cell by its grid offset and concatenates
  every cell into one `<path>` inside one `<svg>` (default 256×256). No SVG `transform=`.
- Every primitive is corner-anchored and sized to `cellSize` with fixed internal ratios. There
  is no continuous per-cell parameter (that is what the separate `ramp` modifier adds, and it
  does not interact with tiling).
- The primitive surveys already contain informal *adjacency / edge-signature* analysis
  (`docs/primitive-survey.md`, `docs/primitive-survey-screens2.md`): e.g. `wedge` at a uniform
  rotation tiles into unbroken diagonal bands (shape-sample-18), a 2×2 `wedge` pinwheel tiles
  (shape-sample-14), 4-rotation `fillet` meets tangentially at a shared centre (shape-sample-6),
  `pinwheel-arc` likewise (shape-sample-19). **Existing primitives demonstrably tile.** The gap
  Phase 5 fills is *tooling to validate and generate* tileable grids — not new geometry.

---

## Open question 1 — Edge-matching model

**Recommendation: a *derived* discrete edge-profile descriptor, computed from each primitive's
own emitted geometry. No tiling-aware primitive set. No hand-authored edge-type annotation in
the registry.**

### The descriptor

Because every primitive is corner-anchored with radius `cellSize` or a simple fraction, the way
it meets any one of its four edges collapses to a tiny alphabet of *edge profiles* — the
run-length-encoded set of filled sub-intervals along that edge, quantized to eighths:

| Profile   | Meaning along the edge (coordinate 0 → 1)                    |
|-----------|------------------------------------------------------------|
| `EMPTY`   | nothing filled                                             |
| `FULL`    | filled across the whole edge                               |
| `HALF@0`  | filled `[0, 0.5]`, empty `[0.5, 1]`                        |
| `HALF@1`  | filled `[0.5, 1]`                                          |
| `MID`     | filled `[0.25, 0.75]` (a centred band — e.g. `cap`, `ogee`) |
| `POINT`   | contact at a single corner only (measure-zero)             |

Worked examples (rotation 0, invert false):

| Primitive        | N        | E        | S        | W        |
|------------------|----------|----------|----------|----------|
| `fill`           | `FULL`   | `FULL`   | `FULL`   | `FULL`   |
| `empty`          | `EMPTY`  | `EMPTY`  | `EMPTY`  | `EMPTY`  |
| `fillet` (concave corner cut) | `EMPTY` | `FULL` | `FULL` | `EMPTY` |
| `bulge` (convex corner disc)  | `FULL`  | `POINT`| `POINT`| `FULL`  |
| `wedge` (TL→BR diagonal)      | `FULL`  | `FULL` | `POINT`| `POINT` |
| `diagonal-band` (½-width)     | `HALF@0`| `HALF@1`| `HALF@1`| `HALF@0` |

`fillet` and `bulge` are exact edge-complements — which is why a `fillet` cell above a `bulge`
cell (or the reverse) joins cleanly, and why 4-rotation rosettes of either one tile.

### The module

New pure module `src/core/tiling.ts` (no SVG, no CLI/library imports — same rules as
`src/core/primitives/`):

- `edgeProfile(typeIndex, rotation, invert, edge): EdgeProfile`
  Sample the primitive's *already-emitted* path segments (from `PRIMITIVE_REGISTRY[i].build(...)`)
  at N points along the requested edge, test point-in-fill membership, run-length-encode into
  eighth-quantized intervals, classify against the alphabet above.
- `edgesCompatible(a: EdgeProfile, b: EdgeProfile): boolean`
  `a` reversed (coordinate flip, since the shared edge runs opposite directions in the two
  cells' local frames) equals `b`.

### Two grades of "match" — v1 targets the weaker one

- **C1 — coverage match.** Filled/empty intervals agree across the seam. Guarantees no white
  cracks and no overlap. For a flat monochrome pattern this *is* what "seamless" means.
  **← v1 target.**
- **C2 — tangent match.** Additionally, the boundary curve crosses the seam with continuous
  slope, so two arcs meeting at the seam show no visible kink. Strictly stronger. Documented as
  a later refinement. Curved primitives that cross an edge mid-span (`pinwheel-arc`, `ogee`,
  `step`, `cap`) either satisfy C1 against a specific partner or are **excluded from tileable
  generation** in v1 (they can still appear in a hand-authored tileable grid that happens to
  pass `isTileable`).

### Rejected alternatives

- **A separate tiling-aware primitive set.** Rejected. It fragments the append-only registry
  into "mark primitives" and "tile primitives", and the surveys already show the existing
  primitives tile. The registry's append-only constraint also means a retrofit is impossible —
  you would only ever be *adding* tiling primitives at the end, never reconciling them with the
  first 14. The problem is a missing predicate, not missing shapes.
- **A Wang-tile edge-type enum baked into each `PrimitiveDefinition`** (`{ north: 3, east: 1, … }`).
  Rejected as the *primary* model: it is redundant with geometry (derivable by sampling) and is
  a hand-maintained annotation that can silently drift from the actual path when a primitive's
  ratios are tuned. A *derived-and-cached* signature table, checked in as a generated test
  fixture and regenerated from `edgeProfile`, is a fine performance optimization and a good
  regression guard — but it is an artifact of the derivation, not the source of truth.

---

## Open question 2 — ID format

**Recommendation: no format change. Tileability is a derived property of the existing cell
payload, not data the ID carries.**

For wallpaper group p1, "this grid tiles" is a checkable property of the cells — structurally
the same kind of statement as "this shape is left–right symmetric." If the cells are chosen so
the wrap seams are edge-compatible, then `BS-{cols}X{rows}-{payload}{checksum}` (or its `BS2`
widening) already describes the pattern completely. Whether to *render* it as an infinite repeat
or as a single framed mark is a `renderShape` option, not a bit in the ID.

| Option | Verdict |
|---|---|
| **(A) No format change.** ID is byte-identical whether rendered as a mark or a tile; `renderShape(id, { tile: true })` wraps the output in `<pattern>`. | **Recommended.** |
| **(B) A `~`-style trailing block** (à la the `ramp` modifier's `~…` suffix), e.g. a `%…` tiling block. | Rejected for v1. There is no metadata to put in it: the repeat unit is always the whole grid, and every edge constraint is derivable from the payload. A payload-free block is pure ceremony and a new codec surface for zero information. |
| **(C) A separate `BT-…` tiling format.** | Rejected. A tile *is* a `cols × rows` grid of cells and reuses 100% of the codec. A parallel format doubles the codec's surface area for no geometric difference. |

### Deliberate finding to carry forward (mirroring how BS2 was handled)

Two extensions *would* carry genuinely new data and therefore *would* justify a format change —
but only if and when they are actually wanted:

- **Offset tilings** — half-drop, brick-bond, arbitrary drop fraction. New data: an offset
  fraction and a drop axis.
- **Sub-unit repeats** — the repeating tile is a `k × k` sub-block of a larger authored grid.
  New data: the sub-block extent.

Either of those should get its own OpenSpec change with its own suffix-block (exactly as the
`ramp` modifier got `~` and the ID v2 widening got its own change
`openspec/changes/archive/2026-08-25-bitshaper-id-format-v2/`). **This exploration explicitly
does not build them and does not reserve syntax for them.** Flagging them here is the deliberate
"decide later" mirror of BS2's fast-follow note — not a commitment.

---

## Open question 3 — Data model

**Recommendation: a "pattern" is a `ShapeDef`, unchanged. Tileability is an opt-in filter
enforced at generation/validation time, never a stored field.**

- `isTileable(shape: ShapeDef): boolean` — pure, in `src/core/tiling.ts`. Returns true iff:
  - every interior vertical seam (col `c` east edge vs col `c+1` west edge) is `edgesCompatible`
    for every row, and
  - every interior horizontal seam (row `r` south edge vs row `r+1` north edge) is compatible
    for every column, and
  - **the wrap seams** are compatible: last column's east edge ↔ first column's west edge (per
    row), and last row's south edge ↔ first row's north edge (per column).
  All under C1.
- `generateTileableShapeId(seed, opts): string` — only ever returns IDs whose `ShapeDef`
  satisfies `isTileable`.
- Rendering intent (`tile: true`) lives on `RenderShapeOptions`, never on `ShapeDef`.

Not every mark is tileable, and we do not coerce arbitrary marks into tiling. Tileability is a
*filter on the generation space* — directly analogous to how the planned image-trace feature
(Phase 7) filters per-cell candidates by IoU rather than changing the data model.

### Rejected alternative

- **A distinct `PatternDef` type** with fields like `repeatMode`, `gutter`, `unitCols`. Rejected
  as YAGNI: for p1 wallpaper every one of those fields is either derivable (`repeatMode` is
  always "grid") or unneeded (no gutters, unit = whole grid). It would be justified only by the
  offset/sub-unit extensions in §2 — same trigger, same "decide later" posture.

---

## Open question 4 — Minimum viable first slice

**"Edge-neutral generation + `<pattern>` wrapping."** Four pieces, all additive:

1. **`src/core/tiling.ts`** — `edgeProfile()`, `edgesCompatible()`, `isTileable()`. Pure,
   dependency-free within `src/core/`.
2. **`renderShape(id, { tile: true, tileSize? })`** — when `tile` is set, wrap the existing
   single `<path>` in `<pattern patternUnits="userSpaceOnUse" width=… height=…>` and paint a
   `<rect>` filled with `url(#…)`, producing an SVG that is an infinite repeating fill. The
   current render path is byte-for-byte unchanged when the option is absent (same guarantee the
   `ramp` work kept). `tileSize` defaults to the shape's natural rendered extent.
3. **`generateTileableShapeId` / `generateTileableShapeDef(seed, { cols, rows })`** —
   **implementation note:** rejection sampling over arbitrary random grids was tried first and
   abandoned (strict C1 makes a random 14-primitive grid almost never tile). Two generations
   then shipped:
   - *v1 — uniform.* Fill the grid with one seeded *self-tiling* placement (`(type, rotation,
     invert)` whose own north==south, east==west). Always works; only ever uniform grids.
   - *v2 — constructive backtracking (current).* Place cells row-major; each cell's candidates
     are the placements matching the left neighbour's east and the upper neighbour's south,
     plus (last column) an east match to column 0's west and (last row) a south match to row
     0's north — the wrap seams. Seeded-shuffled candidate order, backtracking, node budget
     `200_000`; on exhaustion (tiny hostile grids only) it falls back to a uniform self-tiling
     grid. Produces varied grids that still tile. Still C1, still p1, still no format/registry
     change.

   **Finding:** a uniform `wedge` grid is *not* C1-tileable even though its diagonal cut lines
   up corner-to-corner — `wedge@0` fills its entire east edge and none of its west edge, so the
   *fill* is discontinuous at every vertical seam. C1 (coverage) is genuinely stricter than "the
   outline looks continuous"; several survey "adjacency: good" pairs are really C2 (tangent)
   observations, not C1. This is the concrete argument for prioritising the constructive solver
   and, eventually, C2.
4. **Tests** (`test/core/tiling.test.ts`, 15 cases, all passing):
   - `isTileable` true for uniform `fill` / `empty` / `circle` grids; false for a uniform
     `wedge` grid (the finding above), a mismatched-seam grid, and any ramped shape.
   - `edgeProfile` / `classifyEdgeProfile` for `fill` / `empty` / `fillet` / `bulge` match §1.
   - `renderShape(id, { tile: true })` returns valid SVG with exactly one `<pattern>`; is
     byte-identical to the default render when `tile` is absent; honours `tileSize`.
   - `generateTileableShapeId` is deterministic and its output always satisfies `isTileable`.

### Explicitly NOT in the MVP

C2 tangent continuity; a CSP / Wang-tile solver; offset / half-drop / brick-bond repeats;
sub-unit repeats; new tiling-specific primitives; wallpaper groups beyond p1; any CLI flag; any
web-app UI.

The roadmap's own hypothesized "boolean `tile: true` that just makes `renderShape` wrap in a
`<pattern>` and the generator only pick edge-neutral primitives" is essentially correct. The
spike's single refinement: `tile: true` needs a companion `isTileable` predicate *and* a
tileable generator, because `tile: true` on a grid that does not actually wrap renders a
pattern with visible seams — a silent footgun. The predicate makes tileability checkable; the
generator makes it reachable without hand-tuning.

---

## Open question 5 — Where it surfaces

Core-package-first, matching every prior phase and the roadmap's invariant sequencing.

1. **Core package** (the one OpenSpec change this exploration would seed):
   - `src/core/tiling.ts` — `edgeProfile`, `edgesCompatible`, `isTileable`.
   - `RenderShapeOptions.tile` + `tileSize` in `src/core/render.ts`.
   - `generateTileableShapeId` in `src/core/generate.ts`.
   - Public API additions in `src/core/index.ts`: `isTileable`, `generateTileableShapeId`,
     `EdgeProfile`, and the new render-option fields. No change to `encodeShapeId` /
     `decodeShapeId` signatures or behaviour. No registry change. No primitive change.
2. **CLI** (follow-up change): `bitshaper render <id> --tile [--tile-size N]`;
   `bitshaper generate --tileable`. Thin wrappers over the core additions.
3. **Web app** (follow-up change): a "tileable" toggle in the generator that restricts seeds to
   `generateTileableShapeId`, plus a **repeat-preview mode** — a 3×3 (or scroll-infinite) swatch
   distinct from the existing single-mark framed preview. Web-app tiling preview implication:
   the preview component gains a second layout mode; the export path gains "export as tile"
   (the `<pattern>` SVG, and optionally a raster swatch). Sequenced strictly after the core
   change; not a blocker for it.

No part of this forces a BS or BS2 format revision.

---

## Summary of recommendations

| # | Question | Recommendation |
|---|---|---|
| 1 | Edge-matching model | Derived discrete edge-profile descriptor from existing primitive geometry; C1 coverage-match for v1, C2 tangent-match deferred. No new primitive set, no hand-authored edge enum. |
| 2 | ID format | No change. Tileability is derived from the existing payload. Offset/sub-unit repeats, if ever wanted, get their own suffix-block change like `ramp` did. |
| 3 | Data model | `ShapeDef` unchanged. `isTileable` predicate + `generateTileableShapeId`; tileability is a generation-time filter, not a stored field. No `PatternDef`. |
| 4 | MVP slice | `src/core/tiling.ts` (`edgeProfile` / `edgesCompatible` / `isTileable`) + `renderShape({ tile: true })` `<pattern>` wrap + rejection-sampling `generateTileableShapeId` + tests. |
| 5 | Sequencing | Core package first (one additive change), then CLI flags, then web-app toggle + repeat-preview mode. |

## Status of the work / next steps

**Shipped** (`src/core/tiling.ts`, `src/core/render.ts`, `src/core/index.ts`): `edgeProfile`,
`classifyEdgeProfile`, `edgesCompatible`, `isTileable`, `generateTileableShapeDef` /
`generateTileableShapeId` (constructive backtracking solver with wrap constraints + uniform
fallback), `listSelfTilingPlacements`, and `RenderShapeOptions.tile` / `tileSize`. No ID-format
change, no registry change, no primitive change. Full suite green (395 tests), lint + build
clean.

**Not yet done** (candidate follow-ups, in priority order):
1. **CLI**: `bitshaper render <id> --tile [--tile-size N]`, `bitshaper generate --tileable`.
2. **Web app**: tileable toggle + a repeat-preview (3×3 / scroll-infinite) mode.
3. **C2 tangent-match** — refine `edgesCompatible` to also require slope continuity, unlocking
   the curved primitives for tiling.
4. **Solver quality** — candidate ordering / constraint propagation if the node budget is ever
   hit on realistic grids; a knob for primitive mix / density.
5. **Offset / sub-unit repeats** — only if wanted; these carry new data and would get their own
   suffix-block change, mirroring how `ramp` got `~` and ID v2 got its own change.
