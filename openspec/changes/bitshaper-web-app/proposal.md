## Why

BitShaper's core library and CLI are published (`bitshaper@0.1.0` on npm), but using either still requires developer tools — installing a package, running a CLI command. Per the project roadmap (`docs/superpowers/specs/2026-08-24-bitshaper-roadmap-design.md`, Phase 4), the audience beyond developers is non-developers who want to browse and generate marks without touching a terminal. A hosted web app is the next roadmap phase, sequenced after the npm publish (Phase 2) and the primitive registry growing to its current 10 types (Phase 3), both already done.

## What Changes

- New static web app: browse the curated catalog, generate a random mark from a seed (with grid size and primitive-mix controls), preview it live, and export as SVG or PNG.
- Sharing works through the shape ID itself as a URL parameter/permalink — no backend, no database; a given URL reproduces the same mark because the ID is fully self-describing.
- Built with Vanilla TypeScript + Vite (no UI framework), consistent with the core package's zero-framework style. Imports `bitshaper` as a regular dependency.
- Deployed to GitHub Pages via a new GitHub Actions workflow (`.github/workflows/pages.yml`), triggered on push to `main` when `web/` changes.
- New top-level `web/` directory holds the app; it is a separate npm workspace/package from the root `bitshaper` library package, not published to npm.

## Capabilities

### New Capabilities

- `web-app`: the hosted static web app — catalog browsing, seed-based generation with grid/primitive controls, live preview, SVG/PNG export, and shape-ID-based permalink sharing.

### Modified Capabilities

None. The web app consumes the existing public API (`decodeShapeId`, `encodeShapeId`, `renderShape`, `generateShapeId`) and the existing catalog (`listCatalog`/`getCatalogEntry`) without changing their behavior.

## Impact

- New directory `web/` (app source, `package.json`, Vite config) — does not affect the root package's `files` allowlist or published npm tarball.
- New `.github/workflows/pages.yml` — additive, does not change the existing `ci.yml`/`release.yml` workflows.
- Root `package.json` may gain an npm workspaces entry for `web/` if the monorepo layout needs it (decided in design.md).
- No changes to `src/core`, `src/library`, or `src/cli` behavior — the web app is a pure consumer of the published `bitshaper` API surface.
- Repository's GitHub Pages setting needs to be enabled (Settings → Pages → Source: GitHub Actions) before the deploy workflow can publish — a manual, one-time repo-owner step, same category as the `NPM_TOKEN` secret from Phase 2.
