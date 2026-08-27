# BitShaper — "Reuse primitives" should not re-roll

**Date:** 2026-08-28
**Status:** design approved, pending implementation plan

## Problem

The preview's **Reuse primitives** button (`web/src/primitive-usage.ts`, wired by
`reusePrimitives` in `web/src/main.ts`) currently does three things on click:

1. sets the generator form's primitive checkboxes to the current mark's distinct types,
2. sets the generator's grid size to the current mark's grid, clears the seed,
3. **immediately calls `submitGeneratorForm`**, replacing the previewed mark with a fresh
   random one.

Step 3 is surprising: the user was studying a mark, clicked a button labelled "reuse its
primitives", and the mark vanished. The button should *prepare* the generator, not fire it.

## Change

`reusePrimitives` stops after step 2:

- `setPrimitiveMix(generatorForm, allowedTypes)` — unchanged
- `setGridSize(generatorForm, grid)` — unchanged
- clear the `seed` input — unchanged
- **remove** the `submitGeneratorForm(generatorForm)` call
- keep `generatorSection.scrollIntoView(...)` so the user sees the now-configured form

Current preview, shape ID, URL, ramp panel, and primitive-usage breakdown are all left
exactly as they were. Nothing regenerates until the user hits **Randomize** (or types a seed
and submits) themselves.

### Button affordance

Relabel the button so it no longer implies a new mark:

- text: `Reuse primitives` → `Use these primitives`
- `title`: `Generate a new mark from this same set of primitives` →
  `Load this mark's primitives and grid into the generator`

The `onReuse` callback contract in `primitive-usage.ts`
(`(allowedTypes: number[], grid: { cols, rows }) => void`) is unchanged — only its label and
what `main.ts` does in response.

## Non-Goals

- No change to the generator form, the codec, the core package, or any other web module.
- No new "apply" / "regenerate" button — Randomize already does that.

## Testing

- `web/test/primitive-usage.test.ts`: the button uses the new label/title; clicking it still
  invokes `onReuse` with the shape's ascending distinct types and its grid.
- A `main`-flow test (or `primitive-usage` wiring test): after `onReuse` fires, the previewed
  shape ID is unchanged (no regeneration). Any existing assertion that "reuse triggers a new
  mark" is inverted.
- `npm run test --workspace web`, `npm run lint`, `npm run build` all pass.

## OpenSpec change

`openspec/changes/bitshaper-web-reuse-primitives-no-reroll/` — modifies the `web-app`
capability: the primitive-reuse control configures the generator without regenerating.
