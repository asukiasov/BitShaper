# BitShaper web — UX polish pass 2

**Date:** 2026-09-06
**Status:** accepted

Second round of web-app UX feedback. This change is the small, self-contained
"copy & layout" slice. Larger follow-ups tracked separately:

- **Change B** — unified control panel (all primitives + columns/rows +
  randomize in one panel under Morph; picking an example highlights the
  primitives it uses; tabs become Create / Trace / Poster).
- **Change C** — new primitives from `samples/new 4` + curated examples.
- **Change D** — Poster tab (composition/template layer).

## Scope

### 1. Export filenames = shape ID

`exportSvg` / `exportPng` are already parameterised with a filename. `main.ts`
passes `` `${currentShapeId}.svg` `` / `` `${currentShapeId}.png` `` instead of
relying on the `bitshaper-mark.*` defaults. No change to file *content* or to
the codec. A `~` ramp block in the ID is left as-is (valid in filenames on all
target OSes).

### 2. Terminology

- The preview's repeat control is relabelled **"Pattern"** with help text
  *"Repeat this shape 1–10× to preview it as a tiling pattern."* `1` still means
  a single shape (no `<pattern>` element). The input, clamping, and seam-status
  note are unchanged in behaviour.
- Seam-status wording drops the reference to the removed "Seamless tile"
  generator control; it now reads purely as a property of the loaded shape
  (`— edges line up ✓` / `— edges don't line up`).

### 3. Action buttons next to the ID

`Copy ID`, `SVG`, `PNG` move from the header toolbar (added in polish pass 1)
into `.shape-id-row`, as compact buttons immediately after the read-only ID
input. `.app-toolbar` and its header slot are removed; the header is just the
wordmark again. All three buttons are `disabled` until a shape is loaded and
re-enabled by `updateToolbarEnabled` (kept, renamed `setActionsEnabled`).

### 4. Sticky preview

The preview container + shape-ID row (with its buttons) are wrapped in a
`.preview-sticky` element with `position: sticky; top: 0`, a solid
`--bs-bg` background, and a little bottom padding, so a Randomize / example
click always changes something visible while the user is scrolled down among
the controls. The history hint, ramp panel, primitive usage, and Pattern
control stay in `.preview-section` below, scrolling normally.

The cell-edit overlay (absolutely positioned inside the preview container) is
unaffected — it moves with its container.

### 5. "Curated marks" → "Examples"

The third tab's label becomes **Examples** and its hash id becomes
`examples` (was `marks`). `TABS` and `readTabFromHash` updated; an old
`#marks` hash falls through to the default tab.

### 6. Seamless tiling removed

From `generator-form.ts`: the `tileable` checkbox, its label, the
`mixFieldset.disabled` wiring, `readTileable`, and the `generateTileableShapeId`
branch in `generateFromForm` are all deleted. `generateTileableShapeId` /
`generateTileableShapeDef` stay exported from `bitshaper` core, just unused by
the web app. The generator-form test "generates a tileable mark when the
Seamless tile checkbox is checked" is removed.

### 7. Seed help

Under the seed input, a `.seed-hint` line:
*"Same seed → same shape from Randomize. To share an exact shape, copy its ID
or URL instead."* Plus a small `Copy` button in the seed row that copies the
current seed field value (no-op on empty), using the existing
`copyToClipboard` helper with the same "Copied!" affordance.

## Non-goals

- No core/codec changes. No new primitives. No control-panel restructure
  (that's Change B). No poster mode (Change D).
- The seed still does not appear in the shape ID or in exports — the ID is
  already the reproducibility mechanism; the hint just says so.

## Tests

- `web/test/main-layout.test.ts` — update toolbar test to expect the buttons in
  `.shape-id-row`; update tab test for `Examples` / `#examples`; add a sticky
  wrapper assertion and an export-filename assertion (spy on `triggerDownload`
  or assert the `download` attribute).
- `web/test/generator-form.test.ts` — drop the tileable-checkbox test; add an
  assertion that no `input[name="tileable"]` exists.
- Full core + web suites stay green; Biome clean.
