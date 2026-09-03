# BitShaper Web — Image-to-Mark "Trace" (Phase 7)

**Status:** designed, ready for OpenSpec proposal.
**Date:** 2026-09-03.
**Roadmap:** Phase 7 of `docs/superpowers/specs/2026-08-24-bitshaper-roadmap-design.md`.

## Purpose

Let a web-app user upload an image of a shape (PNG, JPG, or SVG) and get back the
**closest mark expressible as a BitShaper ID**, dropped into the existing grid editor as a
starting point they then hand-tune, export, and share like any other mark.

It is a **starting sketch, not a converter**. The UI framing is "a BitShaper mark inspired
by your image — now make it yours." It does not reproduce the image; it finds the nearest
shape the ID format can express, and the gap is shown on purpose.

## Constraints (from the roadmap)

- All client-side. No backend, no ML, no network calls.
- SVG input is **rasterized, not path-parsed** — all three formats behave identically.
- No auto-detection of grid resolution (fuzzy, disappointing) — the user sets it.
- Monochrome only. Colour is discarded.
- Square grids only for this phase (the cell editor cannot resize a grid, and the
  normalize step squares the aspect anyway).
- No `bitshaper` core-package change. The web app consumes the published public API only:
  `encodeShapeId`, `renderShape`, `listPrimitives`, and the `CellDef` type. If a core
  change turns out to be needed, it is split into its own proposal first.

## Non-goals

Reproducing the uploaded image faithfully; multi-colour or grayscale output; server-side
or ML-based matching; vector/path parsing of SVG input; auto-detecting the ideal grid
size; non-square grids; seamless tiling.

## Pipeline

1. **Ingest** — rasterize the upload to an RGBA bitmap at a fixed working size (256×256).
   SVG is drawn through an `Image` with explicit `width`/`height` so it rasterizes like
   the raster formats.
2. **Normalize**
   - Convert to luminance.
   - Pick a binarization threshold with **Otsu's method**; expose it as a slider seeded
     with the Otsu value so the user can nudge a bad split.
   - Binarize to a two-class mask.
   - **Foreground/background guess: border-majority.** Whichever class occupies the
     majority of the outer 1px border ring is background; the other is foreground. A
     single "Swap fg/bg" toggle flips it, seeded from the guess.
   - Crop to the foreground content bounding box, then centre it in a square (pad the
     shorter axis with background).
3. **Grid** — user-adjustable via a slider, range 1–8, **default 4**, producing an N×N
   grid. The reconstruction re-matches live (debounced) on change. No auto-detection.
4. **Per-cell match** — for each of the N² cells:
   - Downsample the cell's region of the squared mask to a fixed sub-grid
     (**16×16 px**), area-average then threshold at 0.5.
   - For every candidate `flatIndex` in
     `listPrimitives().length × 4 rotations × 2 invert`, compare its cached 16×16 mask to
     the cell mask by **IoU** (intersection-over-union of filled pixels). Both-empty
     scores IoU = 1 by convention.
   - Keep the highest IoU; break ties by **lowest flat index** (favours
     empty/fill/simple primitives).
   - Candidate masks are rasterized once via `renderShape` of a 1×1 shape and cached at
     module level, keyed by `(registry length, sub-grid resolution)`. ~100+ candidates is
     cheap in-browser.
   - *Deferred refinement, only if plain IoU disappoints:* weight the score by
     boundary/edge-angle alignment. Not in this phase.
5. **Assemble** — each cell's winning `flatIndex` maps back to a `CellDef`:
   `type = ⌊i / 8⌋`, `rotation = [0, 90, 180, 270][⌊i / 2⌋ % 4]`, `invert = i & 1`.
   Row-major `CellDef[]` → `encodeShapeId({ cols: N, rows: N, cells })`. `encodeShapeId`
   auto-selects `BS` vs `BS2`, so a grid whose cells need flat indices above 61 emits a
   `BS2` ID with no special handling.
