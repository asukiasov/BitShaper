## Why

Three `samples/screens2/` reference screenshots (chevron herringbone, a corner fan of
zigzag lines, a row of pointed pickets) have no counterpart in the curated catalog. They
are buildable — approximately — from the current primitive set (`diagonal-band`, `step`,
`wedge`, `fill`), so they belong in "Curated marks" alongside the other `from-sample`
entries.

As with the `step`-based and `morph` marks, these are held to "reads as a deliberate
design that fills the canvas", not a pixel match — the screens2 references pack their
lines non-uniformly, which a uniform grid cannot reproduce faithfully.

## What Changes

- Append three marks to `src/library/catalog.json` (42 → 45), each tagged `from-sample`:
  - **Chevron Column** — 4×4 `diagonal-band`, alternating `/` and `\` halves stacked into
    a herringbone chevron weave.
  - **Zag Fan** — 4×4 `step` + `fill`, a solid corner block with a jagged dogleg
    staircase hypotenuse.
  - **Pointed Pickets** — 8×4 `wedge` roofs over `fill` shafts with empty gap columns —
    three pentagonal bars.

Each ID round-trips (`encodeShapeId(decodeShapeId(id)) === id`) and renders without error,
so `test/library/index.test.ts`'s per-entry assertions cover them automatically.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. Pure data append to the curated catalog; no code or API change.

## Impact

- `src/library/catalog.json` gains 3 entries (42 → 45). No change to `src/library/index.ts`,
  the core package, the CLI, or `web/` — the catalog view and CLI `list` render them
  automatically.
- `test/library/index.test.ts` and `test/cli/commands/list.test.ts` need no changes (both
  iterate the catalog dynamically).
