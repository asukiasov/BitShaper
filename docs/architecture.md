# BitShaper Project Structure

A living map of where code lives and why. Update this file in place as the structure evolves — don't let it drift. For the rationale behind the architecture itself (data model, ID codec, rendering approach), see `openspec/changes/bitshaper-core-package/design.md` and `openspec/roadmap.md`. For *how* code is written, see `docs/code-standards.md`.

## Directory map

```
bitshaper/
├── src/
│   ├── core/
│   │   ├── types.ts          # Rotation, CellDef, ShapeDef, Ramp — the data model
│   │   ├── id.ts              # encodeShapeId/decodeShapeId — the ID codec
│   │   ├── ramp.ts            # optional ShapeDef.ramp: progress/transform + `~` block codec
│   │   ├── ramp-transform.ts  # applyRampTransform — per-cell scale/rotate + arc flattening
│   │   ├── registry.ts        # append-only primitive type registry
│   │   ├── random.ts          # mulberry32 PRNG + string-seed hashing
│   │   ├── render.ts          # renderShape — ShapeDef -> SVG string (opt. `tile` -> <pattern>)
│   │   ├── tiling.ts          # edge-profile model: isTileable / generateTileableShapeId
│   │   ├── generate.ts        # generateShapeDef/generateShapeId — seeded generation
│   │   ├── index.ts           # public API barrel export
│   │   └── primitives/
│   │       ├── empty.ts       # one pure function per primitive
│   │       ├── fill.ts
│   │       ├── fillet.ts
│   │       ├── bulge.ts
│   │       └── index.ts       # exports primitives in stable registration order
│   ├── library/
│   │   ├── catalog.json       # curated [{id, name, tags}] entries
│   │   └── index.ts           # listCatalog(), getCatalogEntry()
│   └── cli/
│       ├── index.ts           # commander wiring for the `bitshaper` bin
│       └── commands/
│           ├── render.ts      # one file per subcommand
│           ├── generate.ts
│           └── list.ts
├── test/                       # mirrors src/ exactly (src/core/id.ts -> test/core/id.test.ts)
├── samples/                     # reference SVGs/screenshots — read during development only
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
└── biome.json
```

## What belongs where

- **`src/core/`** — everything that doesn't need to know about the CLI or the catalog: the data model, the ID codec, the primitive registry, rendering, and seeded generation. This is the part of the package other tools (a future web app) import directly.
- **`src/core/primitives/`** — one pure function per primitive, each `(cellSize, rotation, invert) => path segments`. Never imports from `src/cli/` or `src/library/`. New primitives are always pushed to the end of `primitives/index.ts`'s export order — the array index becomes a primitive's permanent numeric type value in every ID ever issued (see `openspec/roadmap.md`'s 8-type-ceiling note). Never reorder existing entries.
- **`src/library/`** — the curated catalog and its accessors. Only ever references shape IDs renderable with the *current* primitive set — `bitshaper list` must never point at an unrenderable ID.
- **`src/cli/`** and **`src/cli/commands/`** — the `bitshaper` bin. Depends on `src/core/` and `src/library/`; never the reverse. One file per subcommand.
- **`test/`** — mirrors `src/` file-for-file. A test for `src/core/id.ts` lives at `test/core/id.test.ts`, not alongside the source file.
- **`samples/`** — reference-only. Read while building/verifying primitives against real geometry; never imported by anything under `src/`, and stays out of `package.json`'s `files` allowlist.

## Dependency direction

```
src/cli/  ──depends on──>  src/core/
src/cli/  ──depends on──>  src/library/
src/library/ ──depends on──> src/core/ (to reference ShapeDef/types, not the reverse)
src/core/primitives/ ──depends on nothing else in src/
```

Nothing under `src/core/` or `src/core/primitives/` may import from `src/cli/` or `src/library/`. If you find yourself wanting to do that, the code you're writing likely belongs in `src/cli/` or `src/library/` instead.

## Where does X go?

- **New primitive** → `src/core/primitives/<name>.ts`, appended (never inserted) to `src/core/primitives/index.ts`'s export list; add a pinned-index test alongside the existing ones.
- **New CLI subcommand** → `src/cli/commands/<name>.ts`, wired into `src/cli/index.ts`.
- **New catalog entry** → `src/library/catalog.json`, only if its shape ID is renderable with the current primitive set.
- **New core concept that isn't a primitive** (e.g. a new codec detail) → `src/core/`, as its own file if it has a distinct responsibility from `id.ts`/`registry.ts`/`render.ts`.
