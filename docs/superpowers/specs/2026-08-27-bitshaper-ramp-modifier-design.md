# BitShaper — Ramp Modifier (parametric transform across the grid)

**Date:** 2026-08-27
**Status:** design approved, pending implementation plan
**Origin:** `docs/primitive-survey-63.md` — the `samples/63/` icon set is a *morphing-grid*
family (one shape parametrically interpolated across a grid: ellipse width, triangle size,
diamond aspect, shear, arc flattening). BitShaper's fully-discrete per-cell model
(`type × rotation ∈ {0,90,180,270} × invert`) cannot express any of it — every primitive is
drawn at exactly `cellSize` with hardcoded internal ratios, and there is no continuous
parameter anywhere in the system. This is the "gap" that survey recorded. Option B from the
follow-up discussion — a whole-shape modifier channel that keeps cells discrete — is the design
below.

## Goals

- Add an **optional** `ramp` modifier to a `ShapeDef` that varies a continuous per-cell
  transform (non-uniform scale and/or rotation-angle offset) as a function of the cell's grid
  position.
- Keep every existing ID byte-identical. A ramp is a pure add-on: a `~`-delimited suffix on the
  ID, with its own checksum, no version bump.
- Keep cells discrete. The ramp does not touch the cell payload, the registry, or any primitive.
- Render statically: `renderShape` still emits one SVG. The "morph" is spatial — the grid is
  the sequence of frames laid out in space. No animation, no timeline.

## Non-Goals (YAGNI)

- `generateShapeDef` / `generateShapeId` emitting ramps — the generator is unchanged; ramps are
  authored explicitly (and, later, via the web app).
- Web-app UI for ramps — a separate follow-up change.
- Per-track axis or curve — all tracks in a ramp share one axis and one curve.
- Translate / skew tracks; radial ramp from an arbitrary point (center only).
- Animation / multi-frame export — a ramped ID renders one frozen spatial layout.
- Exact elliptical-arc output under non-uniform scale + rotation — v1 flattens arcs to
  polylines when a ramp is present (see Render).

## Concept

A **ramp** has:

- one **axis** — how a cell's position maps to a scalar `t`:
  - `column` → `col / (cols − 1)`
  - `row` → `row / (rows − 1)`
  - `diagonal` → `(col + row) / (cols + rows − 2)`
  - `radial` → `distance(cellCenter, gridCenter) / maxCellCenterDistance`
- one **curve** — how `t` is reshaped before use:
  - `linear` → `t`
  - `easeIn` → `t²`
  - `easeOut` → `1 − (1 − t)²`
  - `easeInOut` → `3t² − 2t³` (smoothstep)
  - `symmetric` → `1 − |2t − 1|` (0 at both edges, 1 at the middle — the "v")
- **1–4 tracks**, each `{ param, from, to }` with `param ∈ {scale, scaleX, scaleY, angle}`, each
  unique. Every track interpolates its own `param` linearly between `from` and `to` using the
  shared, curved `t`.

Per cell, the resolved transform is: `scaleX`, `scaleY` (a `scale` track fills both; unspecified
axes stay `1`), and `angleDeg` (unspecified stays `0`). It is applied **about the cell center**,
**after** the existing discrete invert + rotation, **before** the grid offset. `empty` cells
emit nothing and are unaffected.

Degenerate-input guards: whenever an axis's denominator would be `0` (`column` on `cols === 1`,
`row` on `rows === 1`, `diagonal` or `radial` on a 1×1 grid), that axis yields `t = 0` for
every cell.

## Encoding

The ID gains an optional trailing block. The parser regex becomes:

```
/^BS(2)?-([1-9]\d*)X([1-9]\d*)-([0-9A-Za-z]+)(~[0-9A-Za-z]+)?$/
```

`~` is not in the base62 class, so the greedy cell-payload group stops at the `~` on its own;
the cell payload + its checksum are still exactly `width × cols × rows + width` characters, so
the split is unambiguous.

### Ramp block grammar

All characters are base62 (`0-9A-Za-z`), index 0–61.

```
~ {axis}{curve}{trackCount}  ({param}{from}{to}){trackCount}  {checksum}
```

| Field        | Chars | Encoding |
|--------------|-------|----------|
| `axis`       | 1     | `0`=column `1`=row `2`=diagonal `3`=radial |
| `curve`      | 1     | `0`=linear `1`=easeIn `2`=easeOut `3`=easeInOut `4`=symmetric |
| `trackCount` | 1     | base62 index `1`–`4` |
| `param`      | 1     | `0`=scale `1`=scaleX `2`=scaleY `3`=angle |
| `from`,`to`  | 1 ea. | quantized endpoint index, 0–61 |
| `checksum`   | 1     | `(sum of every preceding ramp-block character's base62 index) mod 62` |

One track ⇒ `~` + 3 + 3 + 1 = **8 characters**; each extra track **+3**.

