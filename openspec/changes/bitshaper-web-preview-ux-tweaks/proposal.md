## Why

Feedback after `bitshaper-web-cell-editor` and `bitshaper-web-reuse-primitives-no-reroll`
shipped:

1. The cell-edit popover opens on top of the cell being edited — you can't see the change as
   you make it.
2. "Use these primitives" scrolls the page down; the user wanted it to silently configure the
   generator and stay put.
3. Rapid Randomize clicks are recoverable via browser Back/Forward already, but nobody knows
   that.

Full design: `docs/superpowers/specs/2026-08-28-bitshaper-web-preview-ux-tweaks-design.md`.

## What Changes

- `web/src/cell-editor.ts` — `openPopover` positions the panel **beside** the selected cell
  (right → left → below → above, first side that fits inside the preview container), never
  overlapping it; falls back to the roomiest side pushed maximally away from the selected cell
  when the grid fills the container. Selected-cell highlight retained. New
  `--cell-popover-gap` spacing.
- `web/src/main.ts` — `reusePrimitives` drops the `generatorSection.scrollIntoView(...)` call
  and its doc-comment clause.
- `web/src/main.ts` (layout) — add a subtle `.section-hint` line under the shape-ID row:
  "Randomized a few times? Use your browser's Back button to step through previous marks."
- `web/src/style.css` — `--cell-popover-gap`; any positioning tweak the new logic needs.
- `web/test/cell-editor.test.ts`, `web/test/primitive-usage.test.ts` — updated/added
  assertions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-app`: cell-edit popover placement (beside the cell, not over it); the primitive-reuse
  control no longer scrolls; a hint points at browser history for stepping through previous
  marks. (Capability spec delta lives with the not-yet-archived `bitshaper-web-app` change.)

## Impact

- Modified: `web/src/cell-editor.ts`, `web/src/main.ts`, `web/src/style.css`,
  `web/test/cell-editor.test.ts`, `web/test/primitive-usage.test.ts`.
- No new files. No change to the root `bitshaper` package, codec, registry, primitives,
  catalog, CLI, or the ramp panel. `showShape` signature unchanged.
- No new history/undo data structure — browser history already covers it, deliberately.
- `pages.yml` already deploys on `web/**` changes.
