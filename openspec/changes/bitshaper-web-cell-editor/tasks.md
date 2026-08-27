## 1. `web/src/primitive-icon.ts` — extract shared icon renderer

- [x] 1.1 New module exporting `renderPrimitiveIcon(primitiveIndex: number, size = 24): string`
      — the body currently private in `web/src/primitive-usage.ts` (encode a 1×1 shape,
      `renderShape(id, { size })`).
- [x] 1.2 `web/src/primitive-usage.ts`: delete the local function, import from
      `./primitive-icon.js`. No behaviour change.
- [x] 1.3 `web/test/primitive-usage.test.ts`: fix the import if it referenced the internal;
      existing assertions still pass.

## 2. `web/src/shape-state.ts` — `replaceCell`

- [x] 2.1 Add `replaceCell(shapeId, index, cell: CellDef): string`: decode (return input
      unchanged on failure), `RangeError` if `index` out of `0..cells.length-1`, map the
      cells with that one replaced, re-encode **preserving `shape.ramp`**.
- [x] 2.2 `web/test/shape-state.test.ts`: round-trip (replace → decode → expected cells);
      ramp `~` block preserved through a replace; out-of-range → `RangeError`; undecodable
      ID → returned unchanged.

## 3. `web/src/cell-editor.ts` — overlay + popover

- [x] 3.1 `buildCellEditor(container, { onEdit })` → `{ element, render(shapeId) }`. Vanilla
      DOM, structured like `web/src/ramp-panel.ts`. `element` is `div.cell-overlay-root`
      appended to `container`.
- [x] 3.2 `render(shapeId)`: `decodeShapeId` guarded — on failure empty the root and return.
      Build `div.cell-overlay` (`position:absolute; inset:0; display:grid;
      grid-template-columns/rows: repeat(cols/rows, 1fr)`), append `cols*rows`
      `<button.cell-hit data-index=i>`. Cache decoded `{ cols, rows, cells }` in closure.
- [x] 3.3 Click `.cell-hit`: select it, build `div.cell-popover` near the button
      (`getBoundingClientRect`, clamped inside `container`). Populate from `cells[index]`:
      primitive picker (`listPrimitives()` → icon buttons via `renderPrimitiveIcon`, current
      marked), rotation segmented control `0|90|180|270`, invert checkbox.
- [x] 3.4 On any popover change: build `updated: CellDef = { type, rotation, invert }`,
      `next = cells.map((c,i) => i === index ? updated : c)`,
      `onEdit(encodeShapeId({ cols, rows, cells: next }))` — no ramp in the emitted ID.
- [x] 3.5 Popover closes on `Esc`, outside `pointerdown`, or selecting a different cell.
- [x] 3.6 During implementation, verify overlay alignment against real `renderShape` output
      (viewBox `size×size`, SVG fills container). If the SVG is letterboxed, size
      `.cell-overlay` to the SVG's rendered box instead of `inset:0`. Note the finding in the
      report.

## 4. `web/src/main.ts` — wiring

- [x] 4.1 `buildLayout`: ensure the preview SVG's container is `position: relative` (class in
      `style.css`) and return it as `overlayContainer`.
- [x] 4.2 `initApp`: `const cellEditor = buildCellEditor(overlayContainer, { onEdit: (baseId)
      => showShape(applyRampToShapeId(baseId, rampPanel.currentRamp()), { push: true }) });`
- [x] 4.3 `showShape`: call `cellEditor.render(shapeId)` alongside `renderPreview` /
      `renderPrimitiveUsage`.
- [x] 4.4 Initial-URL `decoded` branch and `popstate` handler: call `cellEditor.render`.

## 5. `web/src/style.css`

- [x] 5.1 `.preview-container { position: relative }`; `.cell-overlay` (absolute grid);
      `.cell-hit` (transparent, `:hover` / `:focus-visible` subtle outline + faint fill);
      `.cell-popover` (small floating panel — icon wrap grid, segmented rotation control,
      invert checkbox). Reuse existing color tokens / `.button` classes; no new palette.

## 6. Tests

- [x] 6.1 `web/test/cell-editor.test.ts` (jsdom + vitest, pattern of `ramp-panel.test.ts`):
      - decoded `2×3` ID → 6 `.cell-hit` buttons, `data-index` 0–5;
      - undecodable ID → overlay empty, no throw;
      - click cell 2 + pick a primitive → `onEdit` once with an ID decoding to same
        `cols/rows`, only `cells[2].type` changed;
      - rotation control → `cells[i].rotation` set, others intact;
      - invert checkbox → `cells[i].invert` toggled, others intact;
      - emitted ID has no `~` block even when the input ID carried one;
      - popover closes on `Esc` / outside click.
- [x] 6.2 Ramp re-layering is covered by decomposition: `cell-editor` emits a base ID
      (6.1), and `shape-state.test.ts`'s `applyRampToShapeId` tests prove the `main.ts`
      one-liner re-applies the ramp.

## 7. Verification

- [x] 7.1 `npm run test --workspace web` — all pass.
- [x] 7.2 `npm run lint` and `npm run build` at the root pass.
- [ ] 7.3 `npm run build --workspace web`; `vite preview` + Playwright: load a catalog mark,
      hover a cell (outline), click it, change primitive + rotation + invert, confirm preview
      + shape-ID field update and browser-back reverts each edit; repeat with a ramped `?id=`
      and confirm the morph stays applied and the Morph panel still shows it.
- [x] 7.4 Confirm Export SVG/PNG still produce the edited mark (overlay is a sibling of the
      SVG, not inside it).
