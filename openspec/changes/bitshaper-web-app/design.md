## Context

See proposal.md - Why/What Changes. Constraints this design works within:

- `bitshaper` is published on npm (`0.1.0`) with a stable public API: `encodeShapeId`, `decodeShapeId`, `renderShape`, `generateShapeDef`, `generateShapeId`, plus `listCatalog`/`getCatalogEntry` from `src/library`.
- The root repo is a single npm package today (`package.json` at the repo root, `src/`, `test/`, `dist/`). The web app must not become part of that published package's `files` allowlist (`dist`, `README.md`, `LICENSE`) or its dependency graph.
- Repo already has GitHub Actions (`ci.yml`, `release.yml`) and is hosted at `github.com/asukiasov/BitShaper`.
- Frontend stack: Vanilla TypeScript + Vite, no UI framework (project owner's choice, matching the core package's zero-framework style). Hosting: GitHub Pages.

## Goals / Non-Goals

**Goals:**
- A single static site, buildable with `vite build`, deployable to GitHub Pages, that satisfies every requirement in `specs/web-app/spec.md`.
- Keep the web app's dependency on `bitshaper` identical to any other consumer's — it imports the published package's public API, not `src/core` internals directly. This doubles as a real-world smoke test of the published package.
- Zero required backend: generation, rendering, and export all run in the browser; sharing is pure URL state.

**Non-Goals:**
- No user accounts, saved galleries, or server-side persistence (explicitly excluded by "static-first" in the roadmap and proposal).
- No mobile app or native wrapper — a responsive web page is sufficient.
- No redesign of the core library's public API — the web app consumes it as-is.
- No seamless pattern tiling UI (Phase 5, not yet designed).

## Decisions

### Monorepo layout: `web/` as a sibling package, npm workspaces

**Decision:** add a root-level `web/` directory containing its own `package.json`, `vite.config.ts`, `index.html`, and `src/`. Wire it into the existing root `package.json` via `"workspaces": ["web"]` so `npm install` at the repo root also installs `web/`'s dependencies, and `web/`'s `package.json` depends on `bitshaper` via `"bitshaper": "*"` resolved to the local workspace package (not fetched from the npm registry) during development, while still exercising the same import surface a real npm consumer would use.

**Alternatives considered:**
- A fully separate repository for the web app — rejected: adds a second repo to maintain for a solo/side-project roadmap phase, and loses the ability to test the web app against an in-progress core-library change in the same PR.
- `web/` as a plain sibling directory with no workspace wiring, installing its own `node_modules` independently and depending on the published `bitshaper` npm version — considered as a simpler alternative (see Open Questions).

### Import path: published package vs. local build

