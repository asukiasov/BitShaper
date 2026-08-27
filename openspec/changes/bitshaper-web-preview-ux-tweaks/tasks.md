## 1. `web/src/cell-editor.ts` — popover beside the cell

- [x] 1.1 In `openPopover`, replace the clamp-to-container positioning block with side
      selection: compute candidate rects for right / left / below / above the selected cell
      (gap from `--cell-popover-gap`, default 8px); pick the first that fits fully inside the
      `root` box **and** does not intersect the cell's rect.
- [x] 1.2 Fallback when none fit: choose the axis with more free space, place the panel flush
      to the far container edge on that axis (maximally away from the cell), clamp the cross
      axis into the container.
- [x] 1.3 Keep coordinates relative to `root`; `panel.style.left/top` set the same way.
      Leave popover contents, listeners, focus handling, and the reopen-after-edit path
      unchanged.
- [x] 1.4 Confirm the selected `.cell-hit` gets `aria-pressed="true"` while the popover is
      open (already implemented — just keep it).

## 2. `web/src/main.ts` — reuse does not scroll

- [x] 2.1 Delete `generatorSection.scrollIntoView({ behavior: "smooth", block: "start" })`
      from `reusePrimitives`.
- [x] 2.2 Update the `reusePrimitives` doc comment to drop the "scrolls the generator into
      view" clause. Clean any now-unused binding per biome.

## 3. `web/src/main.ts` — previous-marks hint

- [x] 3.1 In `buildLayout`, after `shapeIdRow` and before `rampPanelContainer`, append a
      `<p class="section-hint">` with text: "Randomized a few times? Use your browser's Back
      button to step through previous marks."

## 4. `web/src/style.css`

- [x] 4.1 Add `--cell-popover-gap: 8px;` to the web token block.
- [x] 4.2 Only if needed for the popover to fit beside a cell in a small preview: cap
      `.cell-popover` `max-width` with an existing spacing token. No new palette.

## 5. Tests

- [x] 5.1 `web/test/cell-editor.test.ts`: stub `getBoundingClientRect` on the hit button and
      `root`, and `offsetWidth`/`offsetHeight` on the panel (pattern of the existing
      overlay-sizing tests). Assert: popover rect does not intersect the selected cell's rect
      and is within the container; a cell near the right edge places the popover to the left;
      the selected `.cell-hit` has `aria-pressed="true"` while open.
- [x] 5.2 `web/test/primitive-usage.test.ts` (or a main-flow check): activating the reuse
      control does not call `scrollIntoView` (spy) and does not change the previewed shape ID.
- [x] 5.3 A DOM check that the history hint `<p class="section-hint">` with the expected text
      is present in the built preview section.

## 6. Verification

- [x] 6.1 `npm run test --workspace web` — all pass.
- [x] 6.2 `npm run lint` and `npm run build` at the root pass.
- [ ] 6.3 `npm run build --workspace web`; `vite preview` + manual/Playwright: click cells in
      all four corners of the grid — popover never covers the clicked cell and stays on-screen;
      "Use these primitives" updates the generator without scrolling; rapid-Randomize then
      browser Back several times returns each previous mark.
