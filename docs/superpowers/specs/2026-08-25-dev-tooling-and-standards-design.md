# Dev Tooling, Code Standards, and Architecture Docs

## Context

BitShaper is still pre-code: the only accepted design is `openspec/changes/bitshaper-core-package/` (architecture, data model, ID codec) and `docs/superpowers/specs/2026-08-24-bitshaper-roadmap-design.md` (phase sequencing). That design fixes the *shape* of the code (TypeScript, dual ESM+CJS via tsup, vitest, commander, append-only primitive registry) but leaves two things undecided:

1. The tooling layer around it — package manager, linter/formatter, Node version support, commit message convention. None of this is in `bitshaper-core-package`'s `tasks.md` today.
2. Two living reference docs contributors (human or AI) check *while writing code*, as opposed to the point-in-time rationale docs already in `openspec/`:
   - `docs/code-standards.md` — how to write code here (naming, exports, errors, comments, testing, formatting).
   - `docs/architecture.md` — where code goes (annotated directory structure, dependency direction).

This document records the decisions; it does not re-litigate anything already accepted in `bitshaper-core-package`'s `design.md` or `openspec/roadmap.md`.

## Goals / Non-Goals

**Goals:**
- Decide the remaining tooling choices needed before `src/` scaffolding begins.
- Produce two living docs (`docs/code-standards.md`, `docs/architecture.md`) that stay accurate as the project grows, rather than being re-derived each time.
- Fold the tooling decisions into `bitshaper-core-package`'s `tasks.md` so scaffolding (task group 1) reflects them.

**Non-Goals:**
- Re-deciding build tool, test framework, module structure, or the ID format — all already accepted.
- Setting up CI (GitHub Actions) — explicitly deferred to Phase 2 of the project roadmap (publish v1 + docs).
- Enforcing commit-message format with tooling (e.g. commitlint/husky) — convention only, for now; a solo/small side project doesn't need the extra dependency yet.
- A data-flow/rationale architecture doc — that already exists in `bitshaper-core-package/design.md`; `docs/architecture.md` is deliberately just the directory map.

## Decisions

### Package manager: npm
Plain `package.json` + `package-lock.json`. Zero extra install for contributors, matches the already-accepted plain package.json scaffolding in `bitshaper-core-package` task 1.1. No pnpm/yarn-specific lockfile or workspace features are needed for a single-package repo.

### Lint/format: Biome
One dependency (`@biomejs/biome`) replaces the ESLint+Prettier combo for both linting and formatting, via a single `biome.json`. Rejected ESLint+Prettier: two configs/tools to maintain for marginal rule-set benefit at this project's size. Rejected "TypeScript strict mode only, no linter": `tsc --strict` catches type errors but not style/formatting drift, and a solo project benefits from an enforced formatter so there's never a style debate. `npm run lint` and `npm run format` scripts wrap it.

### Node version support: >=20
`package.json#engines.node: ">=20"`, `tsconfig.json` compiler target `ES2022`. Node 20 is the current LTS lineage as of this decision; targeting it avoids polyfills and keeps modern syntax available without pushing to bleeding-edge versions.

### CI: deferred to Phase 2
No GitHub Actions workflow is added by this change. The project roadmap already schedules "basic CI (build + test on push)" under Phase 2 (publish v1 + docs); adding it now would duplicate that phase's scope ahead of schedule.

### Commit messages: Conventional Commits
`feat:`, `fix:`, `chore:`, `docs:`, `test:`, etc. Chosen over freeform messages because it plays well if changesets/semantic-release get adopted later for npm publishing (Phase 2), and costs nothing to start now. Enforced by convention/code review, not a git hook — no commitlint dependency yet.

### Error handling: typed `Error` subclasses
Public API functions throw typed errors (e.g. `class ShapeIdError extends Error` with a `code` discriminant field) rather than returning `{ ok, value } | { ok, error }` result objects. Matches `bitshaper-core-package`'s `tasks.md` 4.4 ("decodeShapeId... each with a distinct, descriptive error") and is idiomatic for a library this size — CLI commands catch at the boundary, print, and exit non-zero.

### Exports: named only
No `export default` anywhere, including single-function files like each primitive. Named exports keep refactors safe (renaming an export is not silently invisible to importers), keep import statements consistent, and make barrel re-exports (`src/core/primitives/index.ts`, `src/core/index.ts`) explicit about what's public.

### Doc comments: public API surface only
TSDoc is required on the five exported functions (`encodeShapeId`, `decodeShapeId`, `renderShape`, `generateShapeDef`, `generateShapeId`), exported types (`ShapeDef`, `CellDef`, `Rotation`), and exported error classes. Internal helpers (primitive path-builders, the geometry transform helper, registry internals) are commented only where the logic isn't self-evident — matching the terse, deliberate style already used in the project's own `design.md` files, not blanket-documenting every internal export.

### `docs/code-standards.md` — living reference
Sections: language & types (strict TS, no unexplained `any`), exports (named only), errors (typed subclasses), naming (kebab-case files, camelCase functions/vars, PascalCase types/classes), doc comments (public API only, per above), testing (vitest, tests mirror `src/` under `test/`, one behavior per `it()`), formatting/linting (Biome is the enforcer), commits (Conventional Commits).

### `docs/architecture.md` — annotated directory structure
An annotated version of the tree already implied by `bitshaper-core-package` task 1.5: `src/core/` (types, id codec, registry, random, render), `src/core/primitives/` (one file per primitive plus the shared geometry transform), `src/library/` (catalog + accessors), `src/cli/` and `src/cli/commands/` (one file per subcommand), `test/` (mirrors `src/`), plus root config (`package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `biome.json`). Each directory gets one or two lines on what belongs there and the dependency direction (`src/cli/` depends on `src/core/` and `src/library/`, never the reverse; `src/core/primitives/` never imports from `src/cli/` or `src/library/`), plus a short "where does X go?" decision aid for common additions (new primitive → `src/core/primitives/`, new CLI subcommand → `src/cli/commands/`, new catalog entry → `src/library/catalog.json`). Notes `samples/` is reference-only and never imported by `src/`. Distinct from `bitshaper-core-package/design.md` (rationale, will be archived) and `openspec/roadmap.md` (decision log) — this is purely the practical structure map, kept accurate as the project grows rather than re-derived per change.

### `bitshaper-core-package/tasks.md` amendment
Task group 1 (Package Scaffolding) gains two items reflecting the tooling decisions above: adding `biome.json` + npm lint/format scripts, and setting `engines`/`tsconfig` target. This is an amendment to the in-flight change via the OpenSpec update workflow, not a new change — the scaffolding scope doesn't change, only its detail.

## Risks / Trade-offs

- [Biome is younger than ESLint+Prettier, smaller plugin ecosystem] → Acceptable: this project doesn't need custom lint rules beyond sane defaults, and one tool/config is a net simplicity win for a solo project.
- [No CI means lint/type/test failures can land on `main` before Phase 2] → Acceptable short-term per roadmap sequencing; mitigated by running `npm run lint` and `vitest run` manually before commits per `docs/code-standards.md`.
- [Two new "living" docs (`code-standards.md`, `architecture.md`) can drift from actual code if not updated] → Mitigated by scoping them to be updated in place as changes land, not treated as one-time artifacts; future OpenSpec changes that alter directory structure or conventions should update these docs as part of their own tasks.

## Open Questions

None — all decisions in this doc were confirmed during brainstorming.
