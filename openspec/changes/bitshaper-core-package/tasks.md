## 1. Package Scaffolding

- [x] 1.1 Create `package.json` (name `bitshaper`, ESM+CJS exports, `bitshaper` bin entry, `engines.node: ">=20"`) and `tsconfig.json` (compiler target `ES2022`, `strict: true`)
- [x] 1.2 Add `tsup.config.ts` for dual ESM+CJS build
- [x] 1.3 Add `vitest.config.ts`
- [x] 1.4 Add dependencies (`commander`) and dev dependencies (`typescript`, `tsup`, `vitest`, `@biomejs/biome`) and verify `npm install` succeeds
- [x] 1.4a Add `biome.json` (lint + format config) and `lint`/`format` scripts to `package.json` (`biome check .` / `biome format --write .`)
- [x] 1.5 Create `src/core/`, `src/core/primitives/`, `src/library/`, `src/cli/commands/`, `test/` directory structure

## 2. Core Data Model

- [x] 2.1 Implement `src/core/types.ts`: `Rotation`, `CellDef`, `ShapeDef`
- [x] 2.2 Implement `src/core/random.ts`: mulberry32 PRNG plus deterministic string-seed hashing to a 32-bit int

## 3. Primitive Registry

- [x] 3.1 Implement `src/core/primitives/empty.ts` (no path segments)
- [x] 3.2 Implement `src/core/primitives/fill.ts` (solid unit square)
- [x] 3.3 Implement `src/core/primitives/fillet.ts` (concave quarter-circle corner cut)
- [x] 3.4 Implement `src/core/primitives/bulge.ts` (convex quarter-circle corner)
- [x] 3.5 Implement shared rotation/inversion geometry transform helper (invert applied before rotation, transforms corner references, no SVG `transform=`)
- [x] 3.6 Implement `src/core/primitives/index.ts` exporting the four primitives in stable registration order
- [x] 3.7 Implement `src/core/registry.ts`: append-only type-name ↔ numeric-index map, wired to primitive path-builders
- [x] 3.8 Add test pinning primitive indices (`empty=0, fill=1, fillet=2, bulge=3`) to guard against accidental reordering

## 4. Shape ID Codec

- [x] 4.1 Implement `src/core/id.ts`: per-cell flat index computation (`type × 8 + rotation × 2 + invert`) and base62 alphabet lookup (`0-9A-Za-z`) in both directions
- [x] 4.2 Implement mod-62 checksum computation and validation over payload character indices
- [x] 4.3 Implement `encodeShapeId(shape: ShapeDef): string` (format `BS-{cols}X{rows}-{payload}{checksum}`), failing with a clear error if any cell's index exceeds 61 (primitive-index ceiling)
- [x] 4.4 Implement `decodeShapeId(id: string): ShapeDef` with format validation, payload-length validation (`cols × rows`), and checksum validation, each with a distinct, descriptive error
- [x] 4.5 Add round-trip tests (`encode(decode(id)) === id`, `decode(encode(shape))` equals original) across grid sizes 1×1 through 8×8
- [x] 4.6 Add tests: canonical encoding (identical geometry → identical ID), identical cells always yield identical characters regardless of position, and each rejection scenario (bad format, out-of-range dims, payload-length mismatch, bad checksum, primitive-index-ceiling overflow)

## 5. Rendering and Generation

- [x] 5.1 Implement `src/core/render.ts`: `renderShape(shapeId, opts?) => string`, wrapping concatenated per-cell path data in an `<svg>` (default 256×256, `opts.size`/`opts.fill` honored)
- [x] 5.2 Implement `generateShapeDef(seed, grid?)` in `src/core/id.ts` (or a new `generate.ts`): seeded PRNG picks each cell's type/rotation/invert; documented default grid size when omitted
- [x] 5.3 Implement `generateShapeId(seed, grid?)` convenience wrapper (generate + encode)
- [x] 5.4 Implement `src/core/index.ts` exporting the public API: `encodeShapeId`, `decodeShapeId`, `renderShape`, `generateShapeDef`, `generateShapeId`
- [x] 5.5 Add tests: render output contains all cells at correct offsets, custom size/fill honored, invalid ID surfaces decode error, unknown primitive index rejected
- [x] 5.6 Add tests: seeded generation determinism (same seed+grid → identical output), differing seeds generally differ, default grid applied when omitted

## 6. Curated Catalog

- [x] 6.1 Create `src/library/catalog.json` with curated `[{id, name, tags}]` entries, restricted to shapes renderable with the current starter primitive set
- [x] 6.2 Implement `src/library/index.ts`: `listCatalog()`, `getCatalogEntry()`
- [x] 6.3 Add tests: every catalog entry's `id` decodes and renders without error

## 7. CLI

- [x] 7.1 Implement `src/cli/commands/render.ts`: `bitshaper render <shapeId> -o <file> [--fill <color>]`, non-zero exit + error message on invalid ID, no file written on failure
- [x] 7.2 Implement `src/cli/commands/generate.ts`: `bitshaper generate --seed <seed> [--grid <colsxrows>] -o <file>`, default grid when `--grid` omitted
- [x] 7.3 Implement `src/cli/commands/list.ts`: `bitshaper list`, prints id/name/tags per entry, graceful message on empty catalog
- [x] 7.4 Implement `src/cli/index.ts` wiring commander subcommands to the `bitshaper` bin
- [x] 7.5 Add CLI tests (invoking the built commands programmatically or via subprocess) covering each command's success and failure scenarios from the spec

## 8. Verification

- [x] 8.1 Run full test suite (`vitest run`) and confirm all shape-id-codec, shape-rendering, and cli spec scenarios are covered and passing
- [x] 8.2 Run `tsup` build and confirm both ESM and CJS outputs load and the `bitshaper` bin runs `--help` successfully
- [x] 8.3 Manually render one shape from each starter primitive and spot-check the SVG visually against `samples/svgs/` for plausibility
