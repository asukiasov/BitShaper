## 1. Primitive implementations

- [x] 1.1 Implement `src/core/primitives/circle.ts` per design.md (two-arc full circle, radius `cellSize / 2`, centered)
- [x] 1.2 Implement `src/core/primitives/wedge.ts` per design.md (straight corner-to-corner triangle cut)
- [x] 1.3 Implement `src/core/primitives/cap.ts` per design.md (single semicircular arc spanning one edge)
- [x] 1.4 Implement `src/core/primitives/pinwheel-arc.ts` per design.md (concave arc at `0.78 × cellSize`, corner stub edges)
- [x] 1.5 Implement `src/core/primitives/step.ts` per design.md (diagonal-jog-diagonal polyline cut, `j = cellSize / 8`)
- [x] 1.6 Implement `src/core/primitives/ogee.ts` per design.md (two-arc S-curve band, `r = cellSize / 4`)
- [x] 1.7 Export all six from `src/core/primitives/index.ts`

## 2. Registry

- [x] 2.1 Append all six to `PRIMITIVE_REGISTRY` in `src/core/registry.ts`, in order: `circle, wedge, cap, pinwheel-arc, step, ogee` (indices 4-9)
- [x] 2.2 Extend the pinned-index test in `test/core/registry.test.ts` to assert `circle=4, wedge=5, cap=6, pinwheel-arc=7, step=8, ogee=9`

## 3. Primitive tests

- [x] 3.1 `test/core/primitives/circle.test.ts`: renders a closed circular path of the expected radius/center; rotation/invert are no-ops on the emitted geometry
- [x] 3.2 `test/core/primitives/wedge.test.ts`: renders exactly 3 line-type segments plus close, no arc commands; verifies corner coordinates at rotation 0
- [x] 3.3 `test/core/primitives/cap.test.ts`: renders a single arc segment with radius `cellSize / 2` spanning the expected edge
- [x] 3.4 `test/core/primitives/pinwheel-arc.test.ts`: renders straight stub segments of length `cellSize - 0.78 * cellSize` before/after a single arc of radius `0.78 * cellSize`
- [x] 3.5 `test/core/primitives/step.test.ts`: renders the 3-segment jogged diagonal (two `L` segments at `cellSize/2 ± cellSize/8, cellSize/2`) distinct from `wedge`'s single-segment diagonal
- [x] 3.6 `test/core/primitives/ogee.test.ts`: renders two arc segments with equal radius (`cellSize / 4`) and opposite sweep flags, both endpoints at `y = cellSize / 2`

## 4. Integration

- [x] 4.1 Add/extend `test/core/render.test.ts` (or equivalent) cases rendering a single-cell shape through each new primitive end-to-end via `renderShape`
- [x] 4.2 Add a round-trip test (`test/core/id.test.ts` or a new integration test) encoding+decoding a shape using `step`/`ogee` (types 8/9) at a rotation/invert combination that requires format version 2, confirming `encodeShapeId` transparently upgrades and the shape decodes correctly

## 5. Docs

- [x] 5.1 Update `docs/primitives/README.md`: move `circle`, `wedge`, `cap`, `pinwheel-arc` from "Candidates" into "Implemented" (regenerated from real code); add `step` and `ogee` to "Implemented" with their real rendered SVGs; remove the now-empty "Candidates" section
- [x] 5.2 Regenerate each new primitive's reference SVG file in `docs/primitives/` from real `renderShape` output (replacing the `*.CANDIDATE.svg` files with real, code-generated ones for `circle`/`wedge`/`cap`/`pinwheel-arc`, and adding new ones for `step`/`ogee`)

## 6. Verification

- [x] 6.1 Run `vitest run` and confirm all tests (existing + new) pass
- [x] 6.2 Run `tsup` build and confirm it still succeeds with no type errors
- [x] 6.3 Run `biome check` on all new/changed files
- [x] 6.4 Manually render one shape from each of the six new primitives and spot-check the SVG visually against the corresponding entries in `docs/primitive-survey.md` / `docs/primitive-survey-screens2.md`
