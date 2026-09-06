# BitShaper web — Poster tab (Change D)

**Date:** 2026-09-07
**Status:** proposed

Fourth slice of the web work. Adds the `Poster` tab that Change B deferred, so
the working-area tabs become **`Create` / `Trace an image` / `Poster`**. A
poster is a new composition layer — background, title text, and a grid of one
repeated BitShaper mark — that lives entirely in `web/src/`, never in
`src/core/`.

Prereqs: Changes A, B (merged). Sibling: Change C (new primitives, `src/core/` +
`src/library/` only — no overlap).

## Decisions (from brainstorming)

- **Self-contained tab.** The Poster tab has its own shape, not the
  always-visible preview shape. A *"Use preview shape"* button bridges the two.
- **One template to start: "Grid of marks."** Title block + an M×N grid of a
  single picked shape, each cell given a rotation from a repeating cycle, with a
  two-colour treatment. Additional templates (stripe field, hero mark) are a
  later change.
- **Editable:** title / subtitle / caption text; text-block position (3
  presets); grid columns × rows; palette (pick one of a preset set); colour
  pattern (checkerboard or per-row).
- **Poster state lives in the URL** — shareable/restorable like a shape ID.
- **Export:** 2:3 portrait, both SVG (vector) and PNG (2000×3000).

## Modules (all new, under `web/src/`)

### `poster-templates.ts` — pure, the renderer

```ts
export interface PosterState {
  readonly shapeId: string;
  readonly title: string;
  readonly subtitle: string;
  readonly caption: string;
  readonly textPos: "top-left" | "top-split" | "bottom-left";
  readonly cols: number;      // 1..8
  readonly rows: number;      // 1..12
  readonly palette: PaletteKey;
  readonly pattern: "checker" | "rows";
  readonly seed: string;      // drives the per-cell rotation cycle offset
}

export const POSTER_VIEWBOX = { w: 1000, h: 1500 } as const; // 2:3
export const PALETTES: Record<PaletteKey, { fg: string; bg: string; accent: string }>;
export const DEFAULT_POSTER_STATE: PosterState;

/** Builds the full poster as one standalone <svg> string. Never throws:
 *  an undecodable shapeId renders the poster with empty cells + a note. */
export function renderPosterSvg(state: PosterState): string;
```

`PaletteKey` set (fg / bg / accent), 2-colour each (accent is the second ink):

| key       | look                          |
|-----------|-------------------------------|
| `mono`    | near-black on warm off-white  |
| `ink`     | black on cream                |
| `violet`  | black + violet on white       |
| `forest`  | deep green on tan             |
| `blueprint` | off-white on navy           |

**Layout inside `renderPosterSvg`:**

- `<rect>` full-bleed background = `bg`.
- **Grid area:** a rectangle inset from the poster edges with a wider margin on
  whichever side the text block occupies (top for `top-*`, bottom for
  `bottom-left`). Cell size = `min(areaW / cols, areaH / rows)`; the grid is
  centred in the area.
