# BitShaper — Web cell editor (edit one box / pixel)

**Date:** 2026-08-28
**Status:** design approved, pending implementation plan

## Goal

Let a user click a single cell in the preview and set what is in it — its primitive
**type**, **rotation** (0/90/180/270), and **invert** — directly. The shape ID re-encodes and
the whole app (preview, ID field, URL, primitive-usage breakdown) updates. The editor
manipulates the discrete base grid; an active ramp/morph is preserved and re-applied on top.

## Non-Goals (YAGNI)

- Changing grid dimensions (add/remove rows or columns) — the grid is fixed by the loaded
  mark. Resizing stays the generator's job.
- Drag-to-paint across cells, multi-select, keyboard navigation, copy/paste of cells.
- Any change to the `bitshaper` core package, the codec, the registry, or the CLI. The web
  app consumes the public API only (`decodeShapeId`, `encodeShapeId`, `renderShape`,
  `listPrimitives`, the `CellDef` / `ShapeDef` / `Rotation` types).
- Editing the ramp from the overlay — the Morph panel still owns the ramp.

## Concept

The preview SVG has a fixed viewBox of `size × size` (default 256). A cell's box is
`size / cols` wide by `size / rows` tall, laid out row-major. The editor overlays a CSS-grid
of transparent hit targets exactly over that geometry — one `<button>` per cell,
`cols × rows` of them.

- Cells are invisible until hover (a quiet outline / fill on `:hover` and `:focus`). No "edit
  mode" toggle — the overlay is always live but visually silent until pointed at.
- Clicking a cell selects it and opens a small **popover** anchored to that cell:
  - **primitive picker** — one icon button per registered primitive (`listPrimitives()`),
    the current type marked selected;
  - **rotation** — a 0 / 90 / 180 / 270 segmented control;
  - **invert** — a checkbox.
- Any change in the popover builds the next base `ShapeDef` (the `cells` array with that one
  `CellDef` replaced, `cols`/`rows` untouched, **no `ramp`**), encodes it, and calls
  `onEdit(baseShapeId)`.
- `main.ts`'s `onEdit` handler re-layers the current Morph-panel ramp —
  `showShape(applyRampToShapeId(baseId, rampPanel.currentRamp()), { push: true })` — the same
  composition already used for `onGenerate`. Each edit is a pushed history entry, so browser
  back undoes it.

The popover closes on outside-click, `Esc`, or selecting another cell.

## Modules

### New — `web/src/primitive-icon.ts`

Extract `renderPrimitiveIcon(primitiveIndex, size?)` (currently private in
`primitive-usage.ts`) into a shared module; `primitive-usage.ts` imports it. Both the usage
chips and the editor's picker need it.

### New — `web/src/cell-editor.ts`

```ts
import type { CellDef } from "bitshaper";

interface CellEditorOptions {
  /** Called with a base shape ID (no ramp) whenever a cell is edited. */
  readonly onEdit: (baseShapeId: string) => void;
}
interface CellEditorHandle {
  readonly element: HTMLElement;
  /** Rebuild the overlay for `shapeId`. Invalid ID → overlay cleared. */
  render(shapeId: string): void;
}
export function buildCellEditor(container: HTMLElement, opts: CellEditorOptions): CellEditorHandle;
```

- `render(shapeId)`: `decodeShapeId` (guarded — on failure clear the overlay and return);
  read `cols`, `rows`, `cells`; build a `div.cell-overlay` with
  `grid-template-columns: repeat(cols, 1fr)` / rows, sized to overlay the sibling SVG
  (`position: absolute; inset: 0`); append `cols × rows` `<button.cell-hit>` elements, each
  `data-index`.
- Click handler: record the selected index, render the popover near the button
  (`getBoundingClientRect` for placement, clamped to the container), populate it from
  `cells[index]`.
- Popover change → `const next = cells.map((c, i) => i === index ? updatedCell : c)`;
  `opts.onEdit(encodeShapeId({ cols, rows, cells: next }))`.
- Vanilla DOM throughout, matching `web/src/generator-form.ts` / `ramp-panel.ts`.

