## Context

Full design + rationale: `docs/superpowers/specs/2026-08-28-bitshaper-web-reuse-primitives-no-reroll-design.md`.

Constraints:
- No core-package change. Web app consumes `bitshaper`'s public API only.
- Match the existing vanilla-DOM style of `web/src/main.ts` / `web/src/primitive-usage.ts`.
- `onReuse` keeps its signature `(allowedTypes: number[], grid: { cols, rows }) => void`.

## Decisions

### `web/src/main.ts` — `reusePrimitives`

Current body:

```ts
setPrimitiveMix(generatorForm, allowedTypes);
setGridSize(generatorForm, grid);
(generatorForm.elements.namedItem("seed") as HTMLInputElement).value = "";
submitGeneratorForm(generatorForm);          // <-- remove
generatorSection.scrollIntoView({ behavior: "smooth", block: "start" });
```

New body: identical minus the `submitGeneratorForm(generatorForm)` line. Everything else —
mix, grid, seed clear, scroll — stays. `showShape` is not called, so `currentShapeId`, the
preview, the URL, and the ramp panel are untouched.

### `web/src/primitive-usage.ts` — button affordance

In `renderPrimitiveUsage`, where the reuse button is created:

- `reuseButton.textContent = "Use these primitives"` (was `"Reuse primitives"`)
- `reuseButton.title = "Load this mark's primitives and grid into the generator"`
  (was `"Generate a new mark from this same set of primitives"`)
- keep `className = "reuse-primitives-button"` (styling hook unchanged) unless the longer
  label overflows, in which case widen it in `style.css`.

The `onReuse` call and its arguments are unchanged.

## Risks / trade-offs

- Users who liked the one-click "reuse + reroll" lose it — but Randomize is one more click and
  the current behaviour is a data-loss surprise. Accepted.

## Migration

None. Pure behaviour/label change in the web app.
