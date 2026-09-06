# BitShaper — New Primitives (Change C)

Date: 2026-09-07
Branch: `core-new-primitives`
Status: design, pending review

## Goal

Add new grid-cell primitives derived from the five reference screenshots in
`samples/new 4/`, then curate example shapes that use them into the library
catalog. This is Change C of the planned series (Changes A and B, web UX, are
merged on `main`).

## Sample analysis (primitives-analyzer)

Each screenshot was viewed and described first in terms of the 14 existing
primitives (`empty, fill, fillet, bulge, circle, wedge, cap, pinwheel-arc,
step, ogee, round-corner, arc-band, diagonal-band, leaf`), then for genuinely
new motifs.

| # | File | Inferred grid | Explanation |
|---|------|---------------|-------------|
| 1 | `...23.23.53.png` | ~5×6 square cells | Field of 45° squares (points touching edge midpoints) with matching negative diamonds. `fill` only rotates in 90° steps, so a square-on-point is not expressible today → **`diamond`**. |
| 2 | `...23.24.05.png` | ~1×10 rows | Offset horizontal stripes. A centered axis-aligned band; `fill`/`empty` at a finer row subgrid only give edge-flush bands, not a centered one → **`bar`**. Close in spirit to `step` (the user's note) but `step` is a dogleg diagonal cut, not a band. |
| 3 | `...23.27.12.png` | ~3×3 | Isometric cube blocks (63BITS-style mark). `wedge` + `diagonal-band` approximate the faces; the crisp rhombic faces want a full-cell sheared quad → **`parallelogram`**. Partly bespoke (true isometric is 30°, not grid-aligned) — treated as an evocation, not a pixel match. |
| 4 | `...23.28.33.png` | ~2×4 | Slanted solid bar rows. Reinforces **`parallelogram`** (a thicker, full-height sheared quad rather than `diagonal-band`'s half-width band). |
| 5 | `...23.28.58.png` | 2×2 | Circular 4-lobe emblem with a small centered diamond. Lobes = `cap` (existing). Center = **`diamond`** (surrounding empty cells form the "hole"; no invert-as-complement needed). |

Weakly-evidenced motif kept in scope at the user's request:

- **`gable`** — a triangle with its base on one cell edge and apex at the
  opposite edge's midpoint (the straight-line sibling of `cap`; two
  back-to-back form a `diamond`). Not clearly isolated in any single sample,
  but a natural companion to `diamond`/`cap` and useful for faceted marks.

Nothing in the five samples is left unexplained beyond the acknowledged
"isometric cube is an evocation" caveat on #3.

## Decision

Add **four** new primitives, appended to the registry at indices **14–17**:
`diamond`, `parallelogram`, `bar`, `gable`.

The ID format is already v2 (2 chars/cell), so there is no 8-primitive
ceiling concern — appending is safe. The registry and
`src/core/primitives/index.ts` are append-only; new entries go at the end,
nothing is reordered.

## Primitive geometry

All four implement `PrimitivePathBuilder`:
`(cellSize, rotation, invert) => PathSegment[]`. They build local corner
coordinates in `[0, cellSize]²` (origin top-left, y down) and map every
segment through `transformPathSegment(segment, cellSize, rotation, invert)`.
They emit straight-line commands only (`M`/`L`/`Z`, no `A`) and never an SVG
`transform=`. Model file: `src/core/primitives/bulge.ts`.

Symmetric primitives still accept and apply the transform — the no-op simply
falls out of the arithmetic, matching how `circle` already behaves. Invert is
applied before rotation (per core design).

### `diamond` (index 14)

Square rotated 45°, vertices at the four edge midpoints.

```
M(cs/2, 0) L(cs, cs/2) L(cs/2, cs) L(0, cs/2) Z
```

- Rotation: 90° steps map the shape onto itself (visually a no-op), but
  coordinates are still transformed for API consistency.
- Invert: horizontal mirror — also a visual no-op (shape is symmetric about
  the vertical axis).

### `parallelogram` (index 15)

Full-cell-height quadrilateral, top edge sheared right by `cs/2`. At
rotation 0 / invert false it slants like a forward slash.

```
M(cs/2, 0) L(cs, 0) L(cs/2, cs) L(0, cs) Z
```

- Rotation 90°: mirrored shear axis (slant runs the other diagonal). Two
  adjacent cells at complementary rotations read as a cube corner.
- Invert: horizontal mirror → backslash slant. This is the one new
  primitive with a geometrically meaningful invert.

### `bar` (index 16)

Centered horizontal band, full width, thickness `cs/2` (band spans
`y ∈ [cs/4, 3cs/4]`).

```
M(0, cs/4) L(cs, cs/4) L(cs, 3cs/4) L(0, 3cs/4) Z
```

- Rotation 90°/270°: vertical bar.
- Invert: horizontal mirror — visual no-op (symmetric).

### `gable` (index 17)

Triangle, base on the bottom edge, apex at the top-edge midpoint (points up
at rotation 0).

```
M(0, cs) L(cs, cs) L(cs/2, 0) Z
```

- Rotation: 90° steps point the apex at the other edge midpoints.
- Invert: horizontal mirror — visual no-op (symmetric about the vertical
  axis).

## Adjacency (edge signatures)

Good-neighbour pairs across a shared cell boundary, derived from each
primitive's edge signature (boundary type + fill side), for the
rotations/inverts the samples actually use:

| Primitive A (rot/invert) | Shared edge | Primitive B (rot/invert) | Verdict | Why |
|---|---|---|---|---|
| `diamond` 0° | right↔left | `diamond` 0° | good — continuous | vertices meet at the shared edge midpoint; forms the sample-1 lattice, negative space is also diamonds |
| `diamond` 0° | right↔left | `fill` 0° | bad | diamond's cut corners leave triangular gaps against a full edge (irregular, once) |
| `parallelogram` 0° | right↔left | `parallelogram` 0° | good — continuous | sheared edge exits at `(cs, cs/2)`-ish and the next cell's enters at the matching point; unbroken slanted ribbon |
| `parallelogram` 0° | right↔left | `parallelogram` 0° invert | bad | forward slash meets backslash → V-notch seam (single mismatch, not a rhythm) |
| `parallelogram` 0° | bottom↔top | `parallelogram` 0° | good — continuous | vertical side edges are straight-through, fill side matches |
| `bar` 0° | top↔bottom | `bar` 0° | good — alternation | band / gap / band is the intended stripe rhythm, repeats every row (sample 2) |
| `bar` 0° | right↔left | `bar` 0° | good — continuous | band is full-width, edge is straight-through with matching fill |
| `bar` 0° | right↔left | `bar` 90° | good — continuous | plaid crossing — both cover the shared edge's central half |
| `gable` 0° | bottom↔top | `gable` 180° | good — continuous | two triangles share the base line and together tile a `diamond` |
| `gable` 0° | right↔left | `gable` 0° | bad | apex-at-midpoint vs base leaves an alternating gap that doesn't repeat cleanly at this pairing |
| `gable` 90° | right↔left | `gable` 270° | good — continuous | apexes meet on the shared edge midpoint, mirror of the diamond case |

## Catalog additions

Add 4–6 curated entries to `src/library/catalog.json` (`{id, name, tags}`),
each using at least one new primitive, e.g.:

- **Diamond Lattice** — grid of `diamond` (sample 1).
- **Cube Corner** — `parallelogram` at complementary rotations + `wedge`
  (sample 3).
- **Ribbon Rows** — `parallelogram` rows (sample 4).
- **Stripe Weave** / **Plaid** — `bar` horizontal + vertical (sample 2).
- **Faceted Bloom** — `gable` + `diamond` rosette.
- **Lobed Emblem** — `cap` lobes around a `diamond` center (sample 5).

IDs are generated with a throwaway script that imports `encodeShapeId` /
`generateShapeId` from the built package (`npm run build` first), or by hand
via the codec. Every catalog id must decode and render —
`test/library/index.test.ts` ("catalog entries are all renderable")
enforces this and is run before the PR.

## Test plan

Per primitive, `test/core/primitives/<name>.test.ts` (mirror
`wedge.test.ts`):

- exact segment output at rotation 0 / invert false,
- path is closed (`.at(-1)` is `{ command: "Z" }`),
- no `A` segments,
- rotation 90° moves the expected anchor point,
- invert behaviour (moved anchor for `parallelogram`; unchanged/among-same
  set for the symmetric three).

`test/core/registry.test.ts`:

- `pins diamond at index 14`, `pins parallelogram at index 15`,
  `pins bar at index 16`, `pins gable at index 17`,
- update the "contains exactly the fourteen registered primitives" test to
  eighteen and extend the name array,
- existing `getPrimitiveByIndex` / `listPrimitives` assertions still pass
  unchanged.

## Docs

Update `docs/architecture.md`'s primitive list / directory map to include the
four new files. Update `docs/primitive-survey.md` with a short addendum
noting the `samples/new 4/` pass and its four additions.

## Verification before PR

- `npm test` — all green
- `npx biome check .` — clean
- `npm run build` — ok

Then push and open a PR titled
**"Change C: new primitives + curated examples"**. Do not merge.

## Rejected alternatives

- **Treat sample 2 as `fill`/`empty` at a finer grid** — rejected: gives
  edge-flush bands, not the centered band the sample shows; `bar` is a
  distinct, highly tileable primitive (stripes, plaid).
- **Treat sample 4 as `diagonal-band` at a larger width ratio** — rejected:
  `diagonal-band` is a half-width sheared *band* leaving triangular gaps;
  the sample's blocks are full-height sheared quads. `parallelogram` also
  serves sample 3.
- **`diamond` invert = complement (the hole)** — rejected: invert means
  horizontal mirror everywhere else in the codec; the "hole" comes from
  surrounding `empty` cells, consistent with how sample 1 and sample 5 read.
- **Only 2 new primitives (`diamond` + `parallelogram`)** — considered;
  user chose to also add `bar` and `gable` to hit the 3–4 target and round
  out the faceted/striped motif family.
