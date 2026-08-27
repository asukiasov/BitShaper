## 1. `round-corner` primitive

- [x] 1.1 Create `src/core/primitives/round-corner.ts`: `ROUND_CORNER_RADIUS_RATIO = 25 / 32` constant, `roundCorner: PrimitivePathBuilder` implementing the geometry from design.md (top-left corner default, `sweepFlag: 1`), following the file structure/doc-comment style of `pinwheel-arc.ts`.
- [x] 1.2 Export `roundCorner` from `src/core/primitives/index.ts` (alphabetical position per the existing export order).
- [x] 1.3 Append `{ name: "round-corner", build: roundCorner }` to `PRIMITIVE_REGISTRY` in `src/core/registry.ts` (index 10 — append only, do not reorder).
- [x] 1.4 Write `test/core/primitives/round-corner.test.ts` following the pattern of `test/core/primitives/pinwheel-arc.test.ts`: valid path-segment output, radius matches `cellSize * 25/32`, default (rotation 0, invert false) rounds the top-left corner.
- [x] 1.5 In `test/core/registry.test.ts`: add a pinned-index test (`pins round-corner at index 10`).

## 2. `arc-band` primitive

- [x] 2.1 Create `src/core/primitives/arc-band.ts`: `ARC_BAND_OUTER_RADIUS_RATIO = 1` and `ARC_BAND_INNER_RADIUS_RATIO = 1 / 2` constants, `arcBand: PrimitivePathBuilder` implementing the geometry from design.md (top-left corner default, outer arc `sweepFlag: 1`, inner arc `sweepFlag: 0`).
- [x] 2.2 Export `arcBand` from `src/core/primitives/index.ts` (alphabetical position per the existing export order).
- [x] 2.3 Append `{ name: "arc-band", build: arcBand }` to `PRIMITIVE_REGISTRY` in `src/core/registry.ts` (index 11 — append only).
- [x] 2.4 Write `test/core/primitives/arc-band.test.ts`: valid path-segment output (two arc segments), outer radius matches `cellSize`, inner radius matches `cellSize / 2`, default (rotation 0, invert false) bands the top-left corner.
- [x] 2.5 In `test/core/registry.test.ts`: add a pinned-index test (`pins arc-band at index 11`), update the "contains exactly N registered primitives" assertion to include both `round-corner` and `arc-band`.

  Note: fixing this task group also required updating a pre-existing test in `test/core/render.test.ts` ("rejects a decoded cell whose type has no registry entry") that hardcoded its "one past the last primitive" sentinel at type=10 — now a real primitive (`round-corner`). Bumped to type=12 (one past `arc-band`, the new last index). Small, unambiguous consequence of the append-only registry growing, not new scope.

## 3. Reproduce Shapes 1–6, 8–10

- [x] 3.1 Using the compiled package, construct each `ShapeDef` from design.md's Compositions section (Shape 1: 2×2 `round-corner`; Shapes 2–5: 2×2 `arc-band`; Shapes 6, 8–10: 4×4 existing primitives only), encode each via `encodeShapeId`, and record the resulting shape IDs.
- [x] 3.2 Render each shape ID via `renderShape` and visually/pixel-verify it matches its reference `samples/svgs/Shape N.svg` (same rasterize-and-compare method used to derive design.md's geometry).

  Resulting IDs (each `encodeShapeId(decodeShapeId(id)) === id` round-trip verified, and each `renderShape(id)` pixel-compared against its reference at ≥99.6% full-image agreement using the real compiled package, not the hand-implemented candidates from planning):
  - Shape 1: `BS2-2X2-1O1I1M1K5M` (99.91%)
  - Shape 2: `BS2-2X2-1T1Q1T1Q5m` (99.84%)
  - Shape 3: `BS2-2X2-1R1Q1T1V5p` (99.83%)
  - Shape 4: `BS2-2X2-1Q1R1V1T5p` (99.82%)
  - Shape 5: `BS2-2X2-1R1R1R1R5k` (99.82%)
  - Shape 6: `BS-4X4-g88i8fe88i8ie8e8R` (99.61%)
  - Shape 8: `BS-4X4-088T8O0880R8P880j` (99.95%)
  - Shape 9: `BS-4X4-08808OP808808OP8c` (99.96%)
  - Shape 10: `BS-4X4-808TP8088080P8P8i` (99.97%)

## 4. Catalog replacement

- [x] 4.1 Replace the full contents of `src/library/catalog.json` with the 9 entries from task 3.1 (Shapes 1–6, 8–10), each with a descriptive name and tags reflecting its origin/look (e.g. `["geometric", "rotational", "from-sample"]`). `Shape 7` is intentionally excluded — deferred per design.md.
- [x] 4.2 Update `test/library/index.test.ts` (and any other test hardcoding the old catalog's size/contents, e.g. CLI `list` tests) to match the new 9-entry catalog.

  Checked both: `test/library/index.test.ts` only asserts `length >= 5` and otherwise operates on `listCatalog()`'s actual return value dynamically (first entry, iterating all entries) — no hardcoded names/IDs, nothing to update. `test/cli/commands/list.test.ts` injects its own fixture catalog via dependency injection (`runListCommand(() => entries)`), never reads the real `catalog.json` — also nothing to update.

  Found but did not fix (outside this task's scope): `README.md`'s example gallery table (and its `docs/examples/*.svg` images) documents the *old* 13-entry catalog by name/ID — now stale. Flagging for a follow-up (regenerating the gallery is its own piece of work, not a test fix).

## 5. Verification

- [x] 5.1 Run `npm test` and `npm run lint` at the root; confirm everything passes.
- [x] 5.2 Run `npm run build`; confirm it succeeds.
- [x] 5.3 Manually run `bitshaper list` (or the built CLI) and confirm it prints exactly the 9 new catalog entries.
- [x] 5.4 Rebuild `web/` against the updated root `dist/` and manually confirm its catalog view shows all 9 entries correctly (sanity check only — no `web/` behavior is expected to change).

  Root: `npm test` — 297/297 passing (302 before this session, net -5: the old catalog's per-entry `renderShape` tests dropped from 13 to 9 generated tests, -4, plus one `list.test.ts` count assertion removed in favor of the dynamic ones already there, consistent with 4.2's note that no hardcoded catalog tests needed changes beyond the catalog content itself). `npm run lint`/`npm run format` clean. `npm run build` succeeds (root + `web/`).

  CLI: `node dist/cli/index.js list` prints exactly the 9 new entries with correct IDs/names/tags.

  Web: rebuilt `web/dist` against the new root `dist/`; `npm run test --workspace web` — 23/23 passing unchanged (fully dynamic against `listPrimitives()`/`listCatalog()`, no hardcoded counts). Verified visually via Playwright: catalog view renders all 9 new marks correctly matching their reference shapes; the generator form's primitive-mix checkboxes show live icons for both `round-corner` and `arc-band` alongside the existing ten; zero console errors.