### `web/src/shape-state.ts` — new helper

```ts
/**
 * Returns `shapeId` re-encoded with the cell at `index` replaced by `cell`,
 * preserving any ramp. Throws `RangeError` if `index` is out of bounds.
 * Returns `shapeId` unchanged if it cannot be decoded.
 */
export function replaceCell(shapeId: string, index: number, cell: CellDef): string;
```

Used by tests and available to any future consumer. `cell-editor.ts` itself emits a base ID
(no ramp) and lets `main.ts` re-layer the ramp, so it does not call `replaceCell` — but the
helper is the canonical, tested "swap one cell" operation and keeps that logic out of the DOM
module.

### `web/src/main.ts` — wiring

- In `buildLayout`: wrap the preview SVG container so an absolutely-positioned overlay can sit
  on top; return an `overlayContainer` handle.
- In `initApp`:
  `const cellEditor = buildCellEditor(overlayContainer, { onEdit: (baseId) =>
  showShape(applyRampToShapeId(baseId, rampPanel.currentRamp()), { push: true }) });`
- `showShape(shapeId)` also calls `cellEditor.render(shapeId)` (alongside `renderPreview` /
  `renderPrimitiveUsage`).
- Initial-URL and `popstate` paths call `cellEditor.render` too.

### `web/src/style.css`

`.preview-container` gets `position: relative`. `.cell-overlay` (absolute grid),
`.cell-hit` (transparent, `:hover` / `:focus-visible` outline), `.cell-popover` (small
floating panel: primitive icon grid, rotation segmented control, invert checkbox). Reuse
existing color tokens; no new palette.

## Interactions with existing features

- **Export SVG / PNG** read `previewContainer.querySelector("svg")`. The overlay is a sibling
  `div`, never inside the SVG, so exports are unaffected.
- **Ramp / Morph panel** stays the sole ramp authority; the overlay always shows and edits
  the discrete base grid. Editing a cell keeps the ramp applied via `main.ts`.
- **Catalog / generator / popstate** all route through `showShape`, so the overlay
  re-renders automatically.
- **Invalid ID in URL**: `renderPreview` shows its error; `cellEditor.render` clears the
  overlay (no crash).

## Testing

### `web/test/cell-editor.test.ts` (new, jsdom + vitest — pattern of `ramp-panel.test.ts`)

- A decoded `2×3` ID → overlay has 6 `.cell-hit` buttons with `data-index` 0–5.
- An undecodable ID → overlay is empty, no throw.
- Click cell 2, pick primitive `fill` in the popover → `onEdit` called once with an ID that
  `decodeShapeId`s to the same `cols/rows` with only `cells[2].type` changed.
- Rotation control → `onEdit` ID has `cells[i].rotation` = chosen value, others intact.
- Invert checkbox → `cells[i].invert` toggled, others intact.
- The emitted ID carries no `~` block even when the input ID did (base-only emission).
- Popover closes on `Esc` / outside click.

### `web/test/shape-state.test.ts` (extend)

- `replaceCell` round-trips: replacing a cell then decoding yields the expected `cells`.
- `replaceCell` preserves a `~` ramp block on the ID.
- Out-of-range `index` → `RangeError`; undecodable ID → returned unchanged.

### `web/test/primitive-usage.test.ts` (touch)

- Still renders icons after `renderPrimitiveIcon` moves to `primitive-icon.ts` (import-path
  only).

### Verification

- `npm run test --workspace web`, `npm run lint`, `npm run build` (root) pass.
- `npm run build --workspace web`; `vite preview` + Playwright: load a catalog mark, hover a
  cell (outline appears), click it, change primitive + rotation + invert, confirm the preview
  and shape-ID field update and browser-back reverts each edit; repeat with a ramped `?id=`
  and confirm the morph stays applied.

## OpenSpec change

`openspec/changes/bitshaper-web-cell-editor/` — modifies the `web-app` capability: a new
"Direct cell editing" requirement (click a cell → set type/rotation/invert → ID re-encodes,
ramp preserved).
