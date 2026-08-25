# Phase 2 First Public Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get BitShaper to Phase 2's done-state — a stranger can `npm install bitshaper` and see a rendered mark within a minute of reading the README — by adding publish metadata, a LICENSE, a README with an example gallery covering all 10 primitives, CI, and a documented release process.

**Architecture:** Pure docs/tooling/config work, no `src/core` logic changes. Four independent-ish tasks: (1) package.json publish metadata + LICENSE + RELEASING.md, (2) catalog additions + committed example SVGs (renders via the existing `bitshaper` CLI), (3) README.md (consumes Task 2's example filenames), (4) GitHub Actions CI + release workflows.

**Tech Stack:** npm, GitHub Actions, the existing `bitshaper` CLI (`npm run build` then `node dist/cli/index.js` or `npx bitshaper` post-link) for rendering example SVGs.

## Global Constraints

- Package name stays `bitshaper` (confirmed available on the npm registry — no scope).
- Version bumps from `0.0.1` to `0.1.0` (pre-1.0 first public release).
- License: MIT. Copyright holder: Aleksandr Sukiasov, 2026.
- `package.json` `"files"` allowlist is exactly `["dist", "README.md", "LICENSE"]` — `src`, `samples`, `test`, `docs` are excluded from the published npm tarball (matches CLAUDE.md's existing note to keep `samples/` out of `files`).
- No new runtime or dev dependencies. No changesets or other release-automation tooling — release is a manual version-bump-and-tag flow, documented in `RELEASING.md`.
- CI runs on Node 20 and 22 (20 is `engines`' floor, 22 is current LTS) via a matrix, on every `push` and `pull_request`.
- Release workflow triggers on tag push matching `v*` and publishes via `npm publish`, authenticated with an `NPM_TOKEN` repository secret that does not exist yet — this plan cannot create it (GitHub secret creation needs the repo owner). The final task must explicitly flag this as a manual follow-up, not silently assume it's done.
- The actual first `npm publish` (npm login/2FA, version bump to `0.1.0`, `git tag`, `git push --tags`) is performed by the repo owner outside this plan — no task runs `npm publish` or pushes a release tag.
- Registry order (needed for catalog/example work): `empty=0, fill=1, fillet=2, bulge=3, circle=4, wedge=5, cap=6, pinwheel-arc=7, step=8, ogee=9` (`src/core/registry.ts`).

---

### Task 1: Publish metadata — package.json, LICENSE, RELEASING.md

**Files:**
- Modify: `package.json`
- Create: `LICENSE`
- Create: `RELEASING.md`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks depend on (Task 3's README links to `LICENSE` and `RELEASING.md` by filename only, not by content).

- [ ] **Step 1: Replace `package.json` with the publish-ready version**

Replace the full contents of `package.json` with:

```json
{
  "name": "bitshaper",
  "version": "0.1.0",
  "description": "A compact, self-describing ID scheme for procedurally composed grid shapes (geometric marks/logo icons), plus a library, CLI, and web app to generate and render them.",
  "license": "MIT",
  "author": "Aleksandr Sukiasov",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/asukiasov/BitShaper.git"
  },
  "homepage": "https://github.com/asukiasov/BitShaper#readme",
  "bugs": {
    "url": "https://github.com/asukiasov/BitShaper/issues"
  },
  "keywords": [
    "svg",
    "generative-art",
    "icon",
    "logo",
    "procedural",
    "grid",
    "geometric"
  ],
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "exports": {
    ".": {
      "import": "./dist/core/index.js",
      "require": "./dist/core/index.cjs"
    }
  },
  "bin": {
    "bitshaper": "dist/cli/index.js"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "lint": "biome check .",
    "format": "biome format --write ."
  },
  "dependencies": {
    "commander": "^12.0.0"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.8.0",
    "@types/node": "^20.11.0",
    "typescript": "^5.3.0",
    "tsup": "^8.0.0",
    "vitest": "^1.0.0"
  }
}
```

- [ ] **Step 2: Verify `package.json` is well-formed**

Run: `node -e "console.log(require('./package.json').name)"`
Expected: prints `bitshaper` with no error.

- [ ] **Step 3: Create `LICENSE`**

Create `LICENSE` with exactly this content (standard MIT license text):

```
MIT License

Copyright (c) 2026 Aleksandr Sukiasov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 4: Create `RELEASING.md`**

Create `RELEASING.md` with exactly this content:

```markdown
# Releasing

BitShaper's release process is a manual version bump plus a git tag; the
`release` GitHub Actions workflow (`.github/workflows/release.yml`) does
the actual `npm publish` once you push the tag.

## One-time setup (repo owner)

Before the first release, add an `NPM_TOKEN` repository secret (Settings
→ Secrets and variables → Actions → New repository secret) containing an
npm [automation token](https://docs.npmjs.com/creating-and-viewing-access-tokens)
with publish access to the `bitshaper` package. The release workflow
publishes as this token; without it, the tag-triggered publish step
fails.

## Cutting a release

1. Bump `"version"` in `package.json` to the new semver value.
2. Commit: `git commit -am "chore: release vX.Y.Z"`.
3. Tag: `git tag vX.Y.Z`.
4. Push both: `git push && git push --tags`.
5. The `release` workflow builds, tests, and publishes to npm on the tag
   push. Watch its run under the repo's Actions tab.

No changesets or other automated version-bump tooling is used — this
manual flow is deliberately simple for the current release cadence.
```

- [ ] **Step 5: Commit**

```bash
git add package.json LICENSE RELEASING.md
git commit -m "chore: add publish metadata, LICENSE, and release process docs"
```

---

### Task 2: Catalog additions + committed example SVGs

**Files:**
- Modify: `src/library/catalog.json`
- Create: `docs/examples/circle-duo.svg`
- Create: `docs/examples/wedge-fan.svg`
- Create: `docs/examples/cap-row.svg`
- Create: `docs/examples/pinwheel-arc-spin.svg`
- Create: `docs/examples/step-stack.svg`
- Create: `docs/examples/ogee-wave.svg`
- Create: `docs/examples/diamond.svg`
- Create: `docs/examples/corner-notch.svg`
- Create: `docs/examples/bulge-cross.svg`
- Create: `docs/examples/filled-square.svg`
- Create: `docs/examples/pinwheel.svg`
- Create: `docs/examples/checker-bulge.svg`
- Create: `docs/examples/scatter-nine.svg`
- Create: `docs/examples/scatter-sixteen.svg`

**Interfaces:**
- Consumes: `bitshaper` CLI's `render` subcommand (`src/cli/commands/render.ts`, already implemented): `node dist/cli/index.js render "<shapeId>" -o <file>`.
- Produces: `docs/examples/<slug>.svg` files that Task 3's README embeds by these exact filenames. The full 14-entry catalog (8 existing + 6 new below) collectively uses all 10 registry primitives (existing 8 already cover `empty`, `fill`, `fillet`, `bulge` — verified by decoding them; new 6 cover `circle`, `wedge`, `cap`, `pinwheel-arc`, `step`, `ogee`, one each).

- [ ] **Step 1: Append 6 new entries to `src/library/catalog.json`**

Replace the full contents of `src/library/catalog.json` with (the first 8 entries are unchanged from today; 6 new entries are appended):

```json
[
  { "id": "BS-2X2-GIMKE", "name": "Diamond", "tags": ["geometric", "symmetric"] },
  { "id": "BS-2X2-888Ge", "name": "Corner Notch", "tags": ["geometric", "asymmetric"] },
  { "id": "BS-3X3-0S0Q8U0O0s", "name": "Bulge Cross", "tags": ["organic", "symmetric"] },
  { "id": "BS-2X2-8888W", "name": "Filled Square", "tags": ["geometric", "solid"] },
  { "id": "BS-2X2-HJNLI", "name": "Pinwheel", "tags": ["geometric", "rotational"] },
  { "id": "BS-3X2-O0O0S0E", "name": "Checker Bulge", "tags": ["organic", "pattern"] },
  { "id": "BS-3X3-M9ADK8HVBH", "name": "Scatter Nine", "tags": ["generated", "asymmetric"] },
  {
    "id": "BS-4X4-ETAOVIDJ6POVDHAIs",
    "name": "Scatter Sixteen",
    "tags": ["generated", "asymmetric"]
  },
  { "id": "BS-2X2-WYbdI", "name": "Circle Duo", "tags": ["geometric", "primitive-showcase"] },
  { "id": "BS-2X2-egjlo", "name": "Wedge Fan", "tags": ["geometric", "primitive-showcase"] },
  { "id": "BS-2X2-mortK", "name": "Cap Row", "tags": ["geometric", "primitive-showcase"] },
  {
    "id": "BS2-2X2-0u0w0z113q",
    "name": "Pinwheel Arc Spin",
    "tags": ["geometric", "primitive-showcase"]
  },
  { "id": "BS2-2X2-121417194M", "name": "Step Stack", "tags": ["geometric", "primitive-showcase"] },
  { "id": "BS2-2X2-1A1C1F1H4s", "name": "Ogee Wave", "tags": ["organic", "primitive-showcase"] }
]
```

- [ ] **Step 2: Run the existing catalog test suite to verify every entry (including the 6 new ones) decodes and renders**

Run: `npm run build && npx vitest run test/library/index.test.ts`
Expected: all tests pass, including the per-entry `"<name>" (<id>) decodes and renders without error` cases for the 6 new entries. This is existing coverage (`test/library/index.test.ts`'s `catalog entries are all renderable` block iterates `listCatalog()`) — no new test file is needed.

- [ ] **Step 3: Render all 14 catalog entries to `docs/examples/`**

Create the directory and render each entry with the CLI (already built in Step 2's `npm run build`):

```bash
mkdir -p docs/examples
node dist/cli/index.js render "BS-2X2-GIMKE" -o docs/examples/diamond.svg
node dist/cli/index.js render "BS-2X2-888Ge" -o docs/examples/corner-notch.svg
node dist/cli/index.js render "BS-3X3-0S0Q8U0O0s" -o docs/examples/bulge-cross.svg
node dist/cli/index.js render "BS-2X2-8888W" -o docs/examples/filled-square.svg
node dist/cli/index.js render "BS-2X2-HJNLI" -o docs/examples/pinwheel.svg
node dist/cli/index.js render "BS-3X2-O0O0S0E" -o docs/examples/checker-bulge.svg
node dist/cli/index.js render "BS-3X3-M9ADK8HVBH" -o docs/examples/scatter-nine.svg
node dist/cli/index.js render "BS-4X4-ETAOVIDJ6POVDHAIs" -o docs/examples/scatter-sixteen.svg
node dist/cli/index.js render "BS-2X2-WYbdI" -o docs/examples/circle-duo.svg
node dist/cli/index.js render "BS-2X2-egjlo" -o docs/examples/wedge-fan.svg
node dist/cli/index.js render "BS-2X2-mortK" -o docs/examples/cap-row.svg
node dist/cli/index.js render "BS2-2X2-0u0w0z113q" -o docs/examples/pinwheel-arc-spin.svg
node dist/cli/index.js render "BS2-2X2-121417194M" -o docs/examples/step-stack.svg
node dist/cli/index.js render "BS2-2X2-1A1C1F1H4s" -o docs/examples/ogee-wave.svg
```

Expected: 14 files created under `docs/examples/`, each a non-empty `<svg ...>...</svg>` document (no command prints an `Error:` line — `runRenderCommand` prints `Error: ...` and exits non-zero on failure, per `src/cli/commands/render.ts`).

- [ ] **Step 4: Verify no render command failed**

Run: `ls docs/examples/*.svg | wc -l`
Expected: `14`

- [ ] **Step 5: Commit**

```bash
git add src/library/catalog.json docs/examples/
git commit -m "feat: add catalog entries and example renders for all 10 primitives"
```

---

### Task 3: README.md

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: the 14 `docs/examples/*.svg` filenames produced by Task 2 (embedded as relative image links); `LICENSE` and `RELEASING.md` from Task 1 (linked by filename); `docs/architecture.md` and `docs/code-standards.md` (already exist in the repo, linked for contributors).
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Create `README.md`**

Create `README.md` with exactly this content:

````markdown
# BitShaper

A compact, self-describing ID scheme for procedurally composed grid
shapes (geometric marks/logo icons) — plus a library and CLI to generate
and render them from that ID, no lookup table required.

A shape ID decodes offline: `BS-{cols}X{rows}-{payload}{checksum}`, one
base62 character per grid cell (row-major), each character encoding that
cell's primitive type, rotation, and mirroring. See
[`openspec/roadmap.md`](openspec/roadmap.md) for the full format rationale.

## Install

```bash
npm install bitshaper
```

## Examples

Every mark below is rendered straight from its shape ID — no assets,
just the ID string.

| | | |
|---|---|---|
| ![Diamond](docs/examples/diamond.svg)<br>Diamond — `BS-2X2-GIMKE` | ![Corner Notch](docs/examples/corner-notch.svg)<br>Corner Notch — `BS-2X2-888Ge` | ![Bulge Cross](docs/examples/bulge-cross.svg)<br>Bulge Cross — `BS-3X3-0S0Q8U0O0s` |
| ![Filled Square](docs/examples/filled-square.svg)<br>Filled Square — `BS-2X2-8888W` | ![Pinwheel](docs/examples/pinwheel.svg)<br>Pinwheel — `BS-2X2-HJNLI` | ![Checker Bulge](docs/examples/checker-bulge.svg)<br>Checker Bulge — `BS-3X2-O0O0S0E` |
| ![Circle Duo](docs/examples/circle-duo.svg)<br>Circle Duo — `BS-2X2-WYbdI` | ![Wedge Fan](docs/examples/wedge-fan.svg)<br>Wedge Fan — `BS-2X2-egjlo` | ![Cap Row](docs/examples/cap-row.svg)<br>Cap Row — `BS-2X2-mortK` |
| ![Pinwheel Arc Spin](docs/examples/pinwheel-arc-spin.svg)<br>Pinwheel Arc Spin — `BS2-2X2-0u0w0z113q` | ![Step Stack](docs/examples/step-stack.svg)<br>Step Stack — `BS2-2X2-121417194M` | ![Ogee Wave](docs/examples/ogee-wave.svg)<br>Ogee Wave — `BS2-2X2-1A1C1F1H4s` |
| ![Scatter Nine](docs/examples/scatter-nine.svg)<br>Scatter Nine — `BS-3X3-M9ADK8HVBH` | ![Scatter Sixteen](docs/examples/scatter-sixteen.svg)<br>Scatter Sixteen — `BS-4X4-ETAOVIDJ6POVDHAIs` | |

Together these cover all 10 primitives currently in the registry:
`empty`, `fill`, `fillet`, `bulge`, `circle`, `wedge`, `cap`,
`pinwheel-arc`, `step`, `ogee`.

## Library usage

```ts
import {
  decodeShapeId,
  encodeShapeId,
  renderShape,
  generateShapeId,
} from "bitshaper";

// Decode a shape ID into its grid definition
const shapeDef = decodeShapeId("BS-2X2-GIMKE");
// { cols: 2, rows: 2, cells: [...] }

// Render a shape ID straight to an SVG string
const svg = renderShape("BS-2X2-GIMKE");

// Encode a grid definition back into its canonical ID
const id = encodeShapeId(shapeDef); // "BS-2X2-GIMKE"

// Deterministically generate a new shape ID from a seed
const generatedId = generateShapeId("my-seed", { cols: 3, rows: 3 });
```

## CLI usage

```bash
# Decode and render a shape ID to an SVG file
bitshaper render "BS-2X2-GIMKE" -o diamond.svg
bitshaper render "BS-2X2-GIMKE" -o diamond.svg --fill "#1d4ed8"

# Deterministically generate and render a shape from a seed
bitshaper generate --seed my-seed --grid 3x3 -o generated.svg

# List every curated catalog entry
bitshaper list
```

## Contributing

See [`docs/architecture.md`](docs/architecture.md) for where code lives
and [`docs/code-standards.md`](docs/code-standards.md) for how it's
written. This project uses spec-driven development via
[OpenSpec](openspec/) for changes under `src/`.

## License

[MIT](LICENSE)
````

- [ ] **Step 2: Sanity-check every image link resolves to a file that exists**

Run:
```bash
grep -o 'docs/examples/[a-z0-9-]*\.svg' README.md | sort -u | while read -r f; do test -f "$f" || echo "MISSING: $f"; done
```
Expected: no output (every referenced file exists — Task 2 created all 14).

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with install, usage, and example gallery"
```

---

### Task 4: CI and release GitHub Actions workflows

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/release.yml`

**Interfaces:**
- Consumes: `npm run build`, `npm run lint`, `npm test` scripts from `package.json` (unchanged by this plan).
- Produces: nothing other tasks depend on. This task's final step must report the `NPM_TOKEN` secret as an unresolved manual prerequisite (see Global Constraints) — it is not something this task can complete.

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

Create `.github/workflows/ci.yml` with exactly this content:

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm run lint
      - run: npm test
```

- [ ] **Step 2: Create `.github/workflows/release.yml`**

Create `.github/workflows/release.yml` with exactly this content:

```yaml
name: Release

on:
  push:
    tags:
      - "v*"

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          registry-url: https://registry.npmjs.org
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 3: Verify both workflow files were written exactly as specified**

Read back `.github/workflows/ci.yml` and `.github/workflows/release.yml` and diff each, line by line, against the content given in Step 1 and Step 2 respectively (indentation matters in YAML — a mismatched indent silently changes which job/step a key belongs to).
Expected: byte-for-byte match with no extra or missing indentation.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml .github/workflows/release.yml
git commit -m "ci: add build/test workflow and tag-triggered npm publish workflow"
```

- [ ] **Step 5: Report the outstanding manual prerequisite**

In the task report, state explicitly: the `release.yml` workflow will fail on its `npm publish` step until the repo owner adds an `NPM_TOKEN` repository secret (documented in `RELEASING.md`, Task 1). This is expected and out of scope for this task — do not attempt to create the secret or work around its absence.

---

## Post-plan (not part of any task, repo owner only)

Once all 4 tasks are merged: add the `NPM_TOKEN` GitHub repo secret, then follow `RELEASING.md` to cut `v0.1.0` (version is already `0.1.0` from Task 1, so this is tag-and-push: `git tag v0.1.0 && git push --tags`).
