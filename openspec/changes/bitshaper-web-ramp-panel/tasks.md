## 1. `web/src/ramp-panel.ts`

- [x] 1.1 Module skeleton: `buildRampPanel(container, { onChange })` returning `{ element, setFromShape }`. Internal state `{ axis, curve, tracks: { param, fromIndex, toIndex }[] }`. Follow the vanilla-DOM style of `web/src/generator-form.ts` (no framework, explicit element creation).
- [x] 1.2 `<details class="morph-panel">` with a `<summary>Morph</summary>`, a direction `<select>` (column/row/diagonal/radial → friendly labels), and a curve `<select>` (linear/easeIn/easeOut/easeInOut/symmetric → friendly labels).
- [x] 1.3 Track row builder: param label, `from` + `to` `<input type="range" min=0 max=61 step=1>`, a live readout span (`index/31` for scale params, `(index-31)*90/31` + "°" for angle), a `✕` remove button. Wire `input` events to rebuild state → `emit()`.
- [x] 1.4 `+ add` control: lists params not yet in `tracks`, hiding `scale` when `scaleX`/`scaleY` present and hiding `scaleX`/`scaleY` when `scale` present. Adds a track defaulting to identity endpoints (index 31) — so it is visible but a no-op until dragged.
- [x] 1.5 `Remove morph` button: clears `tracks`, collapses the panel, `emit()`.
- [x] 1.6 `emit()`: build `Ramp` from state (`from`/`to` = `dequantize(index)` using `index/31` and `(index-31)*90/31`); if `tracks.length === 0` call `onChange(undefined)`, else `onChange({ axis, curve, tracks })`.
- [x] 1.7 `setFromShape(shape)`: if `shape.ramp`, set the selects, rebuild track rows (quantize each `from`/`to` back to a slider index), `open = true`; else clear tracks and `open = false`. Set DOM values directly; do **not** dispatch events.
- [x] 1.8 Expose the current ramp (a `currentRamp()` accessor or have `main.ts` cache the last `onChange` value) so `main.ts` can re-apply it on regeneration.

## 2. `web/src/main.ts` wiring

- [x] 2.1 In `buildLayout`: build the panel, append into `previewSection` after `shapeIdRow`; add its handle to the returned object.
- [x] 2.2 In `initApp`: `let currentShape: ShapeDef | null = null`. Build the panel with `onChange: applyRamp`.
- [x] 2.3 `showShape(shapeId, opts?)`: after the existing body, set `currentShape` by decoding `shapeId` (guarded — null on failure), and call `rampPanel.setFromShape(currentShape)` when non-null.
- [x] 2.4 `applyRamp(ramp)`: return early if `!currentShape`; build the next `ShapeDef` (`{ ...currentShape, ramp }` or the same without `ramp`), `showShape(encodeShapeId(next))` (default opts → `replaceState`).
- [x] 2.5 `onGenerate(generatedId)`: if the panel currently has a ramp, `showShape(encodeShapeId({ ...decodeShapeId(generatedId), ramp }), { push: true })`; otherwise unchanged.
- [x] 2.6 Initial-URL and `popstate` paths: they already call `renderPreview`; add `currentShape` assignment + `rampPanel.setFromShape` there too so the panel reflects a deep-linked ramped ID.

## 3. `web/src/style.css`

- [x] 3.1 `.morph-panel` (spacing, `summary` cursor/weight), `.morph-track` (flex row, range width), `.morph-controls` (direction/curve row). Reuse existing color tokens/'.button'-style classes; no new palette.

## 4. Tests

- [x] 4.1 `web/test/ramp-panel.test.ts` (jsdom + vitest, pattern of `web/test/generator-form.test.ts`): empty panel → `onChange(undefined)`; add a `scaleX` track and drag → `onChange` yields a `Ramp` whose `encodeShapeId` produces a `~` block that `decodeShapeId` round-trips; `setFromShape` with a ramped shape sets selects + slider indices; `+ add` omits `scale` once `scaleX` present; `Remove morph` → `onChange(undefined)`.
- [x] 4.2 "Ramp survives regeneration" is covered by decomposition rather than a `main.ts` integration test (which would need to mock `initApp`'s full DOM bootstrap): `ramp-panel.test.ts` proves `currentRamp()` returns the active ramp, and `shape-state.test.ts`'s `applyRampToShapeId` tests prove `applyRampToShapeId(generatedId, ramp)` yields a `~` block — the `onGenerate` wiring is exactly that one-line composition.

## 5. Verification

- [x] 5.1 `npm run test --workspace web` — all pass.
- [x] 5.2 `npm run lint` and `npm run build` at the root still pass (no core change, but the workspace build runs).
- [x] 5.3 `npm run build --workspace web`; serve `web/dist` via `vite preview` and Playwright-check: open the Morph panel, add a `scaleX` column track, confirm the preview morphs and the shape-ID field gains a `~` block; reload the `?id=` URL and confirm the panel repopulates; "Remove morph" clears the `~` block.
- [x] 5.4 After merge, Playwright-check the live site at https://asukiasov.github.io/BitShaper/ — panel present, a built ramped `?id=` renders and populates the panel.
