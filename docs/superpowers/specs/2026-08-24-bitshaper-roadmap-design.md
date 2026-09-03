# BitShaper Project Roadmap

## Context

BitShaper is a compact, self-describing ID scheme (`BS-{cols}X{rows}-{payload}{checksum}`) for procedurally composed grid shapes, plus a core library, CLI, and (eventually) a web app to generate and render them. Today the only artifacts are 72 reference SVGs in `samples/` and the OpenSpec design for the ID format and core package (`openspec/changes/bitshaper-core-package`); no code has been written yet.

This document is the whole-project roadmap: the arc from "library exists" to "people use it," beyond what any single in-flight OpenSpec change covers. `openspec/roadmap.md` remains the technical decision log (why the ID format is what it is); this doc is the forward-looking sequence of phases.

**Project context established during brainstorming:**
- **Audience:** developers embedding the library first, then a hosted web app for non-developers, in that order — not simultaneously.
- **Output types:** two distinct things appear in the reference material — single-glyph marks (logo icons) and seamless tiled patterns (repeating backgrounds). These are related but sequenced separately: marks are the entire scope for now; seamless tiling is deliberately deferred as a distinct, harder problem, not assumed into the current data model.
- **Business context:** open-source side project. The roadmap optimizes for polish, documentation, and adoption over monetization or commercial readiness.

## Sequencing Approach

Strict linear, ship-thin: finish the current change exactly as scoped, publish v1 with minimal primitives, *then* grow the primitive registry, *then* build the web app, with seamless tiling kept as a separate later exploration. This keeps work-in-progress low for a solo/small side project and gets a real, shareable publish milestone early rather than delaying on open-ended scope (e.g., "how many primitives is enough").

A Figma plugin (Phase 6) is likewise planned but unscheduled — a distribution surface built on top of the published package, not a change to it.

An image-to-mark "trace" feature for the web app (Phase 7) is planned as the next web-app step: upload a PNG/JPG/SVG, get the closest mark expressible as a BitShaper ID, then hand-tune it. It depends on a per-cell grid editor in the web app, which does not exist yet.

Two alternatives were considered and rejected for now:
- **Library-depth-first** (extract more primitives from the 72 sample SVGs before ever publishing v1) — rejected because it delays any real usage or feedback and has no natural stopping point.
- **Thin-slice-to-app fast** (skip primitive growth, go straight from CLI to a minimal web app) — rejected because the first visual, shareable thing people see would be repetitive with only 4 primitives, a weak first impression for a generative design tool.

## Phases

### Phase 1 — `bitshaper-core-package` (in flight, unchanged)

Ship exactly what's already scoped in `openspec/changes/bitshaper-core-package`: shape ID codec, 4 starter primitives (`empty`/`fill`/`fillet`/`bulge`), `renderShape`/`generateShapeDef`/`generateShapeId`, curated catalog, and the `bitshaper` CLI (`render`/`generate`/`list`). No scope changes here — this roadmap doesn't touch that change's design; it picks up after it.

### Phase 2 — Publish v1 + docs/examples

Get the package into the world:
- `npm publish` of the `bitshaper` package.
- README with install/usage/CLI examples.
- A handful of rendered example marks committed as images so GitHub shows visual proof, not just code.
- Basic CI (build + test on push) and a release process.

**Done-state:** a stranger can `npm install bitshaper` and see a rendered mark within a minute of reading the README.

### Phase 3 — Grow the primitive registry

Extract more primitives from the 72 reference SVGs in `samples/svgs/`, pushing the registry from 4 types toward its 8-type ceiling (per the "8-type ceiling" note in `openspec/roadmap.md`). Each new primitive follows the established pattern: a pure path-builder function, rotation/invert handling via the shared geometry transform, and a test pinning its registry index.

**Trigger to watch:** hitting a 9th primitive type forces the ID-format v2 decision `openspec/roadmap.md` already anticipates (a version-prefix character, or a widened 2-characters-per-cell encoding). That decision is deliberately not made now — it's revisited only when the registry actually approaches the ceiling.

