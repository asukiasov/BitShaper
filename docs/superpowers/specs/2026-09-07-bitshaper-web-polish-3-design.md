# BitShaper web — polish pass 3 (Change E)

**Date:** 2026-09-07
**Status:** accepted

Follow-up feedback after Changes B–D merged. Web-only, one change.

## 1. Two-column preview layout

`buildLayout` wraps the contents of `.preview-section` in a `.preview-layout`
grid with two children:

- `.preview-col-main` — the existing `.preview-sticky` (preview + shape-ID row
  + action buttons).
- `.preview-col-side` — Composition panel container, Morph panel container,
  Pattern control + hint, history hint (in that order).

CSS: `.preview-layout` is a single column by default; at `min-width: 720px` it
becomes `grid-template-columns: minmax(0, 340px) minmax(0, 1fr)` with
`align-items: start`, so the settings sit to the right of the preview. The
preview stays `position: sticky`. `.preview-section` drops `align-items: center`
(the columns manage their own alignment); `.preview-col-side` left-aligns its
panels and lets them grow to the column width (composition/ramp panels lose
their hard `max-width: 340px` inside the side column, kept as a fallback when
stacked).

No behavioural change — pure layout.

## 2. "→ Poster" button by the preview

- New `.id-action` button `→ Poster` appended to `.shape-id-row` after
  `PNG`. Disabled until a shape is loaded (added to the existing enable/disable
  set in `setActionsEnabled`).
- `buildPosterTab` returns `{ element, setShapeId(id: string): void }`
  (was `{ element }`). `setShapeId` runs the existing `applyShapeId` path.
- `initApp` keeps the `buildPosterTab` handle and wires the button:
  `if (currentShapeId) { poster.setShapeId(currentShapeId); selectTab("poster"); }`.
  `selectTab` is re-added to the `initApp` destructure.
- The Poster tab's own **`Randomize` button is removed** — creation, the
  `shapeRow.append(... randomizeBtn ...)`, and its click handler. The now-unused
  imports `generateFilteredShapeId`, `randomSeed`, and `listPrimitives` are
  dropped from `poster.ts`. The "Use preview shape" button stays as the manual
  re-sync. `poster-templates.ts` / `poster-state.ts` are untouched (the poster
  `seed` field drives pattern layout, not the shape, and stays).

## 3. Primitive-toggle states + legend

Composition panel toggle chips get three visually distinct states:

| State | Style |
|---|---|
| Off (`aria-pressed="false"`) | `opacity: 0.5`, `background: transparent`, dashed border, `.primitive-toggle-name` gets `text-decoration: line-through` |
| On, unused | solid `--bs-bg` fill, solid `--bs-border` outline (current default) |
| On, used (`data-used="true"`) | `background: color-mix(in srgb, var(--bs-accent) 18%, transparent)`, `border-color: var(--bs-accent)`; badge shows `×N` |

A `.composition-legend` line (muted, ~0.72rem) is appended to the panel after
`.composition-primitives`:
*"Dim = off · outlined = allowed · filled = used in this shape"*.

`buildCompositionPanel` adds the legend element; `showUsage`/`clearUsage` and
the toggle click handler are unchanged (they already set
`aria-pressed` / `data-used`).

## Tests

- `web/test/main-layout.test.ts` — `→ Poster` button present in `.shape-id-row`,
  disabled initially, enabled after a shape loads; clicking it switches the hash
  to `#poster`. Assert `.preview-layout` / `.preview-col-main` /
  `.preview-col-side` structure and that the Composition panel is in the side
  column.
- `web/test/poster.test.ts` — no `.poster-randomize` button; `setShapeId` on the
  handle updates the poster shape input + preview.
- `web/test/composition-panel.test.ts` — a `.composition-legend` exists; the
  off-state toggle carries `aria-pressed="false"` (existing) — add an assertion
  that the legend text mentions "off" and "used".

Full core + web suites green; Biome clean; `vite build` ok.

## Non-goals

Nothing in `src/core`. No new poster templates. No change to Trace, cell editor,
Morph behaviour, or the ID codec.
