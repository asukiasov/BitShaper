## Context

Full design + rationale: `docs/superpowers/specs/2026-08-27-bitshaper-web-ramp-panel-design.md`.
This is the condensed implementation reference.

Constraints:
- No core-package change. The web app consumes `bitshaper`'s public API only
  (`decodeShapeId`, `encodeShapeId`, `renderShape`, and the `Ramp`/`RampTrack` types).
- Match the existing vanilla-DOM style of `web/src/generator-form.ts` — no framework.
- `showShape(shapeId, opts?)` keeps its signature; the default (no `opts`) already does
  `replaceState`.

## Decisions

### `web/src/ramp-panel.ts`

```ts
import type { Ramp, ShapeDef } from "bitshaper";

interface RampPanelOptions {
  readonly onChange: (ramp: Ramp | undefined) => void;
}
interface RampPanelHandle {
  readonly element: HTMLElement;
  setFromShape(shape: ShapeDef): void;
}
export function buildRampPanel(container: HTMLElement, opts: RampPanelOptions): RampPanelHandle;
```

- Internal state: `axis`, `curve`, `tracks: { param, fromIndex, toIndex }[]` (indices 0–61, the
  codec grid). Edits rebuild a `Ramp` with real values (`scale = index / 31`,
  `angleDeg = (index - 31) * 90 / 31`) and call `onChange`; zero tracks → `onChange(undefined)`.
- `<details>` element, `open` toggled by `setFromShape` (open when the shape has a ramp).
- Direction `<select>`: `column` / `row` / `diagonal` / `radial` (labels "left → right",
  "top → bottom", "diagonal", "from centre").
- Curve `<select>`: `linear` / `easeIn` / `easeOut` / `easeInOut` / `symmetric` (labels
  "linear", "ease in", "ease out", "ease in-out", "centre peak").
- Track row: param label, two `<input type="range">` (`from`/`to`), a numeric readout span, a
  `✕` remove button. Range/step: scale params `min=0 max=61 step=1` shown as `value/31`
  (0.00–1.97); `angle` shown as `(value-31)*90/31` (−90°…87°). Snapping is inherent — the
  slider *is* the index.
- `+ add` control: a `<select>` or small menu listing params not already used, omitting
  `scale` when `scaleX`/`scaleY` present and omitting `scaleX`/`scaleY` when `scale` present.
- `Remove morph` button: clears `tracks`, `onChange(undefined)`.
- `setFromShape(shape)`: read `shape.ramp`; set the selects and rebuild track rows from its
  tracks (quantize each `from`/`to` back to an index for the slider). Sets DOM values directly,
  never dispatches events, so it can't re-enter `onChange`.

### `web/src/main.ts`

- In `buildLayout`: create the panel, append to `previewSection` after the shape-ID row;
  return its handle.
- `initApp`: `let currentShape: ShapeDef | null` alongside `currentShapeId`. Build the panel
  with `onChange: applyRamp`.
- `showShape(shapeId, opts?)`: unchanged calls, plus `currentShape = decodeShapeId(shapeId)`
  (wrapped — on failure leave `currentShape` null and let `renderPreview` show its error) and
  `rampPanel.setFromShape(currentShape)` when non-null.
- `applyRamp(ramp)`: `if (!currentShape) return;` build
  `next = ramp ? { ...currentShape, ramp } : (({ ramp: _drop, ...rest }) => rest)(currentShape)`
  then `showShape(encodeShapeId(next))` (default opts → `replaceState`).
- `onGenerate(generatedId)`: if the panel currently yields a ramp, re-encode
  `encodeShapeId({ ...decodeShapeId(generatedId), ramp })` before `showShape(..., { push: true })`.
  Keep a `rampPanel.currentRamp()` accessor or track the last `onChange` value in a closure var.
- Catalog select / popstate / initial-URL paths: no change beyond `showShape` now also calling
  `setFromShape`.

### `web/src/style.css`

Minimal: `.morph-panel` spacing, `summary` cursor, track-row flex layout, range-input width.
Reuse existing form-control colors/tokens.

## Risks / Trade-offs

- **[Trade-off]** `showShape` re-decodes the ID it was just handed after a panel edit (via both
  `renderPreview` and the new `currentShape` assignment). One extra `decodeShapeId` per slider
  release — negligible, and it keeps a single source of truth (the ID string).
- **[Trade-off]** Sliders are index-valued (0–61), not free decimals. This is a feature — the
  displayed value is exactly what encodes — but a user can't type "0.5" and get 0.5 (they get
  the nearest grid value). Acceptable and consistent with the codec.
- **[Risk]** Re-applying the panel ramp on Randomize means a "stuck" morph could confuse a user
  who forgot it's on. Mitigated: the panel is visible in the preview area whenever it has
  tracks (auto-open), and "Remove morph" is one click.
