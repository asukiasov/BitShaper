## Why

The web app can browse, generate, ramp, and export marks — but it cannot change a single
cell. To nudge one box (pixel) of a generated mark, a user has to hand-edit the base62 shape
ID. This adds a direct-manipulation cell editor: click a cell in the preview, set its
primitive type, rotation, and invert, and the shape ID re-encodes live.

Full design: `docs/superpowers/specs/2026-08-28-bitshaper-web-cell-editor-design.md`.

## What Changes

- New `web/src/primitive-icon.ts` — extract the private `renderPrimitiveIcon` from
  `primitive-usage.ts` into a shared module (both the usage chips and the editor picker need
  it); `primitive-usage.ts` imports it.
- New `web/src/cell-editor.ts` — `buildCellEditor(container, { onEdit })` →
  `{ element, render(shapeId) }`. `render` decodes the ID and lays a transparent `cols × rows`
  CSS-grid overlay of hit targets over the preview SVG. Cells highlight on hover; clicking one
  opens a popover with a primitive picker (all registered primitives), a 0/90/180/270
  rotation control, and an invert checkbox. Any change emits a **base** shape ID (no ramp)
  via `onEdit`.
- New helper `replaceCell(shapeId, index, cell)` in `web/src/shape-state.ts` — re-encode with
  one `CellDef` swapped, preserving any ramp; `RangeError` on out-of-bounds; input returned
  unchanged if undecodable.
- `web/src/main.ts` — build the editor once over the preview; `showShape`, the initial-URL
  path, and `popstate` call `cellEditor.render`. `onEdit` re-layers the Morph panel's current
  ramp: `showShape(applyRampToShapeId(baseId, rampPanel.currentRamp()), { push: true })`.
- `web/src/style.css` — `.preview-container { position: relative }`, `.cell-overlay`,
  `.cell-hit`, `.cell-popover`. Reuse existing tokens.
- New `web/test/cell-editor.test.ts`; extend `web/test/shape-state.test.ts`; touch
  `web/test/primitive-usage.test.ts` for the icon import path.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-app`: gains direct per-cell editing in the preview view (click a cell → set
  type/rotation/invert → shape ID re-encodes, any active ramp preserved). The capability's
  spec delta lives with the not-yet-archived `bitshaper-web-app` change; this change adds a
  requirement for cell editing.

## Impact

- New files: `web/src/primitive-icon.ts`, `web/src/cell-editor.ts`,
  `web/test/cell-editor.test.ts`.
- Modified: `web/src/main.ts` (wire the editor), `web/src/primitive-usage.ts` (icon import),
  `web/src/shape-state.ts` (`replaceCell`), `web/src/style.css`,
  `web/test/shape-state.test.ts`, `web/test/primitive-usage.test.ts`.
- No change to the root `bitshaper` package (`src/`, published API, CLI), the codec, the
  registry, the primitives, or the catalog. `showShape` keeps its signature. Export SVG/PNG
  unaffected (overlay is a sibling of the SVG, never inside it).
- Out of scope: grid resize, drag-paint, multi-select, keyboard nav.
- `pages.yml` already deploys on `web/**` changes.
