# BitShaper — Web preview UX tweaks

**Date:** 2026-08-28
**Status:** design approved, pending implementation plan
**Origin:** feedback after `bitshaper-web-cell-editor` / `bitshaper-web-reuse-primitives-no-reroll`
shipped.

Three small, independent refinements to the preview view. No core-package change.

## 1. Cell-edit popover must not cover the cell being edited

Today `openPopover` (`web/src/cell-editor.ts`) positions the panel at the clicked cell's
`left` / `bottom`, clamped to the container — so it lands directly over the selected cell and
its neighbours, hiding the change as you make it.

**Change:** anchor the popover **beside** the selected cell, never overlapping it:

- Preferred order: right of the cell → left of the cell → below → above. Pick the first side
  where the panel fits inside the preview container (`root`'s bounding box).
- Along the cross axis, align the panel edge to the cell and clamp so the whole panel stays
  inside the container.
- If no side fits fully (grid fills the container), fall back to the side with the most room
  and push the panel as far from the selected cell as the container allows — covering some
  *other* cells is acceptable; covering the *selected* one is not.
- Keep the selected cell's highlight (`.cell-hit[aria-pressed="true"]`) so the user still
  sees which cell is being edited even when the popover is adjacent.
- A small gap (`--cell-popover-gap`, ~8px) between the cell and the panel.

Pure positioning logic + a CSS variable. The popover contents, close behaviour, focus
handling, and the reopen-after-edit path are unchanged.

## 2. "Use these primitives" must not scroll

`reusePrimitives` in `web/src/main.ts` ends with
`generatorSection.scrollIntoView({ behavior: "smooth", block: "start" })`. Remove that line.
The button silently configures the generator (mix, grid, seed cleared); the user scrolls when
they choose to. Update the function's doc comment to drop the "scrolls the generator into
view" clause.

## 3. Discoverable "go back through previous marks"

Each generated / randomized mark is already a `pushState` history entry (`onGenerate` →
`showShape(…, { push: true })`), and the `popstate` handler restores it — so the browser
Back/Forward buttons already step through previous rolls, including rapid ones. The gap is
discoverability, not capability.

**Change:** add one subtle hint line in the preview section, under the shape-ID row:

> "Randomized a few times? Use your browser's Back button to step through previous marks."

Styled with the existing `.section-hint` class. No new history data structure, no new
buttons — deliberately (an in-app ring buffer duplicating browser history was considered and
rejected as redundant).

## Non-Goals

- No in-app undo stack / Prev-Next buttons (browser history already covers it).
- No change to the codec, registry, primitives, catalog, CLI, or the ramp panel.
- No change to `showShape`'s signature.

## Testing

- `web/test/cell-editor.test.ts`: with a mocked layout (cell rect + container rect), the
  popover's computed `left`/`top` place it fully outside the selected cell's rect and inside
  the container; a cell near the right edge flips the panel to the left; the selected
  `.cell-hit` keeps `aria-pressed="true"` while the popover is open.
- `web/test/primitive-usage.test.ts` / a main-flow check: activating "Use these primitives"
  does not call `scrollIntoView` (spy) and does not change the previewed shape ID.
- The history hint: assert the hint element is present in the preview section (a cheap DOM
  check where the layout is built).
- `npm run test --workspace web`, `npm run lint`, `npm run build` pass.
- Manual: rapid-randomize, then browser Back several times → each previous mark returns;
  open the cell popover near each edge → cell stays visible.

## OpenSpec change

`openspec/changes/bitshaper-web-preview-ux-tweaks/` — modifies the `web-app` capability:
popover placement beside the cell, reuse control does not scroll, previous-marks hint.
