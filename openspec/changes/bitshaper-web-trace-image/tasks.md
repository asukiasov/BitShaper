## 1. `web/src/trace/mask.ts` — pure raster helpers

- [ ] 1.1 `Mask` interface (`width`, `height`, `data: Uint8Array`, 1 = foreground).
- [ ] 1.2 `toLuminance(rgba, width, height): Float32Array` — Rec.709 weights, 0–255, alpha ignored.
- [ ] 1.3 `otsuThreshold(luminance): number` — 256-bin histogram, maximise between-class variance.
- [ ] 1.4 `binarize(luminance, width, height, threshold): Mask` — foreground where luminance `< threshold`.
- [ ] 1.5 `guessSwapForeground(mask): boolean` — foreground is majority of the 1px border ring ⇒ `true`.
- [ ] 1.6 `contentBounds(mask): {x,y,width,height} | null` — tight foreground bbox, `null` if none.
- [ ] 1.7 `cropAndSquare(mask, bounds): Mask` — crop to bounds, centre in a `max(w,h)²` background-padded square.
- [ ] 1.8 `downsample(mask, size): Mask` — area-average per target pixel, output 1 when average ≥ 0.5.

## 2. `web/src/trace/score.ts` — pure scoring + assembly

- [ ] 2.1 `iou(a, b): number` — foreground `|∩| / |∪|`; equal sizes required; empty union ⇒ 1.
- [ ] 2.2 `matchCell(cellMask, candidates: ReadonlyMap<number, Mask>): number` — argmax IoU over keys
      in ascending order; first key wins ties.
- [ ] 2.3 `assembleShapeId(n, flatIndices): string` — `i → { type: ⌊i/8⌋, rotation:
      [0,90,180,270][⌊i/2⌋%4], invert: (i&1)===1 }`, then `encodeShapeId({ cols:n, rows:n, cells })`.

## 3. `web/src/trace/rasterize.ts` — canvas glue

- [ ] 3.1 `imageFileToRgba(file, size): Promise<{data,width,height}>` — object URL → `Image`
      (`width`/`height` set to `size` before load) → white-filled `size²` canvas → `drawImage` →
      `getImageData`; revoke URL on load and error; reject on `Image` error.
- [ ] 3.2 `candidateMasks(subRes): Promise<ReadonlyMap<number, Mask>>` — for every
      `type × rotation × invert`, `renderShape` a 1×1 shape at a supersampled size, rasterize via
      the same Image→canvas path, `downsample` to `subRes`; key = `type*8 + rot*2 + inv`.
- [ ] 3.3 Module-level cache keyed by `` `${listPrimitives().length}:${subRes}` ``.

## 4. `web/src/trace/pipeline.ts` — reconstruction

- [ ] 4.1 `reconstruct({ squaredMask, gridN, candidates, subRes }): { shapeId, cellMasks }` —
      split into `gridN²` rounded-boundary tiles, `downsample` each to `subRes`, `matchCell`,
      row-major flat indices → `assembleShapeId`; return the per-cell downsampled masks too.

## 5. `web/src/trace-section.ts` — the DOM section

- [ ] 5.1 `buildTraceSection(container, { onAccept }): HTMLElement`. Constants `WORK_SIZE=256`,
      `SUB_RES=16`, `DEFAULT_N=4`, `DEBOUNCE_MS=80`. Vanilla DOM, structured like
      `web/src/generator-form.ts`.
- [ ] 5.2 Drop zone + `<input type="file" accept="image/png,image/jpeg,image/svg+xml">`;
      `dragover`/`dragleave`/`drop` toggle `.is-dragover` and read `dataTransfer.files[0]`.
- [ ] 5.3 Controls: threshold `range` 0–255 + label; swap `checkbox`; grid `range` 1–8 (default 4)
      with a live `N × N` readout.
- [ ] 5.4 Compare view: `Source` `<canvas>` (mask painted in) and `Result` (`renderShape` HTML);
      `.trace-status` paragraph; "Use this mark" `<button disabled>`.
