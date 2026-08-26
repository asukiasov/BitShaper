## Why

BitShaper needs a compact, self-describing identifier scheme for procedurally composed grid shapes, plus the core library and CLI to encode/decode those IDs and render them as SVG. Today there is no code — only 72 reference SVGs in `samples/` and a design for how shapes should be identified and generated. This change establishes the foundational npm package (`bitshaper`) that makes shape IDs decodable without a lookup table or network call, and lets shapes be generated, rendered, and inspected from the CLI.

## What Changes

- New `BS-{cols}X{rows}-{payload}{checksum}` shape ID format: one base62 character per cell (row-major), each character a flat index of that cell's `type·rotation·invert` combination, with a trailing base62 checksum character (mod-62 sum of the payload).
- New core data model (`ShapeDef`, `CellDef`, `Rotation`) and an append-only primitive registry mapping type strings to stable numeric indices and SVG path-builder functions.
- New public API: `encodeShapeId`, `decodeShapeId`, `renderShape`, `generateShapeDef`, `generateShapeId` (seeded via mulberry32 PRNG).
- New starter primitive set: `empty`, `fill`, `fillet`, `bulge`, each a pure function producing path-segment commands for a unit cell, with rotation/inversion handled generically (transforming the corner reference, not via SVG `transform=`).
- New curated shape catalog (`src/library/catalog.json` + accessors) referencing BitShaper IDs.
- New CLI (`bitshaper` bin) with `render`, `generate`, and `list` subcommands.
- New package scaffolding: `package.json`, `tsconfig.json`, `tsup.config.ts` (ESM+CJS build), `vitest.config.ts`, with tests mirroring `src/` under `test/`.

## Capabilities

### New Capabilities
- `shape-id-codec`: Encoding/decoding of BitShaper shape IDs — per-cell base62 encoding (one character per cell, no bit-packing), checksum computation/validation, and the `ShapeDef`/`CellDef` data model.
- `shape-rendering`: The primitive registry (append-only type index, rotation/inversion handling) and `renderShape`, turning a decoded `ShapeDef` into a single-path SVG string; includes the four starter primitives and seeded shape generation (`generateShapeDef`/`generateShapeId`).
- `cli`: The `bitshaper` command-line tool (`render`, `generate`, `list`) and the curated shape catalog it reads from.

### Modified Capabilities
(none — greenfield project, no existing specs)

## Impact

- New npm package `bitshaper` at the repo root: `src/core/*`, `src/core/primitives/*`, `src/library/*`, `src/cli/*`, `test/*`.
- New dependency on `commander` (CLI) and `tsup`/`vitest` as dev dependencies.
- `samples/` (existing reference SVGs) is read during development/spec-writing but not published; it stays out of the package's `files` allowlist.
- No existing code or specs are modified — this is the first change in the project.
