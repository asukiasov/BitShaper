## 1. Workspace scaffolding

- [x] 1.1 Add `"workspaces": ["web"]` to the root `package.json`.
- [x] 1.2 Create `web/package.json` (name `bitshaper-web`, private, not published), depending on `bitshaper` as a workspace-local dependency and `vite`/`typescript` as dev dependencies.
- [x] 1.3 Create `web/vite.config.ts` with `base: '/BitShaper/'` (GitHub Pages project-page path) and TypeScript support.
- [x] 1.4 Create `web/tsconfig.json` extending the root's compiler settings (strict mode, matching `docs/code-standards.md`).
- [x] 1.5 Create `web/index.html` and an empty `web/src/main.ts` entry point; verify `npm run build` at the root followed by `npm run build --workspace web` produces a working `web/dist/` (open `web/dist/index.html` via a local static server and confirm it loads with no console errors).

  Note: also required adding a `"./library"` export subpath to the root `package.json` + a `library/index` tsup entry, and a new `listPrimitives()` export from `src/core/registry.ts`/`src/core/index.ts` — the pre-existing exports field only covered `src/core`, but tasks 3.1/4.1 need `listCatalog`/primitive names through the public API. Additive only; confirmed with the user before making this change. `npm run build`, `npm test`, `npm run lint` all pass at the root after the change. Verified `web/dist` via `vite preview` (respects `base`): page loads at `/BitShaper/`, JS/CSS assets return 200, no build errors.

## 2. Shape-state module