**Decision:** `web/` depends on the workspace-local `bitshaper` package (resolves to `dist/` via the root package's existing `exports` field), not a version pinned from the npm registry. This means `web/` always builds against whatever is currently in `dist/`, requiring `npm run build` at the root before `web/`'s build in CI.

**Alternatives considered:**
- Depend on the published npm version (e.g. `"bitshaper": "^0.1.0"`) — rejected as the primary mode: would let the web app drift out of sync with unreleased core-library changes, and defeats using the web app as a smoke test for the library during development. (A periodic manual bump to the latest published version remains reasonable as a release-hygiene practice, but isn't the day-to-day dependency.)

### Rendering pipeline reuse

**Decision:** the web app calls `renderShape` for every preview and SVG export — the exact same function the CLI uses — so "what you see in the browser" and "what `bitshaper render` produces" are guaranteed identical by construction, not by parallel reimplementation.

### PNG export mechanism

**Decision:** PNG export rasterizes the previewed SVG client-side: draw the SVG into an offscreen `<canvas>` (via `Image` + `data:image/svg+xml` source, or `URL.createObjectURL` on an SVG `Blob`) and read back `canvas.toDataURL('image/png')` / `canvas.toBlob`. No server-side rendering, no headless-browser dependency (e.g. Puppeteer/resvg) — keeps the app fully static per the "static-first, no required backend" requirement.

**Alternatives considered:**
- A serverless function to rasterize server-side (e.g. via `resvg` or `sharp`) — rejected: reintroduces a backend dependency the roadmap explicitly wants to avoid, for a capability the browser's own canvas APIs already provide.

### URL state / permalink format

**Decision:** the shape ID lives in the URL's query string, e.g. `https://asukiasov.github.io/BitShaper/?id=BS-2X2-GIMKE`. On load, the app reads `?id=`, and if present and valid, decodes and previews it immediately; if present and invalid, shows the error state from the spec's "Invalid shape ID in URL handled gracefully" scenario. Every generation or catalog selection updates the URL via `history.replaceState` (no new browser-history entry per keystroke/tweak — only meaningful state changes, e.g. finishing a generation, push via `pushState` so back/forward navigates between distinct marks).

**Alternatives considered:**
- URL path segment (`/shape/BS-2X2-GIMKE`) instead of query string — rejected for GitHub Pages hosting specifically: GitHub Pages serves a static `index.html` at the site root with no server-side rewrite rules, so a path-based deep link (e.g. a page refresh on `/shape/BS-2X2-GIMKE`) 404s unless a `404.html` fallback trick is added. Query string avoids that entirely since every URL resolves to the same `index.html`.
- URL fragment (`#BS-2X2-GIMKE`) — workable and avoids the same routing issue, but query string is more conventional for a named parameter and equally simple; no strong reason to prefer the fragment.

### GitHub Pages deployment

**Decision:** new workflow `.github/workflows/pages.yml`, triggered on push to `main` when paths under `web/` change, using `actions/upload-pages-artifact` + `actions/deploy-pages` (the standard GitHub Actions Pages deployment flow), building with `npm run build --workspace web`. Requires the repo owner to enable Pages with source "GitHub Actions" in repo Settings — a manual one-time step, called out in the proposal's Impact section, the same category as Phase 2's `NPM_TOKEN` secret.

**Vite `base` config:** since the site serves from `https://asukiasov.github.io/BitShaper/` (a project page, not a user/org root page), `vite.config.ts` sets `base: '/BitShaper/'` so built asset URLs resolve correctly.

## Risks / Trade-offs

- **[Risk]** Workspace-local `bitshaper` dependency means `web/`'s CI build silently depends on the root package's `dist/` being freshly built first → **Mitigation:** `pages.yml` runs `npm run build` at the repo root (existing script) before `npm run build --workspace web`, and this ordering is called out explicitly in tasks.md.
- **[Risk]** Client-side SVG-to-PNG rasterization via canvas can behave inconsistently across browsers for certain SVG features (though BitShaper's rendered marks use only `M`/`L`/`A`/`Z` path commands and solid fills, a narrow, well-supported subset) → **Mitigation:** keep the exported PNG's dimensions and fill matching the SVG's own `viewBox`/fill exactly, and manually verify export in at least two browser engines before considering the task done (per tasks.md).
- **[Risk]** A shape ID pasted into the URL is fully untrusted input → **Mitigation:** the app calls the same `decodeShapeId`/`renderShape` functions already hardened by the core library's existing error handling (`ShapeIdError`, `RenderError`); the web app only needs to catch those and render the existing error state, not implement new validation.
- **[Trade-off]** No saved history/gallery of previously generated marks beyond what's in the URL or catalog — acceptable per Non-Goals; a user who wants to keep a mark must export it or keep its URL.

## Open Questions

- Should `web/`'s dependency on `bitshaper` eventually switch to the published npm version once the workspace is stable (trading tight dev-time sync for a cleaner "real consumer" story), or stay workspace-local indefinitely? Doesn't affect this change's specs or task breakdown — revisit only if the workspace-local coupling causes friction in practice.
