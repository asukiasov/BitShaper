# BitShaper web — UX cleanup

**Date:** 2026-09-06
**Status:** accepted

## Problem

The web app works but the layout fights the user:

- The **Generate** form's `Generate` / `Randomize` buttons jump vertically as the
  wrapping `Primitives` fieldset changes height — the primary actions never sit
  in a stable place.
- The page is one long scroll through five stacked sections (preview, generate,
  trace, catalog), so "Trace an image" and the catalog push everything down even
  when unused.
- The **Export SVG** / **Export PNG** buttons take a full-width row of their own
  directly under the mark.
- The generator's **Seamless tile** checkbox is unlabelled enough that its
  purpose isn't clear.
- The preview's **Preview as repeating tile** toggle has no way to choose how
  many repeats to show.

## Design

### 1. Fixed top toolbar

The `<header>` becomes a flex toolbar that never reflows:

- Left: `BitShaper` wordmark.
- Right: compact action buttons — `Copy ID`, `SVG`, `PNG` — sharing one row,
  small, right-aligned. These replace both the standalone `.export-controls`
  row and the `Copy ID` button that lived in `.shape-id-row`.

The read-only shape-ID `<input>` stays directly under the preview but loses its
inline button (now in the toolbar). All three toolbar buttons are disabled
until a shape is loaded.

### 2. Tabbed working area

Below the preview, a tab bar (`role="tablist"`) switches a single panel between:

- **Generate** (selected by default)
- **Trace an image**
- **Curated marks**

Only the active panel is in the DOM-visible flow (`hidden` attribute on the
others). Tab buttons are real `<button role="tab">` with `aria-selected` and
arrow-key roving focus. The active tab is mirrored to `location.hash`
(`#generate`, `#trace`, `#marks`) so reload and back/forward restore it; an
unknown or empty hash falls back to Generate.

Section headings (`<h2>Generate a mark</h2>` etc.) are dropped — the tab label
is the heading. The existing `.section-hint` paragraphs stay inside each panel.

### 3. Generate tab — stable order

The form is laid out as fixed-height rows, top to bottom, so nothing below can
push the primary actions:

1. **Actions row:** `Seed` input, `Randomize`, `Generate`.
2. **Grid row:** `Columns`, `Rows`.
3. **Seamless tiling** option — relabelled to
   *"Seamless tiling — make edges wrap so copies join with no visible seam"* and
   wrapped in a bordered `.generator-option` block rather than a bare checkbox.
   Behaviour unchanged (still disables the primitive mix while checked).
4. **Primitives** fieldset — last, so its wrapping never moves anything.

No behavioural change to generation itself.

### 4. Repeating-tile preview with repeat count

`renderShape`'s tile mode gains an optional `tileRepeat` (integer, clamped
1–10, default 3): it sets the viewport to `drawExtent * tileRepeat` so the
pattern shows an `N × N` block. `tileRepeat` is ignored unless `tile` is set,
and an explicit `size` still overrides it.

In the preview UI the lone checkbox becomes:

- `Repeat` label + a number `<input type="number" min="1" max="10">`
  (`.tile-repeat-input`), default `3`.
- `1` means off (single mark, no `<pattern>`); `2`–`10` render the tiled
  pattern at that repeat.
- The seam-status note (`— seams match ✓` / `— seams don't match`) shows
  whenever the value is `> 1`.
- The cell-edit overlay stays suppressed whenever the value is `> 1` (same rule
  as the old "checkbox checked").

### Files touched

- `src/core/render.ts` — add `tileRepeat` option + clamp; doc update.
- `test/core/tiling.test.ts` — cover `tileRepeat` (viewport size, clamp, default,
  ignored without `tile`).
- `web/src/main.ts` — toolbar, tab bar + panel switching, hash sync, repeat-count
  wiring in place of `tilePreviewInput.checked`.
- `web/src/generator-form.ts` — row order, `.generator-option` wrapper, new label.
- `web/src/preview.ts` — thread `tileRepeat` through `renderPreview`.
- `web/src/style.css` — toolbar, tabs, `.generator-option`, `.tile-repeat`
  styles; remove `.export-controls` full-width rule.
- `web/test/*` — update `preview`, `generator-form`, `preview-ux` tests for the
  new controls; add a tab-switching test in `main`/a new `tabs` test.

## Non-goals

- No change to the shape-ID codec, primitive registry, or trace pipeline.
- Tiling stays a deferred exploration — this only clarifies the existing
  controls, it doesn't expand tiling features.
- No light theme, no responsive redesign beyond keeping the existing
  `@media (max-width: 420px)` behaviour working.