### Phase 4 — Web app (generator/gallery)

A hosted UI built on top of the published npm package:
- Browse the curated catalog.
- Generate random marks by seed; adjust grid size and primitive mix.
- Preview and export as SVG/PNG.
- Share via the shape ID itself as the permalink/state — no backend database needed to reproduce a given mark, since the ID is self-describing.

Static-first architecture (no required backend for core generation/sharing) to keep hosting trivial for a side project.

**Done-state:** someone with no developer tools can land on a URL and leave with a downloaded mark.

### Phase 5 — Seamless pattern tiling (exploration → MVP shipped)

**Status: design spike done, core MVP implemented.** See
`docs/superpowers/specs/2026-09-03-bitshaper-pattern-tiling-exploration.md` for the full
decision doc (recommendation + rejected alternatives per open question).

Resolved by the spike:
- **Edge-matching:** a *derived* discrete edge-profile descriptor computed from existing
  primitive geometry — no separate tiling-aware primitive set. v1 uses coverage-match ("C1", no
  fill cracks); tangent-match ("C2", no slope kink) is a deferred refinement.
- **ID format:** no change. Tileability is a derived property of the existing cell payload;
  `renderShape` gained an optional `tile` flag that wraps the mark in an SVG `<pattern>`. Offset
  / sub-unit repeats would carry new data and get their own suffix-block change if ever wanted.
- **Data model:** `ShapeDef` unchanged; tileability is a generate/validate-time filter
  (`isTileable`, `generateTileableShapeId`), not a stored field.

Shipped in `src/core/tiling.ts` + `renderShape`. The generator currently emits **uniform
self-tiling grids only** (strict C1 makes random grids almost never tile). Remaining, in
priority order: a constructive per-cell solver for non-uniform tileable patterns (the real
visual payoff), CLI flags (`--tile`, `--tileable`), a web-app tileable toggle + repeat-preview,
then C2. None of these is committed scope yet.

### Phase 6 — Figma plugin (public Community)

**Status: planned, not scheduled.** Recorded here from a brainstorm so the intent and decisions aren't lost; it gets its own spec + implementation plan when it's picked up. Independent of Phase 5 — the plugin ships monochrome-mark generation and has nothing to do with seamless tiling.

A Figma plugin, published on the Figma Community, that lets a designer generate and place BitShaper marks without leaving Figma:

- **Generate new marks** — seed, grid size, and primitive-mix controls, mirroring the web app's generator.
- **Insert from an ID** — paste a BitShaper shape ID, drop that exact mark onto the canvas.
- **Batch insert** — a quantity field (e.g. 10); the plugin generates that many marks and arranges them in a tidy near-square grid centered in the current viewport.
- **Color** — a single color field (default `#000000`). A "random colors" checkbox plus a field for a comma-separated list of hex colors: when checked, each inserted mark is assigned **one** color picked at random from that list (one color per mark — not per cell). Designers paste their brand palette and get a batch of on-brand marks.
- Each inserted mark is **one merged vector path** (the single `<path>` from `renderShape`, brought in via `figma.createNodeFromSvg`), named with its shape ID, editable like any Figma vector.

**Key decisions from the brainstorm:**
- **No core library changes.** The plugin is a plain consumer of the published `bitshaper` npm package (`decodeShapeId`, `renderShape`, `generateShapeId`, `listPrimitives`) and carries its own small copy of the web app's primitive-mix filter (~15 lines, already a documented deliberate client-side shim). Extraction into a shared module is deferred until a third consumer needs it. If the build turns up a genuine need for a core change, that change is split out as its own OpenSpec proposal first.
- **Random color is plugin-only** — the web generator does not need it and does not get it.
- **One color per mark**, so a single merged path is sufficient; no per-cell / multi-path render mode.

