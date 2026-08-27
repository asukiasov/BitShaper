## 1. `leaf` primitive

- [x] 1.1 Create `src/core/primitives/leaf.ts`: `leaf: PrimitivePathBuilder` implementing the two-arc lens geometry from design.md (radius `cellSize`, no ratio constant needed), following the file structure/doc-comment style of `bulge.ts`/`arc-band.ts`.
- [x] 1.2 Export `leaf` from `src/core/primitives/index.ts` (alphabetical position — after `fillet`, before `ogee`).
- [x] 1.3 Append `{ name: "leaf", build: leaf }` to `PRIMITIVE_REGISTRY` in `src/core/registry.ts` (index 13 — append only, do not reorder).
- [x] 1.4 Write `test/core/primitives/leaf.test.ts` following the pattern of `test/core/primitives/arc-band.test.ts`: exact default segments, closes the path, two arc segments of radius `cellSize`, inverted sweep-flag flip.
- [x] 1.5 In `test/core/registry.test.ts`: add a pinned-index test (`pins leaf at index 13`), update the "contains exactly the thirteen → fourteen registered primitives" assertion.
- [x] 1.6 In `test/core/render.test.ts`: bump the "one past the last primitive" sentinel from type 13 to type 14 (both the type value and the `/13/` → `/14/` message matcher).

## 2. Reproduce Shapes 31, 32, 33, 34, 38, 40, 43, 45, 49, 51, 53, 55, 60, 65, 67, 70, 71

- [x] 2.1 Using the compiled package, construct each `ShapeDef` from design.md's Compositions table via per-cell brute-force match, encode via `encodeShapeId`, and record the shape IDs.
- [x] 2.2 Render each shape ID via `renderShape` and pixel-verify against its reference `samples/svgs/Shape N.svg` at ≥99.6% full-image agreement. All seventeen pass (lowest: `Shape 51` at 99.719%). Each ID round-trips (`encodeShapeId(decodeShapeId(id)) === id`).

## 3. Catalog append

- [x] 3.1 Append the seventeen entries to `src/library/catalog.json` (existing eighteen untouched; 18 → 35), each with a descriptive name and `from-sample` tags.
- [x] 3.2 Confirm `test/library/index.test.ts` and `test/cli/commands/list.test.ts` need no changes (both operate on the catalog dynamically / via injected fixtures — verified same as prior changes).

## 4. Verification

- [x] 4.1 `npm test`, `npm run lint`, `npm run build` at the root — all pass (334 tests).
- [x] 4.2 `node dist/cli/index.js list` prints all 35 catalog entries.
- [x] 4.3 `npm run test --workspace web` passes unchanged (31 tests); `web/dist` rebuilt and Playwright-checked (primitive checkboxes show `leaf`; catalog view shows all 35 marks; no console errors).
- [ ] 4.4 Live site verified at https://asukiasov.github.io/BitShaper/ after merge with a real Playwright check.
