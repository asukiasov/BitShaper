## Context

Full design + rationale: `docs/superpowers/specs/2026-09-03-bitshaper-web-trace-image-design.md`.
This is the condensed implementation reference.

Constraints:
- No core-package change. Web app consumes `bitshaper`'s public API only (`encodeShapeId`,
  `renderShape`, `listPrimitives`, and the `CellDef` type).
- All client-side: no backend, no ML, no network. SVG is rasterized, not path-parsed.
- Square grids only. No auto grid-size detection — the user sets N with a slider.
- Monochrome. Colour discarded.
- Vanilla DOM, matching `web/src/generator-form.ts` / `ramp-panel.ts` — no framework.
- `showShape(shapeId, opts?)` keeps its signature.

## Decisions

### Module split — geometry pure, canvas glue thin

jsdom cannot rasterize (that is why `export-png.ts` has no unit test). So all logic lives in
pure modules tested with hand-built masks, and `rasterize.ts` stays a thin wrapper verified
only by the Playwright task.

### `web/src/trace/mask.ts` (new, pure)

```ts
export interface Mask {
  readonly width: number;
  readonly height: number;
  /** Row-major, 1 = foreground, 0 = background. */
  readonly data: Uint8Array;
}

export function toLuminance(rgba: Uint8ClampedArray, width: number, height: number): Float32Array;
export function otsuThreshold(luminance: Float32Array): number;
export function binarize(luminance: Float32Array, width: number, height: number, threshold: number): Mask;
/** Border-majority: majority class on the outer 1px ring = background. Returns whether the swap toggle starts on. */
export function guessSwapForeground(mask: Mask): boolean;
export function contentBounds(mask: Mask): { x: number; y: number; width: number; height: number } | null;
export function cropAndSquare(mask: Mask, bounds: { x: number; y: number; width: number; height: number }): Mask;
/** Area-average downsample to `size × size`, threshold at 0.5. */
export function downsample(mask: Mask, size: number): Mask;
```

- `toLuminance`: `0.2126 R + 0.7152 G + 0.0722 B`, ignoring alpha. Range 0–255.
- `otsuThreshold`: classic between-class-variance maximisation over a 256-bin histogram.
- `binarize`: foreground = luminance `< threshold` (darker is ink by default; the swap toggle
  and border-majority guess correct the rest).
- `guessSwapForeground`: count foreground pixels on the 1px border ring; if they are the
  majority of the ring, the foreground class is actually background → return `true`.
- `contentBounds`: tight bbox of foreground pixels; `null` when there are none.
- `cropAndSquare`: crop to `bounds`, then place that rectangle centred in a
  `max(w, h) × max(w, h)` square, background-padded.
- `downsample`: for each target pixel, average the covered source cells; output pixel is 1
  when the average ≥ 0.5.

### `web/src/trace/score.ts` (new, pure)

```ts
export function iou(a: Mask, b: Mask): number;                                   // both-empty ⇒ 1
export function matchCell(cellMask: Mask, candidates: ReadonlyMap<number, Mask>): number;
export function assembleShapeId(n: number, flatIndices: readonly number[]): string;
```

- `iou`: `|A ∩ B| / |A ∪ B|` over foreground pixels; `A` and `B` must be the same size;
  union of 0 ⇒ return 1.
- `matchCell`: iterate `candidates` in ascending key order, track best IoU; first key wins a
  tie (so `candidates` must be built in ascending flat-index order, or `matchCell` sorts keys).
- `assembleShapeId`: `flatIndex → { type: Math.floor(i / 8), rotation: ([0,90,180,270])[Math.floor(i / 2) % 4], invert: (i & 1) === 1 }`;
  `encodeShapeId({ cols: n, rows: n, cells })`. No version branching — `encodeShapeId` picks
  `BS`/`BS2`.

### `web/src/trace/rasterize.ts` (new, canvas glue — Playwright-verified)

```ts
export function imageFileToRgba(file: File, size: number): Promise<{ data: Uint8ClampedArray; width: number; height: number }>;
export function candidateMasks(subRes: number): Promise<ReadonlyMap<number, Mask>>;
```

- `imageFileToRgba`: `URL.createObjectURL(file)` → `new Image()`; on load draw to a
  `size × size` canvas (white fill first, so transparent PNG/SVG areas read as background),
  `getImageData`. Set `image.width/height = size` before load so a viewBox-only SVG still
  rasterizes. Revoke the object URL in both `onload` and `onerror`.
- `candidateMasks`: for `type` in `0..listPrimitives().length-1`, `rot` in `0..3`, `inv` in
  `0..1`: `flatIndex = type*8 + rot*2 + inv`; `renderShape(encodeShapeId({ cols:1, rows:1,
  cells:[{ type, rotation: [0,90,180,270][rot], invert: inv===1 }] }), { size: subRes*K })`
  for some supersample `K` (e.g. 4), rasterize via the same Image→canvas path, then
  `downsample` to `subRes`. Cache the resolved map at module scope keyed by
  `` `${listPrimitives().length}:${subRes}` ``.

### `web/src/trace/pipeline.ts` (new, pure given `candidates`)