- [ ] 5.5 On new file: `imageFileToRgba(file, WORK_SIZE)`, kick off `candidateMasks(SUB_RES)`,
      `otsuThreshold` seeds the threshold slider, one `binarize` seeds the swap toggle via
      `guessSwapForeground`, then run the binarize recompute.
- [ ] 5.6 `recomputeFromBinarize` (debounced): `toLuminance` → `binarize(threshold)` → apply swap
      → `contentBounds`; `null` ⇒ status message, clear result, disable button; else `cropAndSquare`
      → store `squaredMask` → `recomputeReconstruction`.
- [ ] 5.7 `recomputeReconstruction` (debounced): await candidates, `reconstruct(...)`, paint the
      source canvas, set the result HTML, store `currentShapeId`, enable the button.
- [ ] 5.8 Threshold/swap `input` ⇒ `recomputeFromBinarize`; grid `input` ⇒ `recomputeReconstruction`;
      button ⇒ `onAccept(currentShapeId)`. Never write URL/history from this module.

## 6. `web/src/main.ts` — wiring

- [ ] 6.1 `buildLayout`: append `<section class="trace-section">` (h2 "Trace an image" + a
      `section-hint` paragraph with the "starting sketch, not an exact copy" framing) after the
      generator section; return its content container as `traceSection` and `previewSection`.
- [ ] 6.2 `initApp`: `buildTraceSection(traceSection, { onAccept: (id) => {
      showShape(applyRampToShapeId(id, rampPanel.currentRamp()), { push: true });
      previewSection.scrollIntoView({ behavior: "smooth" }); } })`.

## 7. `web/src/style.css`

- [ ] 7.1 `.trace-section`, `.trace-dropzone` (+ `.is-dragover`), `.trace-controls`,
      `.trace-compare` (2-col, captioned panels, `img/svg/canvas { max-width: 100% }`),
      `.trace-status` (muted). Reuse existing tokens and `.button` classes; no new palette.

## 8. Tests

- [ ] 8.1 `web/test/trace/mask.test.ts`: Otsu on a bimodal histogram; `binarize`; border-majority
      guess for shape-on-blank and an inverted source; `contentBounds` incl. `null`;
      `cropAndSquare` centring + padding; `downsample` area-average + 0.5 threshold.
- [ ] 8.2 `web/test/trace/score.test.ts`: `iou` partial overlap and both-empty ⇒ 1; `matchCell`
      argmax + lowest-index tie-break; `assembleShapeId` → `decodeShapeId` round-trip; a grid
      forcing flat indices > 61 yields a `BS2` ID.
- [ ] 8.3 `web/test/trace/pipeline.test.ts`: `reconstruct` with a hand-built `squaredMask` +
      injected candidate map — cell count, row-major order, deterministic ID; all-empty mask ⇒
      all-`empty` grid.
- [ ] 8.4 `web/test/trace-section.test.ts` (jsdom, `rasterize` calls stubbed): section DOM
      structure; grid slider default 4; "Use this mark" disabled before a trace, enabled after a
      stubbed successful trace; `onAccept` fires once with the displayed ID; empty-mask path shows
      the status message and keeps the button disabled.

## 9. Verification

- [ ] 9.1 `npm run test --workspace web` — all pass.
- [ ] 9.2 `npm run lint` and `npm run build` at the root pass.
- [ ] 9.3 `npm run build --workspace web`; `vite preview` + Playwright: drop a sample SVG and a
      sample PNG from `samples/`, move the grid slider and see the reconstruction re-match, adjust
      threshold + swap, press "Use this mark" and confirm the main preview, shape-ID field,
      primitive-usage, and cell editor update and a browser-back step reverts it. Note any
      canvas/alignment findings in the report.
- [ ] 9.4 Confirm the root `bitshaper` package, CLI, and existing web tests are untouched.