6. **Present** — the normalized source mask and the live reconstruction (rendered from the
   in-progress ID via `renderShape`) are shown **side by side** in the trace section, so
   the gap is visible and obviously the point. A **"Use this mark"** button calls
   `showShape(id, { push: true })` — the same entry path as the catalog and generator —
   dropping the ID into the main preview + cell editor and scrolling up to it. The trace
   section stays populated so the user can re-tune the grid and re-accept.

## Module layout

New directory `web/src/trace/`. The geometry and scoring are pure and unit-tested; only
the canvas glue needs Playwright verification (mirrors `export-png.ts`, which has no jsdom
test because jsdom cannot rasterize).

### `web/src/trace/mask.ts` — pure

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

/** Border-majority rule: returns whether the swap toggle should start on. */
export function guessSwapForeground(mask: Mask): boolean;

/** Bounding box of the foreground, or null when the mask has no foreground. */
export function contentBounds(mask: Mask): { x: number; y: number; width: number; height: number } | null;

/** Crop to `bounds`, then centre into a square padded with background. */
export function cropAndSquare(mask: Mask, bounds: { x: number; y: number; width: number; height: number }): Mask;

/** Area-average downsample to `size × size`, threshold at 0.5. */
export function downsample(mask: Mask, size: number): Mask;
```

### `web/src/trace/score.ts` — pure

```ts
/** Intersection-over-union of the two masks' foreground. Both-empty ⇒ 1. */
export function iou(a: Mask, b: Mask): number;

/** Argmax IoU over `candidates`; ties broken by lowest flat index. */
export function matchCell(cellMask: Mask, candidates: ReadonlyMap<number, Mask>): number;

/** Flat indices (row-major) → a valid BS/BS2 shape ID for an `n × n` grid. */
export function assembleShapeId(n: number, flatIndices: readonly number[]): string;
```

`assembleShapeId` maps each flat index to a `CellDef`
(`type = ⌊i/8⌋`, `rotation = [0,90,180,270][⌊i/2⌋%4]`, `invert = i & 1`) and calls
`encodeShapeId`.

### `web/src/trace/rasterize.ts` — DOM/canvas glue

```ts
/** Load an image File and read it back as RGBA at `size × size`. SVG gets an
 *  explicit width/height so it rasterizes like PNG/JPG. */
export function imageFileToRgba(file: File, size: number): Promise<{ data: Uint8ClampedArray; width: number; height: number }>;

/** All `listPrimitives().length × 4 × 2` candidate cell masks at `subRes`,
 *  rasterized once via `renderShape` and cached at module level. */
export function candidateMasks(subRes: number): Promise<ReadonlyMap<number, Mask>>;
```

### `web/src/trace/pipeline.ts` — orchestration (pure given `candidates`)

```ts
export interface ReconstructInput {
  readonly squaredMask: Mask;
  readonly gridN: number;
  readonly candidates: ReadonlyMap<number, Mask>;
  readonly subRes: number;
}
export interface ReconstructResult {
  readonly shapeId: string;
  readonly cellMasks: readonly Mask[];
}
export function reconstruct(input: ReconstructInput): ReconstructResult;
```

### `web/src/trace-section.ts` — the DOM section

Structured after `web/src/generator-form.ts` / `ramp-panel.ts` — vanilla DOM, explicit
element creation, no framework.

```ts
export interface TraceSectionOptions {
  /** Called with the reconstruction's shape ID when the user accepts it. */
  readonly onAccept: (shapeId: string) => void;
}
export function buildTraceSection(container: HTMLElement, opts: TraceSectionOptions): HTMLElement;
```

Contents:

- A drop zone plus a `<input type="file" accept="image/png,image/jpeg,image/svg+xml">`.
- **Threshold slider** — range over the luminance domain, value seeded to the Otsu result.
- **Swap fg/bg toggle** — a checkbox, seeded from `guessSwapForeground`.
- **Grid slider** — `min=1 max=8 value=4`, with the current N shown.
- **Side-by-side view** — left: the normalized source mask (drawn to a small canvas or a
  CSS-grid of divs); right: the reconstruction via `renderShape(shapeId)`.
- **"Use this mark"** button — disabled until a successful trace; calls `opts.onAccept`
  with the current reconstruction ID.
- Inline status line for the empty-image case ("No shape found — try adjusting the
  threshold or swapping foreground/background.") with "Use this mark" disabled.

### State flow inside `trace-section.ts`

```
drop/pick file
  → imageFileToRgba(file, 256)
  → toLuminance
  → otsuThreshold           ── seeds the threshold slider
  → binarize(threshold)
  → guessSwapForeground     ── seeds the swap toggle
  → (apply swap) → contentBounds → cropAndSquare
  → cache squaredMask
  → reconstruct(...) → render side-by-side