- [x] 2.1 Create `web/src/shape-state.ts`: functions to read the `?id=` query parameter, decode it via `bitshaper`'s `decodeShapeId`, and return either the decoded shape or a typed error result (do not throw past this module).
- [x] 2.2 Add `updateUrlForShape(shapeId, { push })` — writes `?id=<shapeId>` via `history.replaceState` by default, `history.pushState` when `push` is true (per design.md's URL-state decision).
- [x] 2.3 Write unit tests (`web/test/shape-state.test.ts`, Vitest) covering: valid ID in URL decodes correctly; invalid ID in URL returns an error result, not a thrown exception; `updateUrlForShape` produces the expected query string.

## 3. Catalog browsing

- [x] 3.1 Create `web/src/catalog-view.ts`: renders every entry from `bitshaper`'s `listCatalog()` as a preview (via `renderShape`) plus name and tags, into a container element.
- [x] 3.2 Wire entry selection: clicking a catalog entry calls `updateUrlForShape` with that entry's ID (push) and updates the live preview (Task 5).
- [x] 3.3 Write a test verifying the catalog view renders one preview per `listCatalog()` entry (count matches, and each rendered preview's inner markup is non-empty).

  Note: `catalog-view.ts` exposes selection via an `onSelect(shapeId)` callback rather than calling `updateUrlForShape`/`renderPreview` itself — keeps it a pure, independently testable rendering module. The actual `updateUrlForShape` (push) + preview-update wiring happens where `main.ts` composes all modules together (task 7.2), which is where "wiring" across independent modules belongs per design.md's "direct DOM wiring" approach. Behavior at task 7 completion matches this task's requirement.

  Also required fixing `web/package.json`'s `bitshaper` dependency from `"*"` to `"file:.."`: plain npm workspaces do not auto-link the *root* package into a workspace member's `node_modules` (only entries listed under `"workspaces"` get linked to each other), so `"*"` was silently resolving from the npm registry instead of the local `dist/`, contradicting design.md's workspace-local-dependency decision. `file:..` is the standard self-reference and now produces a real symlink (verified via `readlink node_modules/bitshaper`).

## 4. Generator controls

- [x] 4.1 Create `web/src/generator-form.ts`: seed text input, grid size input (cols × rows), and primitive-mix controls (checkboxes or multi-select over the current registry's primitive names — read via the catalog/registry surface `bitshaper` exposes, not hardcoded).
- [x] 4.2 On submit, call `generateShapeId(seed, grid)` (primitive-mix filtering per design.md's scope — if `generateShapeId`'s current signature has no primitive-subset parameter, treat "adjust primitive mix" as filtered client-side re-generation or note the gap and file it as a follow-up in this task's notes, since `generateShapeId`'s public signature is fixed by the already-published core package and must not be changed by this task).
- [x] 4.3 Update the live preview (Task 5) and call `updateUrlForShape` (push) with the generated ID.
- [x] 4.4 Write a test verifying that generating twice with the same seed and grid produces the same shape ID both times (mirrors the spec's "Same seed and settings reproduce the same mark" scenario).
- [x] 4.5 Write a test verifying that changing the grid size control changes the generated shape's `cols`/`rows` to match.
- [x] 4.6 (post-merge addition, requested after initial deploy) Add a "Randomize" button next to the seed field: fills it with a freshly generated random seed and immediately generates, so a user isn't required to type a seed to get a mark. Reuses the same `generateFilteredShapeId` path as manual submit — no new generation logic, just an auto-filled seed. Covered by two new tests in `web/test/generator-form.test.ts` (fills a non-empty seed and generates; repeated clicks produce different seeds).

  Note on 4.1: uses the `listPrimitives()` export added to `src/core` (see task 1's note) rather than hardcoding primitive names.

  Note on 4.2: went with "filtered client-side re-generation", the first of the two options this task offered. `generateShapeDef(seed, grid)` is called unmodified (published signature untouched), then a pure post-filter (`applyPrimitiveMix`) deterministically remaps any cell whose primitive type isn't in the checked set to one that is (`allowedTypes[cell.type % allowedTypes.length]`) before `encodeShapeId`. This preserves determinism (same seed+grid+mix always yields the same ID — verified by 4.4's test) and, when every primitive is checked (the form's default), reduces to unmodified `generateShapeId` output. A true "resample within the allowed subset" would require the core package's internal PRNG (`createRandom`/`hashStringToSeed` in `src/core/random.ts`), which isn't exported and is out of this task's scope to expose or to change `generateShapeId`'s signature for.

  Note on 4.3: `generator-form.ts` exposes generation via an `onGenerate(shapeId)` callback, consistent with task 3.2's `onSelect` pattern — the actual `updateUrlForShape` (push) + preview-update wiring happens in `main.ts` (task 7.2).

## 5. Live preview

- [x] 5.1 Create `web/src/preview.ts`: given a shape ID, calls `renderShape` and injects the resulting SVG markup into a designated preview container, replacing any prior content.
- [x] 5.2 On decode/render failure (invalid shape ID), render a visible error message in the preview container instead of throwing or leaving stale content (covers the spec's "Invalid shape ID in URL handled gracefully" scenario).
- [x] 5.3 Write a test verifying the preview container's content changes when a new shape ID is set, and shows the error state for an invalid ID.

  Note: implemented ahead of tasks 3/4 in file order since both reference "Task 5" (the live preview) as a dependency.

## 6. Export

- [x] 6.1 Create `web/src/export-svg.ts`: given the current preview's SVG markup, trigger a browser download of a `.svg` file containing that exact markup.
- [x] 6.2 Create `web/src/export-png.ts`: rasterize the current preview's SVG to PNG via an offscreen `<canvas>` (per design.md's client-side rasterization decision) and trigger a browser download of the resulting `.png`.
- [x] 6.3 Write a test verifying `export-svg.ts`'s downloaded content byte-matches the preview's current SVG markup.
- [ ] 6.4 Manually verify PNG export in at least two browser engines (e.g. Chromium and Firefox, or Chromium and WebKit/Safari) and note the result in this task's completion notes — canvas-based SVG rasterization is the one part of this change not fully verifiable by an automated test in a headless environment.

  Note: 6.1/6.2 share a small `web/src/download.ts` helper (`triggerDownload`) for the common object-URL-and-`<a download>` pattern. `export-svg.ts` writes `svgMarkup` into the Blob byte-for-byte with no re-serialization, so the download is guaranteed to byte-match the preview. Left 6.4 unchecked — this needs your manual sign-off in a real browser per your note at the start of this session; I'll come back to it once the rest of the app is wired up in task 7, since there's no real preview to export from until then.

## 7. App shell and wiring

- [x] 7.1 Create `web/src/main.ts`: on load, read the URL via `shape-state.ts`; if a valid shape ID is present, preview it, else show the catalog view as the default landing state.
- [x] 7.2 Wire the catalog view, generator form, preview, and export buttons together into one page (minimal, functional layout — no framework, direct DOM wiring per design.md).
- [x] 7.3 Add a `popstate` listener so browser back/forward navigation between pushed shape IDs updates the preview accordingly.

  Note: the catalog and generator sections are always visible on the page (not conditionally hidden) — the "else show the catalog view as the default landing state" behavior is that the preview area shows a neutral prompt instead of a shape until one is selected/generated/URL-loaded, while the catalog itself is always rendered (satisfying the spec's "Catalog renders on load" scenario regardless of URL state). Verified the full flow with a headless Playwright run against the built `web/dist` (served via `vite preview`, which respects `base`): catalog renders 14 entries; selecting one updates the URL and preview; generating from a seed updates URL/preview; browser back returns to the prior shape ID; an invalid `?id=` shows the error state with no crash; a valid `?id=` permalink reloads and previews correctly. Zero console errors throughout.

## 8. Styling

- [x] 8.1 Add a minimal stylesheet (`web/src/style.css`) covering layout for the catalog grid, generator form, preview area, and export/share controls — functional and readable, not a design system; responsive enough to be usable on a phone-width viewport per the roadmap's "no developer tools" done-state.

  Note: uses a `grid-template-columns: repeat(auto-fill, minmax(...))` catalog grid and a `@media (max-width: 420px)` breakpoint that stacks the generator form and shrinks catalog tiles, so it reflows at phone width without a framework.

## 9. Deployment

- [x] 9.1 Create `.github/workflows/pages.yml`: triggers on push to `main` with a `paths: ['web/**']` filter; steps: checkout, setup-node, `npm ci` at root, `npm run build` at root (builds `dist/` that `web/` depends on), `npm run build --workspace web`, `actions/upload-pages-artifact` pointing at `web/dist`, `actions/deploy-pages`.
- [x] 9.2 Set the workflow's `permissions` block to `pages: write` and `id-token: write` (required by `actions/deploy-pages`), and the `environment: github-pages` block per that action's documented usage.
- [ ] 9.3 Document the one-time manual prerequisite (repo Settings → Pages → Source: GitHub Actions) in this task's completion notes — this task cannot enable that setting itself, the same category as Phase 2's `NPM_TOKEN` secret.

  **Manual step needed from you:** in the repo's GitHub settings, go to Settings → Pages → Build and deployment → Source, and set it to "GitHub Actions". Until that's set, `pages.yml`'s `deploy` job will fail even though `build` succeeds. This workflow only triggers on push to `main` with changes under `web/**`, so it won't run on this branch/PR — it'll fire once this change merges to `main` and touches `web/`. I've left this checkbox unchecked pending your confirmation that you've flipped the setting (or intend to before merge).

## 10. Verification

- [x] 10.1 Run the full `web/` test suite and confirm all tests pass with pristine output.
- [x] 10.2 Run `npm run build` at the root, then `npm run build --workspace web`, and confirm both succeed with no errors.
- [x] 10.3 Serve `web/dist/` locally (e.g. `npx serve web/dist`) and manually walk through every spec scenario in `specs/web-app/spec.md`: browse catalog, generate by seed, change grid size, export SVG, export PNG, copy/reload a permalink URL, load an invalid shape ID in the URL.
- [x] 10.4 Confirm the root package's `npm pack --dry-run` output is unchanged by this change (i.e. `web/` does not leak into the published `bitshaper` npm tarball).

  Note on 10.1/10.2: `web/`'s 19 Vitest tests all pass; root's 290 tests (290, up from 289 — added `listPrimitives` coverage) all pass; `npm run build` (root) and `npm run build --workspace web` both succeed with no errors; `npm run lint` (biome) passes across both.

  Note on 10.3: walked through every scenario via a headless Playwright script against `web/dist` served with `vite preview` (which honors the `/BitShaper/` base, unlike a plain static server): catalog renders all 14 entries on load with non-empty previews; selecting a catalog entry updates the URL (`?id=...`) and preview; generating from a seed+grid+primitive-mix updates URL/preview and is reproducible for the same inputs; browser back navigates to the prior shape ID; SVG and PNG export buttons each trigger a real download (`bitshaper-mark.svg` / `bitshaper-mark.png`; the downloaded PNG has a valid PNG signature and non-trivial size); an invalid `?id=` shows the visible error state without a crash; a valid `?id=` permalink loads and previews correctly on a fresh page load. Zero console errors in every pass. This automated walkthrough exercised the PNG rasterization path successfully in Chromium; task 6.4's separate manual cross-*engine* (e.g. Firefox/WebKit) check is still pending your sign-off, per your note.

  Note on 10.4: `npm pack --dry-run` includes no `web/` files. It does now include `dist/library/*` (previously only `dist/core/*` and `dist/cli/*`) — expected and intentional from task 1's additive `./library` export, not a `web/` leak.
