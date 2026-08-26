# Dev Tooling, Code Standards, and Architecture Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record the tooling decisions from `docs/superpowers/specs/2026-08-25-dev-tooling-and-standards-design.md` into the in-flight `bitshaper-core-package` OpenSpec change, and create two living reference docs (`docs/code-standards.md`, `docs/architecture.md`) for how to write code and where it goes.

**Architecture:** No `src/` code exists yet — this plan produces three markdown/OpenSpec-artifact edits, not application code. Each task is self-contained and independently reviewable/committable.

**Tech Stack:** Markdown docs; OpenSpec `tasks.md` checklist format.

## Global Constraints

- Package manager: npm (`package.json` + `package-lock.json`), no pnpm/yarn.
- Lint/format: Biome (`biome.json`, `npm run lint`, `npm run format`), not ESLint+Prettier.
- Node support floor: `>=20`; `tsconfig.json` compiler target `ES2022`.
- CI: explicitly out of scope for this plan — deferred to Phase 2 (publish v1 + docs) per the project roadmap. Do not add a GitHub Actions workflow.
- Commit messages: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`).
- Error handling convention (for future code, documented not implemented here): typed `Error` subclasses with a `code` discriminant field, thrown not returned.
- Exports convention (for future code, documented not implemented here): named exports only, no `export default`.
- Doc-comment convention (for future code, documented not implemented here): TSDoc required on the public API surface only (`encodeShapeId`, `decodeShapeId`, `renderShape`, `generateShapeDef`, `generateShapeId`, exported types, exported error classes).
- Source of truth for all of the above: `docs/superpowers/specs/2026-08-25-dev-tooling-and-standards-design.md`. Do not introduce a decision not already in that spec.

---

### Task 1: Amend `bitshaper-core-package` scaffolding tasks with tooling decisions

**Files:**
- Modify: `openspec/changes/bitshaper-core-package/tasks.md` (task group "1. Package Scaffolding")

**Interfaces:**
- Consumes: nothing (pure edit of an existing checklist).
- Produces: two new checklist items under task group 1 that Task 2/3 of this plan don't depend on, but that future implementers of `bitshaper-core-package` will follow.

- [ ] **Step 1: Read the current task group 1 block**

Run: `sed -n '1,10p' "openspec/changes/bitshaper-core-package/tasks.md"`
Expected output (current state):
```
## 1. Package Scaffolding

- [ ] 1.1 Create `package.json` (name `bitshaper`, ESM+CJS exports, `bitshaper` bin entry) and `tsconfig.json`
- [ ] 1.2 Add `tsup.config.ts` for dual ESM+CJS build
- [ ] 1.3 Add `vitest.config.ts`
- [ ] 1.4 Add dependencies (`commander`) and dev dependencies (`typescript`, `tsup`, `vitest`) and verify `npm install` succeeds
- [ ] 1.5 Create `src/core/`, `src/core/primitives/`, `src/library/`, `src/cli/commands/`, `test/` directory structure
```

- [ ] **Step 2: Edit task 1.1 to include the Node/tsconfig target decision, and task 1.4 to include Biome**

Change:
```
- [ ] 1.1 Create `package.json` (name `bitshaper`, ESM+CJS exports, `bitshaper` bin entry) and `tsconfig.json`
```
to:
```
- [ ] 1.1 Create `package.json` (name `bitshaper`, ESM+CJS exports, `bitshaper` bin entry, `engines.node: ">=20"`) and `tsconfig.json` (compiler target `ES2022`, `strict: true`)
```

Change:
```
- [ ] 1.4 Add dependencies (`commander`) and dev dependencies (`typescript`, `tsup`, `vitest`) and verify `npm install` succeeds
```
to:
```
- [ ] 1.4 Add dependencies (`commander`) and dev dependencies (`typescript`, `tsup`, `vitest`, `@biomejs/biome`) and verify `npm install` succeeds
- [ ] 1.4a Add `biome.json` (lint + format config) and `lint`/`format` scripts to `package.json` (`biome check .` / `biome format --write .`)
```

- [ ] **Step 3: Verify the edited block reads correctly**

Run: `sed -n '1,12p' "openspec/changes/bitshaper-core-package/tasks.md"`
Expected: task group 1 now has 6 line items (1.1 through 1.4a, 1.5), all still unchecked `- [ ]`, no other task group altered.

- [ ] **Step 4: Commit**

```bash
cd "/Users/aliksukiasov/Desktop/63 Projects/BitShaper"
git add openspec/changes/bitshaper-core-package/tasks.md
git commit -m "chore: fold npm/Biome/Node-20 tooling decisions into core-package scaffolding tasks"
```

---

### Task 2: Create `docs/code-standards.md`

**Files:**
- Create: `docs/code-standards.md`

**Interfaces:**
- Consumes: the "Decisions" section of `docs/superpowers/specs/2026-08-25-dev-tooling-and-standards-design.md`.
- Produces: a doc that Task 3 links to (cross-reference), and that all future `bitshaper-core-package` implementation tasks are expected to follow.

- [ ] **Step 1: Write the file**

Create `docs/code-standards.md` with this exact content:

```markdown
# BitShaper Code Standards

