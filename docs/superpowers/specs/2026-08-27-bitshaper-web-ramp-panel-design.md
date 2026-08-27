# BitShaper Web App — Morph (ramp) panel

**Date:** 2026-08-27
**Status:** design approved, pending implementation
**Depends on:** `bitshaper-ramp-modifier` (merged) — core `ShapeDef.ramp`, the `~` ID block,
and `renderShape` already handling ramped IDs.

## Why

Viewing a ramped mark already works in the web app (everything routes through
`decodeShapeId`/`renderShape`, which now understand the `~` block — verified live). What's
missing is a way to **author or edit** a ramp without hand-crafting the `~` suffix. This adds a
"Morph" panel to the preview section.

## Goals / Non-Goals

**Goals:**
- A collapsible panel that builds/edits a `Ramp` for the current shape and live-updates the ID.
- Populate from an existing ramped ID (shared URL, pasted ID).
- Keep every other part of the app (preview, primitives-used, export, copy, deep links) working
  with zero changes — they already read the current ID / live SVG.

**Non-Goals:**
- Any core-package change (core is untouched and already merged).
- A per-cell grid editor (roadmap Phase 7, separate).
- Generator emitting ramps on its own; animation/preview scrubbing; presets library.
- Exposing every quantization nuance — sliders snap to the codec grid so WYSIWYG holds.

## UI

A `<details class="morph-panel">` inside `previewSection`, below the shape-ID row, collapsed by
default (auto-expanded when the loaded ID carries a ramp).

```
▾ Morph
   Direction  [ left → right ▾ ]     Curve  [ ease in-out ▾ ]

   scale X     0.15 ●───────────────── 1.00      ✕
   angle          0° ────────●──────── 90°       ✕

   [ + add ▾ ]                         [ Remove morph ]
```

- **Direction** (axis): `left → right` = `column`, `top → bottom` = `row`, `diagonal` =
  `diagonal`, `from centre` = `radial`.
- **Curve**: `linear`, `ease in` = `easeIn`, `ease out` = `easeOut`, `ease in-out` = `easeInOut`,
  `centre peak` = `symmetric`.
- **Track rows** (0–4): param label + two `<input type="range">` (`from`, `to`) + live numeric
  readout + `✕`. `scale`/`scaleX`/`scaleY` range 0–2 with step `1/31`; `angle` range −90…90
  with step `90/31`. The step equals the codec quantization grid, so the displayed value is
  exactly what encodes.
- **+ add** menu: only params not yet used; omits `scale` when `scaleX`/`scaleY` are present and
  omits `scaleX`/`scaleY` when `scale` is present (mirrors the codec's mutual exclusion).
- **Remove morph**: clears all tracks → the ID drops its `~` block.
- Zero tracks ⇒ no ramp; `encodeShapeId` produces a plain ID.

## Architecture

**New module `web/src/ramp-panel.ts`** (vanilla DOM, same style as `generator-form.ts`):

```ts
interface RampPanelOptions {
  /** Called with the new Ramp (or undefined when there are no tracks) on any edit. */
  readonly onChange: (ramp: Ramp | undefined) => void;
}
interface RampPanelHandle {
  readonly element: HTMLElement;
  /** Repopulate the panel from a shape's ramp (or reset it when there is none). */
  setFromShape(shape: ShapeDef): void;
}
export function buildRampPanel(container: HTMLElement, opts: RampPanelOptions): RampPanelHandle;
```

Internal state: `{ axis, curve, tracks: {param, fromIndex, toIndex}[] }` held in the panel;
each edit rebuilds a `Ramp` (real values via the same `index/31` / `(index-31)*90/31` mapping
the core uses) and calls `onChange`.

**`web/src/main.ts` wiring:**

- Build the panel once in `buildLayout`, place it in `previewSection`.
- `showShape(shapeId, opts)` gains: after decoding, `rampPanel.setFromShape(shape)`.
- `onChange(ramp)`: take the current shape's `ShapeDef`, set `.ramp = ramp` (or delete it),
  `encodeShapeId`, then `showShape(newId)` — no `opts`, so the existing default `replaceState`
  path is used (no history spam). `showShape` already calls `renderPreview`,
  `renderPrimitiveUsage`, `updateUrlForShape`, and sets `shapeIdInput.value` — all pick up the
  ramped ID unchanged. No new `showShape` option is needed.
- **Generate/Randomize:** in the `onGenerate` handler, if the panel currently has tracks,
  re-apply them: `encodeShapeId({ ...decodeShapeId(generatedId), ramp: panelRamp })` before
  `showShape`. A morph is a style the user is dialing in; dropping it every Randomize is
  hostile.
- **Catalog select / popstate / initial URL:** unchanged flow; `setFromShape` reflects whatever
  ramp the ID has (none, for every current catalog entry).

Need a stored reference to the current decoded `ShapeDef` (not just the ID string) so
`onChange` can re-encode with a swapped ramp; `main.ts` already decodes on every `showShape`
via `renderPreview` → keep the decoded `shape` in a closure variable alongside `currentShapeId`.

`setFromShape` sets DOM values directly and never dispatches input events, so it cannot
re-trigger `onChange`. `showShape` calls it on every transition; when the transition originated
from a panel edit this is a harmless re-populate with identical values. (If it ever matters,
`main.ts` can pass a flag to skip `setFromShape` for panel-originated `showShape` calls — not
needed for correctness.)

## Error handling

The panel only ever produces structurally valid `Ramp`s (bounded sliders, dedup'd params,
enforced scale exclusivity), so `encodeShapeId` cannot throw `invalid-shape-def` from panel
input. `renderPreview` keeps its existing error path for anything else (e.g. a hand-edited URL).

## Testing

`web/test/ramp-panel.test.ts` (jsdom + vitest, matching `generator-form.test.ts`):

- empty panel → `onChange(undefined)`; `encodeShapeId` of the shape has no `~`.
- add a `scaleX` track (from ≈0.2, to = 1) → `onChange` yields a `Ramp`; encoded ID has a `~`
  block that `decodeShapeId` round-trips.
- `setFromShape` with a ramped shape sets the direction/curve selects and slider positions.
- the `+ add` menu omits `scale` once `scaleX` is present.
- "Remove morph" → `onChange(undefined)` and the ID loses its `~` block.

A light `web/test/` integration check (or extend an existing main-flow test) that generating a
new mark while the panel has a track keeps the `~` block.

## OpenSpec

`openspec/changes/bitshaper-web-ramp-panel/` — proposal, design (condensed), tasks. No
`specs/` delta: `web/` is an app with no capability spec; the core capability specs are
unchanged.