```ts
export interface ReconstructInput {
  readonly squaredMask: Mask;
  readonly gridN: number;
  readonly candidates: ReadonlyMap<number, Mask>;
  readonly subRes: number;
}
export interface ReconstructResult {
  readonly shapeId: string;
  readonly cellMasks: readonly Mask[];   // row-major, each `subRes × subRes`, for the source preview
}
export function reconstruct(input: ReconstructInput): ReconstructResult;
```

Split `squaredMask` into `gridN × gridN` equal tiles (integer-boundary; the squared mask
size need not divide evenly — use `Math.round` boundaries). `downsample` each tile to
`subRes`. `matchCell` each against `candidates`. Row-major flat indices → `assembleShapeId`.

### `web/src/trace-section.ts` (new)

```ts
export interface TraceSectionOptions {
  readonly onAccept: (shapeId: string) => void;
}
export function buildTraceSection(container: HTMLElement, opts: TraceSectionOptions): HTMLElement;
```

Constants: `WORK_SIZE = 256`, `SUB_RES = 16`, `DEFAULT_N = 4`, `DEBOUNCE_MS = 80`.

DOM (all created explicitly):
- `.trace-dropzone` wrapping `<input type="file" accept="image/png,image/jpeg,image/svg+xml">`;
  `dragover`/`dragleave`/`drop` handlers set a `.is-dragover` class and read
  `event.dataTransfer.files[0]`.
- `.trace-controls`:
  - threshold `<input type="range" min="0" max="255" step="1">` + label;
  - swap `<label><input type="checkbox"> Swap foreground / background</label>`;
  - grid `<input type="range" min="1" max="8" step="1">` + a live `N × N` readout.
- `.trace-compare`: two panels — `Source` (a `<canvas>` the squared mask is painted into)
  and `Result` (`innerHTML = renderShape(shapeId)`).
- `.trace-status` paragraph for the empty-image message.
- "Use this mark" `<button type="button" disabled>`.

Closure state: `rgba` (from the last file), `squaredMask | null`, `currentShapeId | null`,
resolved `candidateMasks` promise (kicked off on first file).

Recompute helpers, each debounced:
- `recomputeFromBinarize()` — needs `rgba`: `toLuminance` → `binarize(threshold)` → apply
  swap → `contentBounds`; `null` ⇒ show status, clear result, disable button, return;
  else `cropAndSquare` → store `squaredMask` → `recomputeReconstruction()`.
- `recomputeReconstruction()` — needs `squaredMask` + resolved candidates:
  `reconstruct({ squaredMask, gridN, candidates, subRes: SUB_RES })` → paint source canvas
  from `cellMasks` (or from `squaredMask` directly), set result `innerHTML`, store
  `currentShapeId`, enable the button.

On new file: `imageFileToRgba(file, WORK_SIZE)` → store `rgba` → `otsuThreshold` seeds the
threshold slider's value → `binarize` once to seed the swap toggle via `guessSwapForeground`
→ `recomputeFromBinarize()`.

Threshold/swap `input` ⇒ `recomputeFromBinarize`. Grid `input` ⇒ `recomputeReconstruction`.
Button click ⇒ `if (currentShapeId) opts.onAccept(currentShapeId)`.

The reconstruction ID is never written to the URL/history here — only `onAccept` (wired in
`main.ts` to `showShape(..., { push: true })`) does that.

### `web/src/main.ts` — wiring

- `buildLayout`: after the generator `<section>`, append
  `<section class="trace-section">` with an `<h2>Trace an image</h2>` and a
  `<p class="section-hint">` ("Drop a PNG, JPG, or SVG of a shape to get the closest
  BitShaper mark — a starting sketch you then tune, not an exact copy."). Return its content
  container as `traceSection`, and also return `previewSection` if not already returned.
- `initApp`:
  ```ts
  buildTraceSection(traceSection, {
    onAccept: (id) => {
      showShape(applyRampToShapeId(id, rampPanel.currentRamp()), { push: true });
      previewSection.scrollIntoView({ behavior: "smooth" });
    },
  });
  ```

### `web/src/style.css`

`.trace-section` (spacing like `.generator-section`); `.trace-dropzone` (dashed border,
padding, `.is-dragover` accent); `.trace-controls` (flex column, gap); `.trace-compare`
(2-col grid, each panel captioned, images `max-width:100%`); `.trace-status` (muted).
Reuse existing colour tokens and `.button` classes; no new palette.

## Risks / trade-offs

- **No jsdom coverage for `rasterize.ts`** — kept thin; Playwright task covers it.
- **Otsu on gradient photos** can mis-split — threshold slider + live source preview are the
  escape hatch.
- **Tile boundaries** when `squaredMask` size doesn't divide by `gridN` — use rounded
  boundaries; sub-pixel error is invisible after `downsample`.
- **Candidate cache grows with the registry** — ~80 masks today, trivial; revisit only if
  the registry reaches dozens.
- **"Use this mark" = one history entry**, consistent with catalog/generate. In-section
  slider exploration touches no history.

## Migration

None. Additive web-app feature. Existing IDs, catalog, exports, generator, cell editor, and
ramp panel are unchanged.
