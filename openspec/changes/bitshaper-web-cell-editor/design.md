## Context

Full design + rationale: `docs/superpowers/specs/2026-08-28-bitshaper-web-cell-editor-design.md`.
This is the condensed implementation reference.

Constraints:
- No core-package change. The web app consumes `bitshaper`'s public API only
  (`decodeShapeId`, `encodeShapeId`, `renderShape`, `listPrimitives`, and the
  `CellDef` / `ShapeDef` / `Rotation` types).
- Match the existing vanilla-DOM style of `web/src/generator-form.ts` / `ramp-panel.ts` — no
  framework, explicit element creation.
- `showShape(shapeId, opts?)` keeps its signature.
- The editor edits the discrete base grid only. The Morph panel remains the sole ramp
  authority; `cell-editor.ts` emits a base ID (no `~` block) and `main.ts` re-layers the ramp
  via `applyRampToShapeId(baseId, rampPanel.currentRamp())` — the same composition used for
  `onGenerate`.
- Grid dimensions are never changed by this editor.

## Decisions

### `web/src/primitive-icon.ts` (new)

Move the private `renderPrimitiveIcon` out of `primitive-usage.ts`:

```ts
/** Renders one primitive (rotation 0, uninverted) as a small standalone SVG string. */
export function renderPrimitiveIcon(primitiveIndex: number, size = 24): string;
```

`primitive-usage.ts` imports it instead of defining it. No behaviour change there.

### `web/src/shape-state.ts` — `replaceCell` (new)

```ts
import type { CellDef } from "bitshaper";

/**
 * Returns `shapeId` re-encoded with the cell at `index` replaced by `cell`,
 * preserving any ramp modifier. Throws `RangeError` if `index` is out of
 * bounds for the decoded grid. Returns `shapeId` unchanged if it cannot be
 * decoded (mirrors `applyRampToShapeId`).
 */
export function replaceCell(shapeId: string, index: number, cell: CellDef): string {
  let shape: ShapeDef;
  try { shape = decodeShapeId(shapeId); } catch { return shapeId; }
  if (index < 0 || index >= shape.cells.length) {
    throw new RangeError(`cell index ${index} out of range (0..${shape.cells.length - 1})`);
  }
  const cells = shape.cells.map((c, i) => (i === index ? cell : c));
  return encodeShapeId(shape.ramp ? { ...shape, cells, ramp: shape.ramp } : { cols: shape.cols, rows: shape.rows, cells });
}
```

This is the canonical, tested "swap one cell" operation. `cell-editor.ts` itself emits a
base ID and lets `main.ts` re-layer the ramp, so it does not call `replaceCell`; the helper
exists for tests and future consumers and keeps encode logic out of the DOM module.

### `web/src/cell-editor.ts` (new)

```ts
import type { CellDef } from "bitshaper";

interface CellEditorOptions {
  /** Called with a base shape ID (no ramp) whenever a cell is edited. */
  readonly onEdit: (baseShapeId: string) => void;
}
interface CellEditorHandle {
  readonly element: HTMLElement;
  /** Rebuild the overlay for `shapeId`. Undecodable ID → overlay cleared, no throw. */
  render(shapeId: string): void;
}
export function buildCellEditor(container: HTMLElement, opts: CellEditorOptions): CellEditorHandle;
```

- `element` is a `div.cell-overlay-root` appended into `container` (the preview wrapper);
  `container` must be `position: relative` and hold the preview `<svg>` as a sibling.
- `render(shapeId)`:
  - `decodeShapeId` guarded — on failure, empty the overlay root and return.
  - Read `cols`, `rows`, `cells`. Rebuild `div.cell-overlay`
    (`position:absolute; inset:0; display:grid; grid-template-columns: repeat(cols,1fr);
    grid-template-rows: repeat(rows,1fr)`).
  - Append `cols*rows` `<button type="button" class="cell-hit" data-index=i>`.
  - Cache the decoded `{ cols, rows, cells }` in a closure for the click handler.
- Click a `.cell-hit`:
  - mark it selected (`aria-pressed` / class), build `div.cell-popover` positioned near the
    button via `getBoundingClientRect`, clamped inside `container`.
  - Popover contents from `cells[index]`:
    - **primitive picker** — `listPrimitives()` → one `<button class="cell-primitive">` per
      entry, `innerHTML = renderPrimitiveIcon(p.index)`, current type marked selected;
    - **rotation** — segmented `<button>` group for `0 | 90 | 180 | 270` (`Rotation`);
    - **invert** — `<input type="checkbox">`.
  - Any change: `const updated: CellDef = { type, rotation, invert }`;
    `const next = cells.map((c, i) => i === index ? updated : c)`;
    `opts.onEdit(encodeShapeId({ cols, rows, cells: next }))`.
  - Popover closes on `Esc`, outside pointerdown, or selecting a different cell.
- No framework; follow `ramp-panel.ts` structure.

### `web/src/main.ts` — wiring

- `buildLayout`: give `.preview-container` `position: relative` (via a class in `style.css`)
  and return it (or a dedicated child wrapper) as `overlayContainer`.
- `initApp`:
  ```ts
  const cellEditor = buildCellEditor(overlayContainer, {
    onEdit: (baseId) =>
      showShape(applyRampToShapeId(baseId, rampPanel.currentRamp()), { push: true }),
  });
  ```
- `showShape(shapeId)`: add `cellEditor.render(shapeId)` next to `renderPreview` /
  `renderPrimitiveUsage`.
- Initial-URL `decoded` branch and the `popstate` handler: add `cellEditor.render(shapeId)`.
- `rampPanel.currentRamp()` accessor already exists (used by `onGenerate`).

### `web/src/style.css`

- `.preview-container { position: relative }`
- `.cell-overlay` (absolute grid, `pointer-events` on children only)
- `.cell-hit` — `background: transparent; border: 0`; `:hover` / `:focus-visible` →
  subtle outline + faint fill using existing tokens
- `.cell-popover` — small absolutely-positioned panel; primitive icons in a wrap grid;
  segmented rotation control; reuse `.button`-style classes and color tokens; no new palette

## Risks / trade-offs

- **Overlay alignment** depends on the preview SVG filling `.preview-container` with a
  `size × size` viewBox and no letterboxing. Confirm against `renderShape` output during
  implementation; if the SVG is centered with margins, size `.cell-overlay` to the SVG's
  rendered box rather than `inset: 0`.
- **Popover placement** near edge cells needs clamping to the container — handled explicitly.
- **History spam**: every cell edit is a pushed entry. Acceptable — matches
  catalog/generate and makes each edit individually undoable. (A future refinement could
  coalesce rapid edits.)
- **Arc-flattened ramped shapes**: unaffected — the overlay reads `cols`/`rows`/`cells`, not
  path data.

## Migration

None. Additive web-app feature. Existing IDs, catalog, exports, and the ramp panel are
unchanged.
