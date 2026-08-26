# Phase 2 done-state: first public release — design

**Date:** 2026-08-25
**Status:** approved

## Goal

Phase 2's done-state (per `openspec/roadmap.md`'s phase sequencing): "a
stranger can `npm install bitshaper` and see a rendered mark within a
minute of reading the README." Phase 3 (`bitshaper-expand-primitives`,
`bitshaper-id-format-v2`) is already done and archived, so this phase's
README/examples showcase all 10 primitives currently in
`PRIMITIVE_REGISTRY`, not just the original 4.

## Scope

Docs/tooling only, run outside OpenSpec (per project owner: this isn't a
capability/code change, so it skips the formal proposal/design/tasks
ceremony OpenSpec uses for `src/` work). No changes to `src/core` logic,
the ID format, or the primitive registry.

Touches:
- `package.json` — publish metadata, version bump
- `LICENSE` — new, MIT
- `README.md` — new
- `src/library/catalog.json` — new entries covering all 10 primitives
- `docs/examples/*.svg` — committed renders of the curated catalog
- `.github/workflows/ci.yml` — new
- `.github/workflows/release.yml` — new
- `RELEASING.md` — new

## 1. `package.json`

Add publish-relevant fields:
- `"license": "MIT"`
- `"author": "Aleksandr Sukiasov"`
- `"repository": { "type": "git", "url": "git+https://github.com/asukiasov/BitShaper.git" }`
- `"homepage": "https://github.com/asukiasov/BitShaper#readme"`
- `"bugs": { "url": "https://github.com/asukiasov/BitShaper/issues" }`
- `"keywords": ["svg", "generative-art", "icon", "logo", "procedural", "grid", "geometric"]`
- `"files": ["dist", "README.md", "LICENSE"]` — excludes `src`, `samples`,
  `test`, `docs` from the published tarball. Matches the existing CLAUDE.md
  note to keep `samples/` out of the `files` allowlist.

Version: bump `0.0.1` → `0.1.0`. Pre-1.0 is the right call for a first
public release of a young library — semver leaves room to iterate on the
public API (`encodeShapeId`, `decodeShapeId`, `renderShape`,
`generateShapeDef`, `generateShapeId`) before committing to 1.0 stability
guarantees.

No change to `exports`, `bin`, `engines`, `type`, `scripts`, or
dependencies — those are already correct for publish.

## 2. `LICENSE`

Standard MIT license text. Copyright holder: Aleksandr Sukiasov, 2026.

## 3. Example marks + catalog

`src/library/catalog.json` currently has 8 entries, all built from the
original 4 primitives (`empty`, `fill`, `fillet`, `bulge`) — none exercise
`circle`, `wedge`, `cap`, `pinwheel-arc`, `step`, or `ogee`. Add curated
entries so the catalog reflects the full current registry: at minimum one
new entry whose cells are built from each of the 6 newer primitives
(rotation/invert variety encouraged, matching the style of existing
entries), keeping the existing 8 entries untouched. Entry `id`s are real
shape IDs — validate each with `decodeShapeId`/`renderShape` (or the
`bitshaper` CLI) before adding, the same way the existing entries had to
be valid.

Render the full curated catalog (existing 8 + new entries) via the
existing `bitshaper render <id> -o docs/examples/<slug>.svg` CLI — no new
script needed — and commit the SVGs under `docs/examples/`. Filename per
entry: kebab-case of its catalog `name` (e.g. "Diamond" →
`diamond.svg`).

README embeds a gallery of a representative subset: one mark per
primitive type at minimum (10 images), pulling from whichever catalog
entries exercise that primitive. GitHub renders `.svg` inline via
`<img>`/markdown image syntax — no build step needed for a reader to see
them.

## 4. `README.md`

Sections, in order:
1. **What BitShaper is** — one paragraph (compact self-describing ID
   scheme for procedurally composed grid marks) + the ID format one-liner
   (`BS-{cols}X{rows}-{payload}{checksum}`) with a one-line pointer to
   `openspec/roadmap.md` for the full rationale.
2. **Install** — `npm install bitshaper`.
3. **Example gallery** — the image grid described above, each image
   captioned with its catalog name and shape ID.
4. **Library usage** — minimal runnable snippets for `encodeShapeId`,
   `decodeShapeId`, `renderShape`, and `generateShapeId`, using real
   catalog IDs where a concrete example helps.
5. **CLI usage** — `bitshaper render`, `bitshaper generate`, `bitshaper
   list`, each with one example invocation and its flags.
6. **Contributing** — links to `docs/architecture.md` and
   `docs/code-standards.md`.
7. **License** — one line, links to `LICENSE`.

## 5. CI

`.github/workflows/ci.yml`: triggers on `push` and `pull_request`. Matrix
`node-version: [20, 22]` (20 is the `engines` floor, 22 is current LTS).
Steps: checkout, setup-node with npm cache, `npm ci`, `npm run build`,
`npm run lint`, `npm test`.

## 6. Release process

`.github/workflows/release.yml`: triggers on tag push matching `v*`.
Single job (Node 22): checkout, `npm ci`, `npm run build`, `npm test`,
then `npm publish` using `NODE_AUTH_TOKEN` sourced from an `NPM_TOKEN`
repo secret (setup-node's `registry-url: https://registry.npmjs.org`
handles the `.npmrc` wiring). This secret does not exist yet — the repo
owner must generate an npm automation token and add it as
`NPM_TOKEN` in GitHub repo settings before the first tag-triggered
release will succeed; this is called out explicitly in the plan and in
`RELEASING.md`, not silently assumed.

`RELEASING.md` documents the manual trigger flow: bump `version` in
`package.json` → commit → `git tag vX.Y.Z` → `git push --tags` → CI
builds, tests, and publishes. Explicitly out of scope: changesets or
other automated version-bump tooling (rejected in favor of the simpler
manual-bump-and-tag flow, per project owner's choice — revisit only if
release cadence increases enough to justify the added tooling).

The actual first `npm publish` (running `npm login`/confirming 2FA,
bumping to `0.1.0`, tagging, pushing) is performed by the repo owner, not
as part of this implementation — it's an irreversible, outward-facing
action requiring their npm credentials.

## Testing

No new automated tests are needed for README/LICENSE/example-SVG content.
The CI workflow's correctness is verified by observing it run (green) on
the PR/branch that introduces it. The catalog additions are verified by
successfully rendering each new entry's ID (proves the ID decodes and
renders without error) — if `test/library/` or `test/core/registry.test.ts`
already asserts every catalog entry is renderable, the new entries are
covered by the existing suite for free; check this during implementation
and add a targeted test only if no such coverage exists today.
