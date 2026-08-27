## 1. Curate the marks

- [x] 1.1 Build each `ShapeDef` from current primitives, render at 240, and eyeball for
  "fills the canvas, reads as a deliberate design" against the screens2 references.
- [x] 1.2 Encode each to its shape ID and confirm `encodeShapeId(decodeShapeId(id)) === id`.

## 2. Catalog append

- [x] 2.1 Append the three entries to `src/library/catalog.json` (existing 42 untouched;
  42 → 45), each with a category + descriptor + `from-sample` tag.

## 3. Verification

- [x] 3.1 `npm test` (377), `npm run lint`, `npm run build` at the root — all pass.
- [x] 3.2 `node dist/cli/index.js list` prints all 45 entries including the 3 new marks.
