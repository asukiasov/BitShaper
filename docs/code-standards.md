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
