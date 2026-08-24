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

### Phase 5 — Seamless pattern tiling (exploration)

Deliberately scoped out of everything above. Needs its own design spike before any implementation:
- What makes a cell's edges "match" a neighbor's — a constraint on existing primitive geometry, or a separate tiling-aware primitive set?
- Does it reuse the current ID format, or does tiling need its own?

Treated as a research phase, not committed scope, until Phase 4 ships and there's appetite to take it on. Not to be assumed into the Phase 1–3 data model preemptively.

## Non-Goals (for this roadmap)

- No monetization, billing, or auth readiness — this is an open-source side project, not a commercial product track.
- No commitment to seamless pattern tiling's design or timeline — Phase 5 is explicitly an open question, not a spec.
- No change to the ID format or primitive index scheme beyond what's already decided in `openspec/roadmap.md` — the v2 format question is a future trigger, not a current decision.
