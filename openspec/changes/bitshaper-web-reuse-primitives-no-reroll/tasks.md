## 1. `web/src/main.ts`

- [ ] 1.1 In `reusePrimitives`, delete the `submitGeneratorForm(generatorForm)` call. Keep
      `setPrimitiveMix`, `setGridSize`, the seed clear, and `generatorSection.scrollIntoView`.
- [ ] 1.2 Confirm no other call site depends on `reusePrimitives` regenerating (grep
      `reusePrimitives`, `onReuse`).

## 2. `web/src/primitive-usage.ts`

- [ ] 2.1 Change the reuse button's `textContent` to `"Use these primitives"` and `title` to
      `"Load this mark's primitives and grid into the generator"`. Leave `className` and the
      `onReuse` call unchanged.

## 3. `web/src/style.css`

- [ ] 3.1 Only if the longer label overflows `.reuse-primitives-button`: adjust its
      min-width / padding. No new tokens.

## 4. Tests

- [ ] 4.1 `web/test/primitive-usage.test.ts`: update any assertion of the old button
      text/title to the new strings.
- [ ] 4.2 `web/test/primitive-usage.test.ts`: clicking the button still calls `onReuse` once
      with the shape's ascending distinct primitive indices and `{ cols, rows }`.
- [ ] 4.3 Add/adjust a test proving the reuse path does not regenerate: invert or remove any
      existing "reuse triggers a new mark" assertion; assert the callback does not itself
      produce a new shape ID (the callback is pure config now).

## 5. Verification

- [ ] 5.1 `npm run test --workspace web` — all pass.
- [ ] 5.2 `npm run lint` and `npm run build` at the root pass.
- [ ] 5.3 `npm run build --workspace web`; `vite preview` + manual/Playwright check: load a
      catalog mark, click "Use these primitives", confirm the generator's checkboxes + grid
      update, the seed clears, the page scrolls to the generator, and the previewed mark /
      shape ID are unchanged. Then hit Randomize and confirm it generates within that palette.
