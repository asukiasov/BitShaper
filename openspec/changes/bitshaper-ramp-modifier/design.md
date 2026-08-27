## Context

Full design and rationale: `docs/superpowers/specs/2026-08-27-bitshaper-ramp-modifier-design.md`
(approved via brainstorming). This file is the condensed technical reference for implementation.

Constraints:
- Every existing shape ID must stay byte-identical. A ramp is a pure add-on.
- Cells stay discrete: the ramp touches neither the cell payload nor the registry nor any
  primitive.
- `renderShape` renders one static SVG; the "morph" is spatial across the grid.

## Goals / Non-Goals

**Goals:** optional `ShapeDef.ramp`; `~`-suffix encoding with own checksum, no version bump;
per-cell scale + angle transform about the cell center; `encode(decode(id)) === id` for ramped
IDs; loud `bad-ramp-block` on malformed blocks.

**Non-Goals:** generator emitting ramps; web-app UI; per-track axis/curve; translate/skew
tracks; radial ramp from a non-center point; animation/multi-frame export; exact elliptical-arc
output under non-uniform scale + rotation (v1 flattens arcs to polylines when ramped).

## Decisions

### Ramp model

`Ramp = { axis: RampAxis; curve: RampCurve; tracks: readonly RampTrack[] }`
`RampTrack = { param: RampParam; from: number; to: number }`

- `RampAxis`: `"column" | "row" | "diagonal" | "radial"`
- `RampCurve`: `"linear" | "easeIn" | "easeOut" | "easeInOut" | "symmetric"`
- `RampParam`: `"scale" | "scaleX" | "scaleY" | "angle"`
- 1–4 tracks, each `param` distinct; `scale` is mutually exclusive with `scaleX`/`scaleY`.
- `from`/`to` are real values (scale ≈ 0..1.968, `1` = identity; angle degrees ≈ −90..90, `0` =
  identity). `encodeShapeId` snaps them to the quantization grid.

### `rampParameterAt(axis, curve, col, row, cols, rows) → t ∈ [0,1]`

Raw axis position, then curve reshape:
- axis: `column` → `col/(cols−1)`; `row` → `row/(rows−1)`; `diagonal` →
  `(col+row)/(cols+rows−2)`; `radial` → `hypot(col−cx, row−cy) / maxHypot` where
  `cx=(cols−1)/2`, `cy=(rows−1)/2` and `maxHypot` is that distance from the grid center to a
  corner cell.
- degenerate guard: if the denominator is `0` (`column` on `cols===1`, `row` on `rows===1`,
  `diagonal`/`radial` on 1×1), `t = 0`.
- curve: `linear` `t`; `easeIn` `t²`; `easeOut` `1−(1−t)²`; `easeInOut` `3t²−2t³`;
  `symmetric` `1−|2t−1|`.

### `resolveCellTransform(ramp, col, row, cols, rows) → { scaleX, scaleY, angleDeg }`

Compute `t` once. Start `{ scaleX: 1, scaleY: 1, angleDeg: 0 }`. For each track,
`v = from + (to − from) · t`, then: `scale` → set both `scaleX` and `scaleY`; `scaleX`/`scaleY`
→ set that one; `angle` → set `angleDeg`.

### Encoding — `~` suffix

Parser regex: `/^BS(2)?-([1-9]\d*)X([1-9]\d*)-([0-9A-Za-z]+)(~[0-9A-Za-z]+)?$/`
(`~` ∉ base62, so the greedy payload group stops at `~`).

Block grammar (base62 chars, index 0–61):
`~ {axis}{curve}{trackCount} ({param}{from}{to})×trackCount {checksum}`

| field | value |
|---|---|
| `axis` | `0`=column `1`=row `2`=diagonal `3`=radial |
| `curve` | `0`=linear `1`=easeIn `2`=easeOut `3`=easeInOut `4`=symmetric |
| `trackCount` | base62 index 1–4 |
| `param` | `0`=scale `1`=scaleX `2`=scaleY `3`=angle |
| `from`,`to` | quantized index 0–61 |
| `checksum` | `(sum of every preceding block char's index) mod 62` |

Quantization:
- `scale`/`scaleX`/`scaleY`: `value = index / 31` (index 31 = `1.0`; range `0 … 1.968`).
- `angle`: `deg = (index − 31) × (90 / 31)` (index 31 = `0°`; range `−90° … 90°`).

Canonical form: tracks sorted ascending by `param` index; a track whose `from` and `to` both
quantize to the identity index is dropped; a ramp with zero surviving tracks omits the whole
`~` block.

`bad-ramp-block` (new `ShapeIdError` code) on: block length ≠ `3 + 3·trackCount + 1`;
`trackCount` outside 1–4; any field index out of range; duplicate `param`; `scale` together
with `scaleX`/`scaleY`; checksum mismatch. `encodeShapeId` throws the existing
`invalid-shape-def` if a `ShapeDef.ramp` has a duplicate param or the scale/scaleX conflict.

### Rendering — `applyRampTransform(segments, { scaleX, scaleY, angleDeg }, center)`

In `render.ts`, only when the decoded shape has a ramp, after the existing
`transformPathSegment` (invert + discrete rotation about the cell center) and before adding the
grid offset:
- `M = [[cos·sx, −sin·sy], [sin·sx, cos·sy]]` where `cos/sin` from `angleDeg`, `sx/sy` from the
  resolved transform.
- `M`/`L` point `p` → `M·(p − center) + center`.
- `A` segment → sample its arc into a polyline (24 line segments per 90° of sweep, derived from
  `largeArcFlag`/`sweepFlag` and endpoints), transform each sampled point, emit `L`s. So a
  ramped cell's fragment contains no `A`.

`renderShape` passes `shape.ramp` to the per-cell builder; unramped shapes never call
`applyRampTransform` and their output is byte-identical to today.

### Module layout

- `src/core/types.ts`: `RampAxis`, `RampCurve`, `RampParam`, `RampTrack`, `Ramp`,
  `ShapeDef.ramp?`.
- `src/core/ramp.ts` (new): `rampParameterAt`, `resolveCellTransform`, `encodeRampBlock`,
  `decodeRampBlock`, plus the quantization constants.
- `src/core/id.ts`: append/split the `~` block; `bad-ramp-block` code.
- `src/core/render.ts`: `applyRampTransform`; thread `shape.ramp` through.
- `src/core/index.ts`: export the types + `rampParameterAt` + `resolveCellTransform`.

## Risks / Trade-offs

- **[Trade-off]** Arc flattening when ramped changes the renderer's output character for those
  cells (polylines, not `A`). Accepted: ramped shapes are a morph aesthetic, 24 seg/quarter is
  visually identical, and it sidesteps the eigen-decomposition an exact rotated-ellipse `A`
  would need. Exact-arc output is a noted future refinement.
- **[Trade-off]** Endpoint quantization (62 steps) means an authored `Ramp` with off-grid
  values encodes to the nearest grid ID. Documented; same contract as any lossy-on-input
  quantizer, and `encode(decode(id)) === id` still holds for every ID the codec produces.
- **[Risk]** `t` uses `col/(cols−1)` etc., so a ramp on a 1-wide/1-tall grid is a no-op on that
  axis (guarded to `t=0`). Intentional — a single-column column-ramp has no gradient to show.
