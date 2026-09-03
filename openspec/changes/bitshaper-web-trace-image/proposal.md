## Why

The web app can browse, generate, ramp, cell-edit, and export marks — but every mark still
starts from randomness or the catalog. There is no way to start from a shape a user already
has in mind. This adds an image-to-mark "trace": drop a PNG/JPG/SVG, get the closest mark the
BitShaper ID format can express, dropped into the existing preview + cell editor to hand-tune.

It is a **starting sketch, not a converter** — it finds the nearest expressible shape and
shows the gap on purpose. This is also Phase 7's forcing function for Phase 3: "what did the
matcher wish it had?" is a concrete signal for which primitives to add next.

Full design: `docs/superpowers/specs/2026-09-03-bitshaper-web-trace-image-design.md`.

## What Changes

- New `web/src/trace/mask.ts` — pure raster helpers: `toLuminance`, `otsuThreshold`,
  `binarize`, `guessSwapForeground` (border-majority rule), `contentBounds`, `cropAndSquare`,
  `downsample`. `Mask = { width, height, data: Uint8Array }`, 1 = foreground.
- New `web/src/trace/score.ts` — pure scoring: `iou` (both-empty ⇒ 1), `matchCell` (argmax
  IoU, lowest-flat-index tie-break), `assembleShapeId(n, flatIndices)` (flat index →
  `CellDef` → `encodeShapeId`, which auto-selects `BS`/`BS2`).
- New `web/src/trace/rasterize.ts` — canvas glue: `imageFileToRgba(file, size)` (PNG/JPG/SVG
  all via `Image` → canvas → `getImageData`), `candidateMasks(subRes)` (every
  `listPrimitives().length × 4 × 2` candidate rasterized once via `renderShape`, module-level
  cache).
- New `web/src/trace/pipeline.ts` — `reconstruct({ squaredMask, gridN, candidates, subRes })
  → { shapeId, cellMasks }`. Pure given `candidates`.
- New `web/src/trace-section.ts` — `buildTraceSection(container, { onAccept })`. Drop zone +
  file input, threshold slider (seeded from Otsu), swap fg/bg toggle, grid slider (1–8,
  default 4), live side-by-side source-vs-reconstruction, "Use this mark" button. Vanilla DOM,
  styled after `generator-form.ts`.
- `web/src/main.ts` — `buildLayout` adds a third `<section class="trace-section">` after the
  generator; `initApp` wires `buildTraceSection` so `onAccept` calls
  `showShape(applyRampToShapeId(id, rampPanel.currentRamp()), { push: true })` and scrolls to
  the preview.
- `web/src/style.css` — `.trace-section`, `.trace-dropzone` (+ drag-over state),
  `.trace-controls`, `.trace-compare`. Reuse existing tokens.
- New tests: `web/test/trace/mask.test.ts`, `web/test/trace/score.test.ts`,
  `web/test/trace/pipeline.test.ts`, `web/test/trace-section.test.ts`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-app`: gains an image-to-mark trace flow (upload image → binarize → per-cell IoU match
  against the current primitive registry → valid `BS`/`BS2` ID → drop into the preview and
  cell editor). The capability's spec delta lives with the not-yet-archived
  `bitshaper-web-app` change; this change adds a requirement for image tracing.

## Impact

- New files: `web/src/trace/{mask,score,rasterize,pipeline}.ts`, `web/src/trace-section.ts`,
  `web/test/trace/{mask,score,pipeline}.test.ts`, `web/test/trace-section.test.ts`.
- Modified: `web/src/main.ts` (add + wire the section), `web/src/style.css`.
- No change to the root `bitshaper` package (`src/`, published API, CLI), the codec, the
  registry, the primitives, or the catalog. Consumes only `encodeShapeId`, `renderShape`,
  `listPrimitives`, and the `CellDef` type. `showShape` keeps its signature.
- Out of scope: faithful image reproduction; colour/grayscale output; ML or server-side
  matching; SVG path parsing; auto grid-size detection; non-square grids; edge-angle
  weighting of the IoU score (deferred refinement); tiling.
- `pages.yml` already deploys on `web/**` changes.