`scale` is mutually exclusive with `scaleX` / `scaleY` within one ramp — a `Ramp` containing
both is rejected (`encodeShapeId` throws `invalid-shape-def`; a decoded block with both throws
`bad-ramp-block`). Every track's `param` must be distinct.

### Quantization

| Param | Index → value | Identity index | Range | Step |
|---|---|---|---|---|
| `scale` / `scaleX` / `scaleY` | `index / 31` | 31 → `1.0` | `0 … 1.968` | `1/31 ≈ 0.032` |
| `angle` | `(index − 31) × (90 / 31)` | 31 → `0°` | `−90° … +90°` | `90/31 ≈ 2.9°` |

`encodeRampBlock` snaps each `from`/`to` real value to the nearest index before emitting;
`decodeRampBlock` returns the exact grid value for that index. Round-trip
`encode(decode(id)) === id` therefore holds for any ID this codec produces. A `ShapeDef`
authored with off-grid values (e.g. `scale: 0.5001`) encodes to the nearest grid ID and decodes
back to the grid value — documented, same contract as any lossy-on-input quantizer.

### Canonical form

- Tracks are emitted sorted ascending by `param` index.
- A track whose `from` and `to` both quantize to the identity index is dropped.
- A ramp with zero surviving tracks omits the entire `~` block (the ID is then a plain base ID).

This makes the encoding canonical: two `Ramp` values describing the same per-cell transform
produce the same ID.

### Errors

`decodeShapeId` throws `ShapeIdError` with a **new code `bad-ramp-block`** when a `~` block is
present but malformed: wrong length for its `trackCount`, out-of-range field, duplicate `param`,
`trackCount` outside 1–4, or checksum mismatch. A ramp is never silently dropped or best-guessed.

### Example

`samples/63` #1 — 4×4 `circle` grid, ellipse width `~0.16 → ~1.97` across columns, linear:

- base: `BS2-4X4-{16 cells}{checksum}`
- ramp chars: axis `column` → `0`; curve `linear` → `0`; `trackCount` 1 → `1`; track = `scaleX`
  → `1`, `from` index 5 (`5/31 ≈ 0.161`) → `5`, `to` index 61 (`61/31 ≈ 1.968`) → `z`
- checksum: `(0 + 0 + 1 + 1 + 5 + 61) mod 62 = 68 mod 62 = 6` → `6`
- suffix: `~00115z6`  (8 chars)
- full: `BS2-4X4-{cells}{cksum}~00115z6`

## Rendering

### New module `src/core/ramp.ts` (pure, no SVG)

- `rampParameterAt(axis, curve, col, row, cols, rows): number` — raw axis position → curve
  reshape → `t ∈ [0, 1]`, with the degenerate guards above.
- `resolveCellTransform(ramp, col, row, cols, rows): { scaleX: number; scaleY: number; angleDeg: number }`
  — computes `t` once, then folds every track in: `lerp(track.from, track.to, t)`; `scale` sets
  both scale axes, `scaleX`/`scaleY` set one each, `angle` sets `angleDeg`; unset fields are
  identity.
- `encodeRampBlock(ramp): string` / `decodeRampBlock(block: string): Ramp` — grammar,
  quantization, checksum, canonicalization. Kept here (not in `id.ts`) so `id.ts` stays focused
  on the cell payload.

### `src/core/render.ts`

`renderShape` passes the decoded `shape.ramp` (if any) into the per-cell path builder. In
`cellToPathFragment`, when a ramp is present, one step is inserted:

1. primitive emits local `[0, cellSize]²` segments — unchanged
2. `transformPathSegment` applies discrete invert + rotation about the cell center — unchanged
3. **new:** `applyRampTransform(segments, { scaleX, scaleY, angleDeg }, cellCenter)` where
   `cellCenter = cellSize / 2`. Builds the 2×2 matrix `M = R(angleDeg) · diag(scaleX, scaleY)`;
   for every point `p`, output `M · (p − cellCenter) + cellCenter`.
4. grid offset added — unchanged

Unramped shapes never enter step 3 and their output is byte-for-byte what it is today.

### Arc handling — flatten when ramped

A non-uniform scale followed by a rotation turns a circular `A` arc into a rotated ellipse;
emitting a correct `A rx ry xAxisRotation …` for that requires eigen-decomposition of `M`. For
v1, `applyRampTransform` instead **samples each `A` segment into a polyline** — 24 line segments
per quarter-turn of sweep — and passes each sampled point through `M`. Ramped shapes are a morph
aesthetic, not a fidelity reproduction; at 24 seg/quarter the polyline is visually
indistinguishable from the arc, and this makes the transform trivially correct for any `M`.
Non-ramped rendering still emits clean `A` commands. Exact elliptical-arc output is a documented
future refinement.

## API & types

### `src/core/types.ts`

