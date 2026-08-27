## 1. Types

- [ ] 1.1 In `src/core/types.ts` add `RampAxis`, `RampCurve`, `RampParam` string-literal unions; `RampTrack { param; from; to }`; `Ramp { axis; curve; tracks }`; add optional `ramp?: Ramp` to `ShapeDef`. Doc-comment the `from`/`to` value meaning (scale ≈ 0..1.968 with 1 = identity; angle degrees ≈ −90..90 with 0 = identity; snapped to the encoding grid on encode).

## 2. `src/core/ramp.ts` (new)

- [ ] 2.1 Quantization constants + helpers: `scale` index↔value (`value = index / 31`), `angle` index↔degrees (`(index − 31) × 90/31`), nearest-index snap for each.
- [ ] 2.2 `rampParameterAt(axis, curve, col, row, cols, rows): number` — raw axis position (column/row/diagonal/radial-from-center), zero-denominator guard → `t = 0`, then curve reshape (linear / easeIn `t²` / easeOut `1−(1−t)²` / easeInOut `3t²−2t³` / symmetric `1−|2t−1|`). Returns `t ∈ [0,1]`.
- [ ] 2.3 `resolveCellTransform(ramp, col, row, cols, rows): { scaleX; scaleY; angleDeg }` — one `t`, fold every track (`scale` → both axes; `scaleX`/`scaleY` → one; `angle` → `angleDeg`), identity defaults.
- [ ] 2.4 `encodeRampBlock(ramp): string` — validate (1–4 tracks, distinct `param`, `scale` xor `scaleX`/`scaleY`), drop identity-only tracks, sort by `param` index, snap endpoints, emit `{axis}{curve}{trackCount}{param}{from}{to}…{checksum}` (no leading `~`). Return `""` when no tracks survive.
- [ ] 2.5 `decodeRampBlock(block: string): Ramp` — `block` is the text after `~`. Validate length vs `trackCount`, field ranges, distinct `param`, `scale` xor `scaleX`/`scaleY`, checksum; throw a plain `Error` subclass or return a discriminated result the codec maps to `ShapeIdError('bad-ramp-block')` (keep `ShapeIdError` construction in `id.ts`).
- [ ] 2.6 Unit tests `test/core/ramp.test.ts`: `rampParameterAt` endpoints/midpoint/each curve/1-wide+1-tall+1×1 guards/radial center=0; `resolveCellTransform` scale-fills-both + identity defaults + multi-track; `encodeRampBlock`/`decodeRampBlock` round-trip, snapping (`1.0` → idx 31; `0.5001` → nearest), checksum rejection, identity track dropped, tracks sorted, zero-track → `""`, duplicate `param` rejected, `scale`+`scaleX` rejected.

## 3. Codec — `src/core/id.ts`

- [ ] 3.1 Add `"bad-ramp-block"` to the `ShapeIdError` `code` union.
- [ ] 3.2 Update `SHAPE_ID_PATTERN` to `/^BS(2)?-([1-9]\d*)X([1-9]\d*)-([0-9A-Za-z]+)(~[0-9A-Za-z]+)?$/`; keep the payload/checksum split working off the first group only.
- [ ] 3.3 `encodeShapeId`: after the base ID, if `shape.ramp`, compute `encodeRampBlock`; append `"~" + block` when non-empty. Map an invalid ramp (duplicate `param`, `scale`+`scaleX`/`scaleY`) to `ShapeIdError('invalid-shape-def', …)`.
- [ ] 3.4 `decodeShapeId`: when the optional `~` group is present, strip the leading `~`, call `decodeRampBlock`, set `shape.ramp`; map any failure to `ShapeIdError('bad-ramp-block', …)`. When absent, leave `ramp` undefined.
- [ ] 3.5 Extend `test/core/id.test.ts`: ramped-ID `encode(decode(id)) === id`; base ID byte-identical to current output (regression); `~` block bad checksum → `bad-ramp-block`; non-canonical `Ramp` (unsorted tracks / identity track) → canonical ID; `~` block length ≠ `3 + 3·trackCount + 1` → `bad-ramp-block`; `encodeShapeId` with contradictory ramp → `invalid-shape-def`.

## 4. Render — `src/core/render.ts`

- [ ] 4.1 `applyRampTransform(segments, { scaleX, scaleY, angleDeg }, center): PathSegment[]` — build `M = R(angleDeg) · diag(scaleX, scaleY)`; transform `M`/`L` points as `M·(p − center) + center`; sample each `A` into a polyline (24 segments per 90° of sweep, from `largeArcFlag`/`sweepFlag`/endpoints/radii), transform the sampled points, emit `L`s (no `A` in output).
- [ ] 4.2 Thread `shape.ramp` from `renderShape` into the per-cell path build; when present, run step 4.1 on each non-empty cell's segments after `transformPathSegment` and before applying the grid offset. `renderShape` signature unchanged.
- [ ] 4.3 Extend `test/core/render.test.ts`: ramped shape renders valid SVG; ramped output has no `A` while the same shape unramped does; a `scale` track below 1 shrinks a `fill` cell and keeps it centered (bbox check); an `angle` track adds a non-axis-aligned edge; `empty` cells emit nothing under a ramp; a fixed 4×4 `circle` + `scaleX` column-ramp ID renders to a stable snapshot; an ID with a broken `~` block makes `renderShape` throw `bad-ramp-block`.

## 5. Public API — `src/core/index.ts`

- [ ] 5.1 Export types `Ramp`, `RampTrack`, `RampAxis`, `RampCurve`, `RampParam`.
- [ ] 5.2 Re-export `rampParameterAt` and `resolveCellTransform` from `./ramp.js`.

## 6. Verification

- [ ] 6.1 `npm test`, `npm run lint`, `npm run build` at the root — all pass.
- [ ] 6.2 `npm run test --workspace web` passes unchanged (web consumes the codec/render as-is; no ramp usage there yet).
- [ ] 6.3 `node dist/cli/index.js render <a hand-built ramped ID>` writes a valid SVG; a Playwright rasterisation of a 4×4 `circle` + column `scaleX` ramp visibly shows the width gradient.
- [ ] 6.4 Update `docs/code-standards.md` / `docs/architecture.md` if the new `ramp.ts` module or the `ShapeDef.ramp` field needs a line in the directory map / data-model section.