**Non-goals for this phase:** per-cell or multi-color-within-one-mark rendering; two-way editing (reading a selected canvas node back to its shape ID); seamless tiling in the plugin; FigJam / Figma Slides support (design files only).

**Done-state:** a designer installs the BitShaper plugin from the Figma Community and drops a batch of on-brand geometric marks — freshly generated or from a shared ID, in their own colors — onto the canvas as clean editable vectors, without leaving Figma. Public listing sets the polish bar: plugin icon, cover art, listing copy, and passing Figma's review are all part of the done-state.

### Phase 7 — Web app: image-to-mark "trace" (next web-app step)

**Status: planned, not scheduled.** Recorded here from an explore session so the intent and decisions aren't lost; it gets its own OpenSpec proposal + implementation plan when it's picked up. Builds entirely on top of Phase 4's web app and the published `bitshaper` package — no core library changes anticipated.

The feature: a user uploads an image of a shape (PNG, JPG, or SVG) and the app returns the **closest mark expressible as a BitShaper ID**, dropped into the grid editor as a starting point they then hand-tune, re-grid, export, and share like any other mark. It does not reproduce the image — it finds the nearest shape the ID format can express.

**Pipeline (all client-side, no backend, no ML):**
1. **Ingest** — rasterize the upload to a bitmap. SVG is rasterized like the raster formats, not path-parsed, so all three inputs behave identically and expectations stay honest.
2. **Normalize** — crop to content bounding box, threshold to a filled/empty mask, square the aspect. Auto-guess foreground/background with a user "swap fg/bg" toggle. Color is ignored — marks are monochrome.
3. **Grid** — user-adjustable via a slider; the reconstruction re-matches live. No auto-detection of grid resolution (fuzzy, disappointing).
4. **Per-cell match** — for each grid cell, rasterize all `types × 4 rotations × 2 invert` candidates from the current registry, score each against the cell's pixels by **IoU** (intersection-over-union of filled area), keep the best. ~100+ candidates per cell is cheap in-browser. A later refinement, only if plain IoU disappoints: weight the score by boundary/edge-angle alignment.
5. **Assemble** — row-major flat indices → `encodeShapeId` → a valid `BS`/`BS2` ID.
6. **Present** — source and reconstruction shown side by side so the gap is visible and obviously the point; the ID opens in the grid editor for hand-tuning.

**Key decisions from the explore session:**
- **It's a starting sketch, not a converter.** UI framing is "a BitShaper mark *inspired by* your image — now make it yours." Framed as a converter, every result reads as a failure; framed as a sketch, every result is a win.
- **Depends on a per-cell grid editor** in the web app (click a cell, cycle its type/rotation/invert). That editor does not exist in `bitshaper-web-app` today and is the real prerequisite — "trace" is a thin layer on top of it. The editor may land as its own change first, or be bundled into the Phase 7 proposal.
- **Scoring is silhouette-match at the cell level** (per-cell IoU on a fine grid), which sidesteps choosing between whole-shape silhouette vs. feature matching — sharp corners and curves fall out of it wherever the grid is fine enough to resolve them.
- **This feature is a forcing function for Phase 3** — "what did the matcher wish it had?" is a concrete signal for which primitives to add next.

**Non-goals for this phase:** reproducing the uploaded image faithfully; multi-color or grayscale output; server-side or ML-based matching; vector/path parsing of SVG input; auto-detecting the ideal grid size; seamless tiling.

**Done-state:** a user drops a shape image onto the web app, gets a recognizable BitShaper mark back within a second or two, adjusts the grid and a few cells by hand, and exports or shares it — all with no developer tools and no backend.

## Non-Goals (for this roadmap)

- No monetization, billing, or auth readiness — this is an open-source side project, not a commercial product track.
- No commitment to seamless pattern tiling's design or timeline — Phase 5 is explicitly an open question, not a spec.
- No change to the ID format or primitive index scheme beyond what's already decided in `openspec/roadmap.md` — the v2 format question is a future trigger, not a current decision.