```ts
export type RampAxis = "column" | "row" | "diagonal" | "radial";
export type RampCurve = "linear" | "easeIn" | "easeOut" | "easeInOut" | "symmetric";
export type RampParam = "scale" | "scaleX" | "scaleY" | "angle";

export interface RampTrack {
  readonly param: RampParam;
  /** Real value. scale ~0..1.968 (1 = identity); angle degrees ~-90..90 (0 = identity).
   *  Snapped to the encoding's quantization grid by encodeShapeId. */
  readonly from: number;
  readonly to: number;
}

export interface Ramp {
  readonly axis: RampAxis;
  readonly curve: RampCurve;
  /** 1–4 tracks, each a distinct param. */
  readonly tracks: readonly RampTrack[];
}

export interface ShapeDef {
  readonly cols: number;
  readonly rows: number;
  readonly cells: readonly CellDef[];
  readonly ramp?: Ramp; // NEW — optional
}
```

### `src/core/id.ts`

- `encodeShapeId(shape)` — after building the base ID, if `shape.ramp` has surviving tracks,
  append `"~" + encodeRampBlock(shape.ramp)`.
- `decodeShapeId(id)` — regex splits the optional `~…` group; when present, set
  `shape.ramp = decodeRampBlock(block)` (throws `bad-ramp-block` on failure). When absent,
  `shape.ramp` is `undefined`.
- New `ShapeIdError` code: `"bad-ramp-block"`.
- Round-trip guarantee unchanged: `encodeShapeId(decodeShapeId(id)) === id`.

### `src/core/render.ts`

- New helper `applyRampTransform(segments, transform, center)`.
- `renderShape` signature unchanged.

### `src/core/index.ts`

- Export `Ramp`, `RampTrack`, `RampAxis`, `RampCurve`, `RampParam`.
- Re-export `rampParameterAt` and `resolveCellTransform` for consumers (e.g. a future web-app
  preview) — optional, low cost.
- `encodeShapeId` / `decodeShapeId` / `renderShape` signatures unchanged.

### Unchanged

`src/core/registry.ts`, all 14 primitives, `src/core/random.ts`,
`generateShapeDef` / `generateShapeId`, `src/cli/`, `web/`.

## Testing

### `test/core/ramp.test.ts` (new)

- `rampParameterAt`: `t = 0` at the first column / `t = 1` at the last; midpoint; each curve's
  shape (`easeIn` convex below `linear`, `symmetric` = 0 at both edges and 1 at the middle,
  `easeInOut` symmetric about 0.5); `cols === 1` and `rows === 1` guards; `radial` center cell
  = 0, corner = 1.
- `resolveCellTransform`: a `scale` track fills both scale axes; unspecified params stay
  identity; multi-track composition (`scaleX` + `angle` together).
- `encodeRampBlock` / `decodeRampBlock`: round-trip; quantization snapping (`from: 1.0` →
  index 31 → `1.0`, `from: 0.5001` → nearest index); checksum rejection; identity-only track
  dropped; tracks sorted by `param` on output; `trackCount` 0 ⇒ no block.

### `test/core/id.test.ts` (extend)

- An ID with a ramp round-trips `encodeShapeId(decodeShapeId(id)) === id`.
- A base ID (no ramp) is byte-identical to the current codec's output (regression guard).
- A `~` block with a bad checksum → `ShapeIdError` code `bad-ramp-block`.
- A non-canonical authored `Ramp` (unsorted tracks, an identity track) → canonical ID.
- A `~` block whose length doesn't match its `trackCount` → `bad-ramp-block`.

### `test/core/render.test.ts` (extend)

- A ramped shape renders syntactically valid SVG.
- Ramped output contains no `A` commands (arcs flattened); the same shape without a ramp still
  contains `A`.
- A `scale` track at its `t = 0` end shrinks a `fill` cell toward its center — rendered bbox is
  smaller and stays centered in the cell.
- An `angle` track rotates a `fill` cell (a non-axis-aligned edge appears).
- `empty` cells emit nothing under a ramp.
- Snapshot: a fixed `samples/63`-style ID (4×4 `circle` + `scaleX` column ramp) renders to a
  stable path string.

No pixel-verification against `samples/63/` — those are parametric references BitShaper can
only approximate; the tests assert the transform math, not sample fidelity.

## OpenSpec change

`openspec/changes/bitshaper-ramp-modifier/`:

- `proposal.md` — why (the gap), what (optional ramp modifier), impact.
- `design.md` — condensed form of this document.
- `specs/shape-id-codec/spec.md` — delta: the `~` ramp-block grammar, quantization, canonical
  form, `bad-ramp-block` error, round-trip guarantee extended to ramped IDs.
- `specs/shape-rendering/spec.md` — delta: optional per-cell ramp transform (scale + angle about
  the cell center, after discrete rotation/invert), arc flattening when a ramp is present.
- `tasks.md` — the checklist.
