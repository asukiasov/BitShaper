## Why

`docs/primitive-survey-63.md` recorded a gap: the `samples/63/` icon set is a *morphing-grid*
family — one shape parametrically interpolated across a grid (ellipse width, triangle size,
diamond aspect, shear, arc flattening). BitShaper's fully-discrete per-cell model
(`type × rotation ∈ {0,90,180,270} × invert`, every primitive drawn at exactly `cellSize`)
cannot express any of it, and no new primitive fixes that — there is no continuous parameter
anywhere in the system.

The approved design
(`docs/superpowers/specs/2026-08-27-bitshaper-ramp-modifier-design.md`) adds one: an **optional
`ramp` modifier** on a `ShapeDef` that varies a continuous per-cell transform (non-uniform
scale and/or rotation-angle offset) as a function of the cell's grid position. Cells stay
discrete; the ramp is a `~`-delimited ID suffix with its own checksum and no version bump.

## What Changes

- New optional field `ShapeDef.ramp?: Ramp` (`{ axis, curve, tracks: RampTrack[] }`,
  `RampTrack = { param, from, to }`, `param ∈ {scale, scaleX, scaleY, angle}`).
- New pure module `src/core/ramp.ts`: `rampParameterAt`, `resolveCellTransform`,
  `encodeRampBlock`, `decodeRampBlock`.
- `src/core/id.ts`: `encodeShapeId` appends `~{block}` when the shape has a ramp with surviving
  (non-identity) tracks; `decodeShapeId` splits the optional `~` block and parses it. New
  `ShapeIdError` code `bad-ramp-block`. Every existing ID stays byte-identical; the base-ID
  round-trip is unchanged and the ramped-ID round-trip (`encode(decode(id)) === id`) holds via
  endpoint quantization.
- `src/core/render.ts`: when a decoded shape has a ramp, each cell's already-transformed
  (invert + discrete rotation) segments get one further transform about the cell center — the
  2×2 matrix `R(angle)·diag(scaleX, scaleY)` — before the grid offset. `A` arc segments in
  ramped cells are flattened to polylines (24 seg/quarter-turn); unramped rendering is
  untouched and still emits `A`.
- Types exported from `src/core/index.ts`: `Ramp`, `RampTrack`, `RampAxis`, `RampCurve`,
  `RampParam`; plus `rampParameterAt` / `resolveCellTransform` for consumers.

## Capabilities

### New Capabilities

None (no new capability spec file).

### Modified Capabilities

- `shape-id-codec`: gains an optional trailing ramp-modifier block with its own grammar,
  quantization, canonical form, and checksum, plus a `bad-ramp-block` decode error.
- `shape-rendering`: `renderShape` optionally applies a per-cell scale + angle transform driven
  by the decoded ramp, after the existing rotation/invert and before the grid offset.

## Impact

- New files: `src/core/ramp.ts`, `test/core/ramp.test.ts`.
- Modified: `src/core/types.ts` (`Ramp`/`RampTrack`/`ShapeDef.ramp`), `src/core/id.ts`
  (append/parse `~` block, new error code), `src/core/render.ts` (`applyRampTransform`),
  `src/core/index.ts` (exports); `test/core/id.test.ts` and `test/core/render.test.ts` extended.
- No change to `src/core/registry.ts`, any primitive, `src/core/random.ts`,
  `generateShapeDef`/`generateShapeId`, `src/cli/`, `src/library/`, or `web/`. `renderShape`,
  `encodeShapeId`, `decodeShapeId` keep their current signatures.