- **Per cell:** decode `shapeId` once; for each of the `cols * rows` cells emit
  `renderShape(shapeId, { fill })` and splice its `<path>` into a
  `<g transform="translate(x y) rotate(r cx cy) scale(s)">`. `renderShape`
  output is parsed with `DOMParser`; the `<path d>` is taken (its coord space is
  the shape's default `size` box → `scale = cell / size`).
  - `r` = `[0, 90, 180, 270][(col + row + seedOffset) % 4]`.
  - `fill` per `pattern`: `checker` → `accent` when `(col + row)` is odd, else
    `fg`; `rows` → `accent` on odd rows, else `fg`.
  - `seedOffset` = a small int hashed from `seed` (0 when `seed` is empty).
- **Text:** `<text>` elements in a system sans stack, `fg`.
  - `top-left`: title (large, bold) then subtitle (small) stacked at the top-left
    inset; caption pinned to the bottom-left footer.
  - `top-split`: title top-left, subtitle top-right (right-aligned), caption
    bottom-left footer.
  - `bottom-left`: title + subtitle stacked above the bottom-left footer;
    caption directly under them.
  - A thin `<line>` rule under the title block (matches the samples).
  - Text is emitted with XML-escaping; long titles are not auto-wrapped (kept
    simple — the field is short by convention).

No DOM, no `window`; safe to unit-test in isolation.

### `poster-state.ts` — pure, URL read/write

Mirrors `shape-state.ts`. Poster params are namespaced so they never collide
with `?id=`:

| param | field | notes |
|-------|-------|-------|
| `pid`   | `shapeId`  | falls back to `DEFAULT_POSTER_STATE.shapeId` |
| `pt`    | `title`    | |
| `psub`  | `subtitle` | |
| `pcap`  | `caption`  | |
| `ppos`  | `textPos`  | one of the 3 keys, else default |
| `pc`    | `cols`     | int, clamped 1..8 |
| `pr`    | `rows`     | int, clamped 1..12 |
| `ppal`  | `palette`  | valid `PaletteKey`, else `mono` |
| `ppat`  | `pattern`  | `checker` \| `rows` |
| `pseed` | `seed`     | |

```ts
export function readPosterFromUrl(): PosterState;          // always returns a full state
export function updatePosterUrl(state: PosterState, opts?: { push?: boolean }): void;
```

`updatePosterUrl` writes only params that differ from `DEFAULT_POSTER_STATE`
(keeps the URL short) and leaves `?id=` and the `#poster` hash untouched.

### `poster.ts` — the tab UI (vanilla DOM, matches the other `web/src/*` modules)

```ts
export interface PosterTabOptions {
  /** Current always-visible preview shape ID, or null. Backs "Use preview shape". */
  readonly getCurrentShapeId: () => string | null;
}
export interface PosterTabHandle { readonly element: HTMLElement; }
export function buildPosterTab(container: HTMLElement, opts: PosterTabOptions): PosterTabHandle;
```

DOM, top to bottom:

- **`.poster-shape-row`** — shape-ID `<input>` (validated on change via
  `tryDecodeShapeId`; invalid → `.is-invalid` + inline note, render keeps last
  good), **`Use preview shape`** button (disabled when `getCurrentShapeId()` is
  null), **`Randomize`** button (`generateFilteredShapeId(randomSeed(), grid,
  allTypes)`).
- **`.poster-fields`** — `Title` / `Subtitle` / `Caption` text inputs;
  `Position` `<select>` (3 presets); `Columns` / `Rows` number inputs (same
  min/max as the state clamps); `Palette` `<select>`; `Pattern` `<select>`
  (Checkerboard / Per row); `Variation seed` text input + `Copy`.
- **`.poster-preview`** — the live `renderPosterSvg(state)` output (SVG scales to
  the column width via `max-width:100%`).
- **`.poster-export`** — `Export SVG` / `Export PNG` buttons.

Behaviour: any input change → rebuild `PosterState` → re-render the preview →
`updatePosterUrl(state)` (replace, not push). Initial state from
`readPosterFromUrl()`. Export uses the current in-tab SVG string:

- SVG → `exportSvg(svg, \`poster-${state.shapeId}.svg\`)`.
- PNG → `exportPng(svg, { width: 2000, height: 3000, filename: \`poster-${state.shapeId}.png\` })`.

### `export-png.ts` — one small extension

Add optional `width` / `height` to `ExportPngOptions` (keep `size` as the
square shorthand; `width`/`height` win when present). `rasterizeSvgToPng`
takes `(markup, width, height)` and sizes the canvas non-square. Existing
callers (`size ?? DEFAULT_SIZE` for both axes) are unchanged.

## `main.ts` wiring

- `TABS` gains `{ id: "poster", label: "Poster" }` (third). `TabId` picks it up
  automatically.
- `buildLayout`: create `posterSection` (`<section class="poster-section
  tab-panel">` with a `.section-hint`), add `poster: posterSection` to `panels`,
  append it in the tab loop, and add `posterSection` (the body element) to the
  return object + its type.
- `initApp`: `buildPosterTab(posterSection, { getCurrentShapeId: () =>
  currentShapeId })`. No change to `showShape` / preview / composition / morph.

The always-visible `.preview-section` (preview + Composition + Morph + Pattern)
still shows above every tab, including Poster — unchanged. The Poster tab's
shape is independent of it; the bridge is the `Use preview shape` button.

## Styles (`web/src/style.css`, `--bs-*` tokens, dark)

New blocks: `.poster-section`, `.poster-shape-row`, `.poster-fields` (grid of
label+control pairs like `.composition-controls`), `.poster-preview` (centred,
subtle border, checkered/neutral backdrop so a light poster is visible in the
dark UI), `.poster-export`, `.is-invalid`. No new tokens expected; reuse the
existing input / button / hint styles.

## Tests (`web/test/`, mirroring `web/src/`)

- **`poster-templates.test.ts`**: `renderPosterSvg(DEFAULT_POSTER_STATE)`
  returns one `<svg>` with `viewBox="0 0 1000 1500"`; contains the title text
  (XML-escaped); emits `cols*rows` cell groups; `checker` vs `rows` produce
  different accent-fill placement; the chosen palette's `bg`/`fg` hex appear; an
  undecodable `shapeId` still returns an `<svg>` (no throw) with a note.
- **`poster-state.test.ts`**: `readPosterFromUrl()` with no params ==
  `DEFAULT_POSTER_STATE`; round-trip (`updatePosterUrl` then `readPosterFromUrl`)
  for a non-default state; out-of-range `pc`/`pr` clamp; unknown `ppal`/`ppos`
  fall back; `updatePosterUrl` leaves an existing `?id=` intact and omits
  default-valued params.
- **`poster.test.ts`**: tab builds its controls; `Use preview shape` is disabled
  when `getCurrentShapeId` returns null and fills the field when it returns an
  ID; editing the title re-renders `.poster-preview` and updates the URL;
  invalid shape ID marks the input `.is-invalid` without wiping the preview;
  `Export SVG` calls `triggerDownload` with a `poster-…svg` filename (mock
  `download.js` as `main-layout.test.ts` does).
- **`export-png.test.ts`** (extend if present, else add): `width`/`height` set a
  non-square canvas; `size` still works.
- **`main-layout.test.ts`** (update): three tabs `create` / `trace` / `poster`;
  `#poster` hash shows `.poster-section` and hides the others; `.poster-section`
  is inside a `.tab-panel`; keep the existing `#create` / `#trace` and
  unknown-hash → `create` assertions; the tab-labels test learns `Poster`.

## Non-goals

- No `src/core/` or `src/library/` changes (Change C owns those).
- No second/third template, no custom hex colours, no draggable text, no
  multi-shape grids, no font embedding in the SVG (system stack only).
- No change to the always-visible preview, Composition, Morph, Trace, or catalog.
- Poster state is not added to browser history (replace-only); no undo.
