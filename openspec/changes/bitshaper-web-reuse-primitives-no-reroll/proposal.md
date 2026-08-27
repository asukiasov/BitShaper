## Why

The preview's **Reuse primitives** button (`web/src/primitive-usage.ts`, wired by
`reusePrimitives` in `web/src/main.ts`) sets the generator form's primitive checkboxes and
grid to the current mark's — and then immediately generates a fresh random mark, replacing
what the user was looking at. A button that says "reuse this mark's primitives" should
prepare the generator, not fire it and discard the mark.

Full design: `docs/superpowers/specs/2026-08-28-bitshaper-web-reuse-primitives-no-reroll-design.md`.

## What Changes

- `web/src/main.ts` — `reusePrimitives` stops after configuring the generator: set the
  primitive mix, set the grid, clear the seed, scroll the form into view. **Remove** the
  `submitGeneratorForm` call. The preview, shape ID, URL, ramp panel, and primitive-usage
  breakdown are left untouched; nothing regenerates until the user hits Randomize.
- `web/src/primitive-usage.ts` — relabel the button `Reuse primitives` → `Use these
  primitives` and update its `title` to `Load this mark's primitives and grid into the
  generator`. The `onReuse` callback signature is unchanged.
- `web/test/primitive-usage.test.ts` — assert the new label/title and that clicking still
  invokes `onReuse` with the ascending distinct types + grid; a wiring test confirms the
  previewed ID does not change on reuse.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-app`: the primitive-reuse control configures the generator without regenerating (the
  capability's spec delta lives with the not-yet-archived `bitshaper-web-app` change; this
  change adds a requirement scenario for the reuse control).

## Impact

- Modified: `web/src/main.ts`, `web/src/primitive-usage.ts`, `web/src/style.css` (only if the
  wider button label needs it), `web/test/primitive-usage.test.ts`.
- No change to the root `bitshaper` package, the generator form, the codec, the catalog, or
  any other web module. `onReuse` keeps its signature.
- `pages.yml` already deploys on `web/**` changes.
