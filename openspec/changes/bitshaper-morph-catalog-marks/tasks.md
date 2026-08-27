## 1. Curate the marks

- [x] 1.1 Build each of the seven `ShapeDef` + `ramp` candidates, render at 256, and eyeball for "fills the canvas, reads as a deliberate design" (not a `samples/63` pixel match). Iterate grid size / curve / endpoints until each is clean.
- [x] 1.2 Encode each to its shape ID and confirm `encodeShapeId(decodeShapeId(id)) === id`.

## 2. Catalog append

- [x] 2.1 Append the seven entries to `src/library/catalog.json` (existing 35 untouched; 35 → 42), each with a `morph` tag plus a category (`geometric`/`organic`) and a shape descriptor.
- [x] 2.2 Confirm `test/library/index.test.ts` (per-entry decode + render) and `test/cli/commands/list.test.ts` pass unchanged.

## 3. Verification

- [x] 3.1 `npm test`, `npm run lint`, `npm run build` at the root — all pass (374 tests).
- [x] 3.2 `node dist/cli/index.js list` prints all 42 entries including the 7 morph marks.
- [x] 3.3 `npm run test --workspace web` passes unchanged (39).
- [x] 3.4 `npm run build --workspace web`; Playwright-check `web/dist` via `vite preview` — the 7 morph marks render in the catalog grid, and selecting one loads it into the preview with the Morph panel populated.
- [ ] 3.5 After merge, Playwright-check the live site — morph marks visible in "Curated marks".
