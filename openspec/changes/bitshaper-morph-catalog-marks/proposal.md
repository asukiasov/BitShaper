## Why

`bitshaper-ramp-modifier` (merged) added the ramp modifier; `bitshaper-web-ramp-panel` (merged)
added the web UI to author one. But the curated catalog has no ramp-based mark, so the feature
is invisible to someone browsing "Curated marks".

The `samples/63/` morphing-grid icons were the motivation for the ramp feature, but they cannot
be catalogued as faithful reproductions: those references pack their columns/rows non-uniformly
(tight where shapes are small, spread where large) plus margins, while a ramp scales cell
*content* inside a uniform grid — best pixel agreement was ~35–65%. So instead this adds
**original** morph marks in that aesthetic, curated for "looks deliberate", the same bar the
`step`-based catalog marks were held to (that primitive had no source sample at all).

## What Changes

- Append seven ramp-based marks to `src/library/catalog.json` (42 entries total), each tagged
  `morph` (not `from-sample`):
  - **Ellipse Fade** — 6×6 `circle`, `scaleX` ramp left→right (slivers → circles).
  - **Circle Collapse** — 4×4 `circle`, `scaleY` ramp left→right (circles → lines).
  - **Growing Wedges** — 6×6 `wedge`, `scale` ramp top→bottom.
  - **Radial Bloom** — 5×5 `circle`, `scale` ramp shrinking from the centre (ease-out).
  - **Diagonal Swell** — 5×5 `circle`, `scale` ramp growing toward the bottom-right.
  - **Twist Grid** — 4×4 `fill`, `angle` ramp top→bottom (woven rotation).
  - **Beacon** — 5×5 `circle`, `scale` ramp with a centre-peak curve on the radial axis (ring
    of large discs).

Each ID round-trips (`encodeShapeId(decodeShapeId(id)) === id`) and renders without error, so
`test/library/index.test.ts`'s per-entry decode/render assertions cover them automatically.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. Pure data append to the curated catalog; no code or API change.

## Impact

- `src/library/catalog.json` gains 7 entries (35 → 42). No change to `src/library/index.ts`,
  the core package, the CLI, or `web/` — the web app's catalog view and the CLI `list` command
  render the new marks automatically, and the Morph panel populates from them when selected.
- `test/library/index.test.ts` and `test/cli/commands/list.test.ts` need no changes (both
  iterate the catalog dynamically).
