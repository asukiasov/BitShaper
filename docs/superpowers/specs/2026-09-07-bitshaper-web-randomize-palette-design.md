# BitShaper web — Randomize draws from the shape's palette (Change G)

**Date:** 2026-09-07
**Status:** accepted

Feedback: *"Randomize should generate from [what's] used in this shape. Allowed
should be removed."* — the primitive toggles stop being a standalone allow-list
and instead track the current shape's palette.

## Model

The Composition panel's primitive chips are still checkboxes, but there is no
separate "allowed" concept:

- **Loading any shape** (example, Randomize, Surprise me, Trace, Back/forward,
  cell edit) **checks exactly the primitives that shape uses** and unchecks the
  rest. Each checked chip shows its `×N` cell count.
- **🎲 Randomize** generates a new shape from the **checked** primitives — so by
  default "another shape from this palette". The user can check/uncheck chips
  first to widen or narrow it.
- **🎲 Surprise me** generates from **every** primitive regardless of the checks
  (the freshly loaded shape then re-checks to its own palette).
- With nothing checked (or no shape yet), 🎲 Randomize falls back to all
  primitives, so it never dead-ends.

## Changes

`web/src/composition-panel.ts`:
- `allowedTypes()` → `checkedTypes()`.
- `showUsage(shape)` → `reflectShape(shape)`: now also sets each toggle's
  `aria-pressed` to match (was badges/`data-used` only).
- `clearUsage()` → `clearBadges()` (badges + `data-used` only; leaves checks).
- Removed the unused `fillSeed()` from the handle.
- Legend text: *"🎲 Randomize draws from the checked primitives. Loading a
  shape checks the ones it uses (×N)."*
- Button titles updated ("from the checked primitives below" / "from every
  primitive").

`web/src/main.ts`:
- `randomizeFrom(types)` falls back to `ALL_PRIMITIVE_TYPES` when `types` is
  empty; `onRandomize` passes `composition.checkedTypes()`, `onSurprise` passes
  all.
- `syncComposition` calls `reflectShape` / `clearBadges`.

The three toggle CSS states are unchanged and still map: unchecked (dashed,
dim, struck through), checked-and-in-shape (accent fill + `×N`),
checked-but-not-in-shape (plain outline — a primitive the user added for the
next roll).

## Tests

- `composition-panel.test.ts` — `checkedTypes` rename; `reflectShape` checks
  exactly the used primitives and unchecks the rest; `clearBadges` only clears
  badges; Surprise me still doesn't mutate the toggles at the panel level.
- No `src/core` change.
