# BitShaper web — unified Composition panel (Change B)

**Date:** 2026-09-06
**Status:** accepted

Third slice of the second web-feedback round. Folds the two separate
primitive-control surfaces (the Generate tab's form and the preview's
"Primitives used" strip) into one always-visible panel, per user request:
*"I prefer to have using / unusing primitives in one place… under Morph a list
of all primitives; when an example is chosen we see which are used. Randomize,
columns and rows should be here too."*

Prereqs: Change A (merged). Sibling follow-ups: Change C (new primitives),
Change D (Poster tab).

## Layout

`.preview-section`, top to bottom (everything below the sticky block scrolls,
and the whole section shows under every tab):

1. `.preview-sticky` — preview + shape-ID row + `Copy ID` / `SVG` / `PNG`
   (unchanged from Change A).
2. **`.composition-panel`** — NEW (see below).
3. Morph panel (`.morph-panel`) — moved to here; was below the primitive-usage
   strip. No behavioural change.
4. Pattern control (`.tile-repeat`) + its hint.
5. History hint.

Tab bar becomes **`create` / `trace`**. `create` renders the examples gallery
(the `renderCatalogView` output, previously the `examples` tab). The `poster`
tab is intentionally NOT added here — it ships with Change D. An old
`#examples` / `#generate` / `#marks` hash falls through to `create`.

The **Generate tab** (`generatorSection`, `buildGeneratorForm`) and the
**primitive-usage strip** (`primitiveUsageContainer`, `renderPrimitiveUsage`,
the "Use these primitives" button and its `reusePrimitives` plumbing) are
removed.

## Composition panel

`buildCompositionPanel(container, opts)` → `CompositionPanelHandle`.

### DOM

- **Controls row** (`.composition-controls`):
  - `Columns` number input (`name="cols"`, min 1, max 8, default 4)
  - `Rows` number input (`name="rows"`, min 1, max 8, default 4)
  - `Seed` text input (`name="seed"`, placeholder "optional") + `Copy` button
    (`.copy-seed-button`, copies the current field value, no-op on empty, same
    "Copied!" affordance as Change A)
  - `Randomize` button (`.randomize-button`)
- **Seed hint** (`.seed-hint`): *"Same seed → same shape from Randomize. To
  share an exact shape, copy its ID or URL instead."*
- **Primitives** (`.composition-primitives`): one `<button role="switch">` per
  `listPrimitives()` entry — `.primitive-toggle`, `aria-pressed` reflecting
  allow-state, containing the primitive icon (`renderPrimitiveIcon`) + name +
  a `.primitive-toggle-badge` span (empty unless the loaded shape uses it).
  All toggles start pressed (allowed).

### Handle

```ts
interface CompositionPanelHandle {
  readonly element: HTMLElement;
  allowedTypes(): number[];        // pressed toggles, registry indices ascending
  gridSize(): { cols: number; rows: number };
  seedValue(): string;             // trimmed
  fillSeed(seed: string): void;    // set the seed field (Randomize auto-fills a blank)
  syncGrid(shape: ShapeDef): void; // set cols/rows inputs to the shape's grid
  showUsage(shape: ShapeDef): void;// badge + highlight the toggles this shape uses; clears others
  clearUsage(): void;
}
```

### Behaviour

- `Randomize` click: if the seed field is blank, fill it with `randomSeed()`
  (left visible); then call `opts.onRandomize()`. `main.ts` wires that to
  `generateFilteredShapeId(seedValue(), gridSize(), allowedTypes())` →
  `showShape(applyRampToShapeId(id, ramp), { push: true })`. No-op if
  `allowedTypes()` is empty (mirrors the old form).
- Toggling a primitive: flips its `aria-pressed`. Pure allow-list — it does
  **not** re-render or re-map the current shape. Takes effect on the next
  `Randomize`.
- `showUsage(shape)`: for each toggle, set `.primitive-toggle-badge` to
  `×${count}` when the shape has cells of that type (blank otherwise) and set
  `data-used` accordingly for the highlight. Never changes `aria-pressed`.
- `syncGrid(shape)`: writes `shape.cols` / `shape.rows` into the inputs.

`main.ts` `showShape()` calls `panel.showUsage(decoded)` + `panel.syncGrid(decoded)`
(guarded by a decode try/catch); the error branch calls `panel.clearUsage()`.

## Shared helpers

Move out of the deleted `generator-form.ts` into a new
`web/src/generate.ts` (pure, no DOM):

- `applyPrimitiveMix(shape, allowedTypes)`
- `remapCellToAllowedType` (internal)
- `generateFilteredShapeId(seed, grid, allowedTypes)`
- `randomSeed()`

`summarizePrimitiveUsage(shape)` moves from `primitive-usage.ts` into
`generate.ts` too; `primitive-usage.ts` is deleted. `primitive-icon.ts`
(`renderPrimitiveIcon`) is unchanged and now imported by `composition-panel.ts`.

`setPrimitiveMix` / `setGridSize` / `submitGeneratorForm` / `readTileable` /
`readGridSize` / `readSelectedPrimitiveTypes` are dropped (only the removed
form used them).

## Tests

- **New** `web/test/composition-panel.test.ts`:
  - all toggles start pressed; `allowedTypes()` reflects toggling
  - `Randomize` with a blank seed auto-fills and calls `onRandomize`; the
    generated id (wired through a fake `onRandomize`) decodes; deterministic
    for a fixed seed/grid/allow-set
  - `Randomize` is a no-op when every toggle is off
  - `showUsage` badges only the used primitives and never changes `aria-pressed`
  - `syncGrid` writes the shape's grid into the inputs
  - `Copy` button copies the seed value (stubbed clipboard)
- **New** `web/test/generate.test.ts` — the moved pure helpers
  (`generateFilteredShapeId` determinism + primitive-subset guarantee,
  `summarizePrimitiveUsage` counts/order). Reuses the old generator-form /
  primitive-usage assertions.
- **Delete** `web/test/generator-form.test.ts`, `web/test/primitive-usage.test.ts`.
- **Update** `web/test/main-layout.test.ts`: tabs are `create` / `trace`
  (no `generate`, no `examples`); assert `.composition-panel` exists in
  `.preview-section` and is visible while the `trace` tab is active; drop the
  Examples-label test (retarget to `create`).
- **Update** `web/test/preview-ux.test.ts`: remove the
  `.reuse-primitives-button` test; keep the history-hint ordering test
  (retarget the "before the ramp panel" assertion if needed).

## Non-goals

- No core/codec changes. No new primitives (Change C). No Poster tab
  (Change D). No live re-mapping on toggle. No change to Morph, Trace, or the
  cell editor.