A living reference for how code is written in this repo. Update this file in place as conventions evolve — don't let it drift from what the code actually does. For *why* these choices were made, see `docs/superpowers/specs/2026-08-25-dev-tooling-and-standards-design.md`. For *where* code goes, see `docs/architecture.md`.

## Language & types

- TypeScript in `strict` mode (`tsconfig.json`'s `strict: true`) — no exceptions.
- No `any` without an inline comment explaining why it's unavoidable. Prefer `unknown` plus explicit narrowing.
- Target: Node `>=20`, compiler target `ES2022`.

## Exports

- Named exports only. No `export default`, including single-function files like each primitive in `src/core/primitives/`.
- Barrel files (e.g. `src/core/primitives/index.ts`, `src/core/index.ts`) re-export explicitly by name — never `export * from`.

## Errors

- Public API functions throw typed `Error` subclasses, never return `{ ok, value } | { ok, error }` result objects.
- Each error class carries a `code` discriminant field for programmatic handling, e.g.:

  ```ts
  export class ShapeIdError extends Error {
    constructor(public readonly code: "bad-format" | "checksum-mismatch" | "primitive-ceiling-overflow", message: string) {
      super(message);
      this.name = "ShapeIdError";
    }
  }
  ```
- CLI commands (`src/cli/commands/*.ts`) catch errors at the boundary, print a user-facing message, and exit non-zero. They never let a raw stack trace reach the user.

## Naming

- Filenames: kebab-case (`shape-id.ts`, not `shapeId.ts`).
- Functions and variables: `camelCase`.
- Types, interfaces, classes: `PascalCase`.
- One primary export concept per file — a file named after what it exports (e.g. `fillet.ts` exports the `fillet` primitive).

## Doc comments

- TSDoc is required on the public API surface: `encodeShapeId`, `decodeShapeId`, `renderShape`, `generateShapeDef`, `generateShapeId`, and every exported type (`ShapeDef`, `CellDef`, `Rotation`) and exported error class.
- Internal helpers (primitive path-builders, the shared geometry transform, registry internals) get a comment only where the logic isn't self-evident from reading it — don't blanket-document every internal function.

## Testing

- vitest. Tests mirror `src/` under `test/` (e.g. `src/core/id.ts` → `test/core/id.test.ts`).
- One behavior per `it()` block — don't assert multiple unrelated things in one test.
- Prefer round-trip/property-style tests where the domain supports it (e.g. `encode(decode(id)) === id` across grid sizes), per the shape-id-codec spec.

## Formatting & linting

- Biome (`biome.json`) is the single source of truth for formatting and lint rules. Run `npm run lint` and `npm run format` — don't hand-debate style in review.
- `npm run lint` must pass before a commit lands.

## Commits

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, etc.
- No enforcement tooling (commitlint/husky) yet — convention plus review, not automation.
```

- [ ] **Step 2: Verify every design-doc decision is represented**

Run: `grep -c "^##" "docs/code-standards.md"`
Expected: `7` (Language & types, Exports, Errors, Naming, Doc comments, Testing, Formatting & linting, Commits — count the actual `##` headers; adjust expectation if you count differently, but confirm all 8 topics from the design doc's Decisions section appear).

Run: `grep -n "code-standards.md is missing anything" /dev/null; echo done` (placeholder no-op — actual check is manual: re-read `docs/superpowers/specs/2026-08-25-dev-tooling-and-standards-design.md`'s "docs/code-standards.md — living reference" bullet and confirm every listed section name appears as a `##` heading above.)

- [ ] **Step 3: Commit**

```bash
cd "/Users/aliksukiasov/Desktop/63 Projects/BitShaper"
git add docs/code-standards.md
git commit -m "docs: add code-standards.md"
```

---

### Task 3: Create `docs/architecture.md`

**Files:**
- Create: `docs/architecture.md`

**Interfaces:**
- Consumes: the directory structure from `bitshaper-core-package`'s `proposal.md`/`design.md`/`tasks.md` (task 1.5) and the "docs/architecture.md" bullet of the design doc.
- Produces: a doc future tasks (adding a primitive, a CLI command, a catalog entry) are expected to consult for "where does this go?"

- [ ] **Step 1: Write the file**

Create `docs/architecture.md` with this exact content:

```markdown
# BitShaper Project Structure

A living map of where code lives and why. Update this file in place as the structure evolves — don't let it drift. For the rationale behind the architecture itself (data model, ID codec, rendering approach), see `openspec/changes/bitshaper-core-package/design.md` and `openspec/roadmap.md`. For *how* code is written, see `docs/code-standards.md`.

## Directory map

```
bitshaper/
├── src/
│   ├── core/
│   │   ├── types.ts          # Rotation, CellDef, ShapeDef — the data model
│   │   ├── id.ts              # encodeShapeId/decodeShapeId — the ID codec
│   │   ├── registry.ts        # append-only primitive type registry
│   │   ├── random.ts          # mulberry32 PRNG + string-seed hashing
│   │   ├── render.ts          # renderShape — ShapeDef -> SVG string
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
```

- [ ] **Step 2: Verify the directory tree matches `bitshaper-core-package`'s task 1.5 and proposal.md**

Run: `grep -n "src/core/\|src/library/\|src/cli/" "openspec/changes/bitshaper-core-package/tasks.md" | head -5`
Expected: the paths listed (`src/core/`, `src/core/primitives/`, `src/library/`, `src/cli/commands/`, `test/`) all appear in `docs/architecture.md`'s directory map above — cross-check by eye, no path in the map should be absent from or contradict `tasks.md` task 1.5.

- [ ] **Step 3: Commit**

```bash
cd "/Users/aliksukiasov/Desktop/63 Projects/BitShaper"
git add docs/architecture.md
git commit -m "docs: add architecture.md project structure map"
```

---

## Self-Review Notes

- **Spec coverage:** Task 1 covers the `bitshaper-core-package/tasks.md` amendment (npm/Biome/Node-20/tsconfig decisions from the design doc). Task 2 covers every bullet under the design doc's "docs/code-standards.md" section. Task 3 covers every bullet under "docs/architecture.md" section, including the dependency-direction and "where does X go?" requirements. CI and commit-lint tooling are explicitly out of scope per Global Constraints, matching the design doc's Non-Goals.
- **Placeholder scan:** Step 2 of Task 2 originally risked a placeholder-style "manual check" — left in as a deliberate manual cross-reference step since there's no automated way to diff a markdown doc against a spec's prose, but the actual file content in Step 1 is complete and final, not a placeholder.
- **Type consistency:** N/A — no code/types are introduced by this plan; only prose and one code sample (the `ShapeIdError` illustration in `docs/code-standards.md`), which matches the error-handling convention decided in the design doc exactly (typed subclass, `code` discriminant field).
