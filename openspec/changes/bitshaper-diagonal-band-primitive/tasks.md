## 1. `diagonal-band` primitive

- [x] 1.1 Create `src/core/primitives/diagonal-band.ts`: `DIAGONAL_BAND_WIDTH_RATIO = 1 / 2` constant, `diagonalBand: PrimitivePathBuilder` implementing the geometry from design.md (top-left→bottom-right band default, no arc segments), following the file structure/doc-comment style of `wedge.ts`/`arc-band.ts`.
- [x] 1.2 Export `diagonalBand` from `src/core/primitives/index.ts` (alphabetical position — after `circle`, before `empty`).
- [x] 1.3 Append `{ name: "diagonal-band", build: diagonalBand }` to `PRIMITIVE_REGISTRY` in `src/core/registry.ts` (index 12 — append only, do not reorder).
- [x] 1.4 Write `test/core/primitives/diagonal-band.test.ts` following the pattern of `test/core/primitives/arc-band.test.ts`: exact default segments, closes the path, no arc segments, `cellSize / 2` thickness, inverted mirror.
- [x] 1.5 In `test/core/registry.test.ts`: add a pinned-index test (`pins diagonal-band at index 12`), update the "contains exactly the twelve → thirteen registered primitives" assertion.
- [x] 1.6 In `test/core/render.test.ts`: bump the "one past the last primitive" sentinel from type 12 to type 13 (both the type value and the `/12/` → `/13/` message matcher).

## 2. Reproduce Shapes 11, 12, 16, 17, 18, 19, 20, 21, 22

- [x] 2.1 Using the compiled package, construct each `ShapeDef` from design.md's Compositions table, encode via `encodeShapeId`, and record the shape IDs.
- [x] 2.2 Render each shape ID via `renderShape` and pixel-verify against its reference `samples/svgs/Shape N.svg` at ≥99.6% full-image agreement. All nine pass (lowest: `Shape 18` at 99.811%). Each ID round-trips (`encodeShapeId(decodeShapeId(id)) === id`).

## 3. Catalog append

- [x] 3.1 Append the nine entries to `src/library/catalog.json` (existing nine untouched; 9 → 18), each with a descriptive name and `from-sample` tags.
- [x] 3.2 Confirm `test/library/index.test.ts` and `test/cli/commands/list.test.ts` need no changes (both operate on the catalog dynamically / via injected fixtures — verified same as last change).

## 4. Verification

- [x] 4.1 `npm test`, `npm run lint`, `npm run build` at the root — all pass.
- [x] 4.2 `node dist/cli/index.js list` prints all 18 catalog entries.
- [x] 4.3 `npm run test --workspace web` passes unchanged; `web/dist` rebuilt and Playwright-checked (catalog view + primitive-mix icons show `diagonal-band` and all 18 marks).
- [x] 4.4 Live site verified at https://asukiasov.github.io/BitShaper/ after merge with a real Playwright check.