```

- Threshold or swap change ⇒ recompute from `binarize` down.
- Grid change ⇒ re-run `reconstruct` only.
- All recompute paths are debounced (~80 ms).
- The reconstruction ID is shown live but **never** written to the URL or history until
  "Use this mark" is pressed.

### `web/src/main.ts` — wiring

- `buildLayout` adds a third `<section class="trace-section">` in `app-main`, after the
  generator section, with a heading and a one-line hint. Returns its content container.
- `initApp`:

```ts
buildTraceSection(traceSection, {
  onAccept: (id) => {
    showShape(applyRampToShapeId(id, rampPanel.currentRamp()), { push: true });
    previewSection.scrollIntoView({ behavior: "smooth" });
  },
});
```

`previewSection` is already built in `buildLayout`; expose it from the return value if it
is not already.

### `web/src/style.css`

New rules for `.trace-section`, the drop zone (`.trace-dropzone`, with a
drag-over state), `.trace-controls`, and `.trace-compare` (the side-by-side grid). Reuse
existing colour tokens and `.button`-style classes; no new palette.

## Testing

| File | Environment | Covers |
| --- | --- | --- |
| `web/test/trace/mask.test.ts` | pure | Otsu split on a bimodal histogram; `binarize`; border-majority guess (shape-on-blank, and an inverted source); `contentBounds` incl. the no-foreground `null`; `cropAndSquare` centring and padding; `downsample` area-average + 0.5 threshold |
| `web/test/trace/score.test.ts` | pure | `iou` incl. both-empty ⇒ 1 and partial overlap; `matchCell` argmax and lowest-index tie-break; `assembleShapeId` flat-index → `CellDef` round-trip via `decodeShapeId`; a grid forcing flat indices > 61 emits a `BS2` ID |
| `web/test/trace/pipeline.test.ts` | pure | `reconstruct` with hand-built `squaredMask` + injected candidate map: correct cell count, row-major order, deterministic ID; a fully-empty mask yields an all-`empty` grid |
| `web/test/trace-section.test.ts` | jsdom | section DOM structure; control defaults (grid = 4); "Use this mark" disabled before a trace and enabled after; `onAccept` fires once with the displayed ID; canvas/rasterize calls stubbed |
| Playwright task | real browser | drop a sample SVG and a sample PNG from `samples/`; move the grid slider and see the reconstruction re-match; press "Use this mark" and confirm the main preview, shape-ID field, and cell editor update |

`pipeline.test.ts` and `score.test.ts` never touch canvas — candidate masks are passed
in. Only `rasterize.ts` and the file-drop wiring depend on a real canvas, and those are
the Playwright task's job, exactly as `bitshaper-web-cell-editor` handled its overlay
alignment.

## Risks / trade-offs

- **jsdom cannot rasterize**, so `imageFileToRgba` and `candidateMasks` have no unit
  test. Mitigated by keeping them thin and pushing all logic into the pure modules;
  Playwright covers the integration.
- **Otsu on a photo** with soft gradients can split badly. The threshold slider is the
  escape hatch; the normalized-source preview updates live so the user sees the mask.
- **Fixed 256×256 working size** loses fine detail on large source images. Acceptable —
  the output is a coarse grid mark, not a reproduction.
- **Candidate count grows with the registry.** At today's ~10 primitives that is
  `10 × 8 = 80` masks × 256 px each — trivial. If the registry reaches dozens, revisit
  caching granularity; not a concern now.
- **"Use this mark" pushes one history entry**, consistent with catalog/generate. Slider
  exploration inside the trace section does not touch history at all.

## Migration

None. Purely additive web-app feature. Existing IDs, catalog, exports, generator, cell
editor, and ramp panel are unchanged.
