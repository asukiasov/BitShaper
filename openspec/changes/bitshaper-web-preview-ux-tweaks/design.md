## Context

Full design + rationale: `docs/superpowers/specs/2026-08-28-bitshaper-web-preview-ux-tweaks-design.md`.

Constraints:
- No core-package change. Web app consumes `bitshaper`'s public API only.
- Vanilla-DOM style, matching `web/src/cell-editor.ts` / `web/src/main.ts`.
- `showShape(shapeId, opts?)` keeps its signature.
- No new history/undo data structure — browser `pushState` history already records every
  generated mark and `popstate` restores it.

## Decisions

### 1. `web/src/cell-editor.ts` — `openPopover` placement

Replace the current clamp-to-container block (`const anchor = button.getBoundingClientRect()`
… `panel.style.top = …`) with side selection:

```
cellRect  = button.getBoundingClientRect() (minus container origin → local coords)
bounds    = root.getBoundingClientRect()   (the .cell-overlay-root box)
gap       = readCssVarPx("--cell-popover-gap", 8)
pw, ph    = panel.offsetWidth, panel.offsetHeight

candidates, in order:
  right : x = cellRect.right + gap,              y = alignCross(cellRect.top, ph, bounds.height)
  left  : x = cellRect.left - gap - pw,          y = alignCross(cellRect.top, ph, bounds.height)
  below : y = cellRect.bottom + gap,             x = alignCross(cellRect.left, pw, bounds.width)
  above : y = cellRect.top - gap - ph,           x = alignCross(cellRect.left, pw, bounds.width)

fits(c) = c.x >= 0 && c.y >= 0 && c.x + pw <= bounds.width && c.y + ph <= bounds.height
        && !overlapsCell(c)          // rect intersection test against cellRect

pick first candidate that fits; else fallback:
  choose axis with more free space; place panel flush to the far container edge on that axis
  (maximally away from the selected cell), clamp the cross axis into [0, bounds - panel].
```

- `alignCross(start, size, limit)` = `Math.max(0, Math.min(start, limit - size))` — keeps the
  panel edge aligned to the cell but inside the container.
- `overlapsCell` is a standard AABB intersection between the candidate panel rect and
  `cellRect`.
- Coordinates stay relative to `root` (already `position: absolute; inset: 1rem` inside
  `.preview-container`), same as today; `panel.style.left/top` unchanged in mechanism.
- Everything else in `openPopover` (contents, listeners, focus, `closePopover` reuse) is
  untouched.

Selected-cell highlight already exists (`.cell-hit[aria-pressed="true"]` set when the popover
opens); no change needed beyond confirming it in a test.

### 2. `web/src/main.ts` — `reusePrimitives`

Delete the line:

```ts
generatorSection.scrollIntoView({ behavior: "smooth", block: "start" });
```

Update the doc comment: drop "then scrolls the generator into view" / "scrolls the generator
into view" phrasing; it now just "configures the generator form" and "does not regenerate".
`generatorSection` may become unused in that function — leave the parameter/closure ref if
still referenced elsewhere, otherwise clean the unused binding per biome.

### 3. `web/src/main.ts` — layout hint

In `buildLayout`, after `shapeIdRow` is appended to `previewSection`:

```ts
const historyHint = document.createElement("p");
historyHint.className = "section-hint";
historyHint.textContent =
  "Randomized a few times? Use your browser's Back button to step through previous marks.";
previewSection.appendChild(historyHint);
```

Place it before `rampPanelContainer`. No new CSS (reuses `.section-hint`).

### 4. `web/src/style.css`

- Add `--cell-popover-gap: 8px;` to `:root` (or the existing web token block).
- No other rule change expected; if the panel needs `max-width` to fit beside a cell in a
  small preview, cap it with an existing spacing token.

## Risks / trade-offs

- **jsdom has no layout**: `offsetWidth` / `getBoundingClientRect` return 0 there. Tests must
  stub these (set `getBoundingClientRect` on the button and `root`, and define
  `offsetWidth`/`offsetHeight` on the panel) — the pattern the existing cell-editor tests
  already use for the overlay-sizing assertions.
- **Fallback still covers non-selected cells** when the grid fills the preview. Accepted: the
  requirement is only that the *selected* cell stays visible.

## Migration

None. Additive/behavioural web-app tweaks.
