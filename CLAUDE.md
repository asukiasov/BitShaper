# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

BitShaper is pre-code: there is no `package.json`, `src/`, or `test/` yet. What exists today is the OpenSpec planning for the first change (`bitshaper-core-package`) and 72 reference SVGs in `samples/svgs/` used as geometric reference while building primitives. Do not assume any build/lint/test commands exist — check `package.json` once it's created by that change before running anything.

## What BitShaper is

A compact, self-describing ID scheme for procedurally composed grid shapes (geometric marks/logo icons), plus a library, CLI, and eventually a web app to generate and render them from that ID. The ID decodes offline, with no lookup table: `BS-{cols}X{rows}-{payload}{checksum}`, one base62 character per grid cell (row-major), each character a flat index of that cell's `type × rotation × invert` combination, plus a trailing mod-62 checksum character.

Project direction (who it's for, phase sequencing) lives in `docs/superpowers/specs/2026-08-24-bitshaper-roadmap-design.md`. Short version: finish the core package as scoped → publish to npm with docs → grow the primitive registry → build a web app on top → seamless pattern tiling is a deliberately separate, deferred exploration (not in scope yet).

## Working with this repo: OpenSpec

This project uses spec-driven development via OpenSpec (`openspec/config.yaml`, schema `spec-driven`). Do not write implementation code without an OpenSpec change backing it.

- `openspec/specs/` — accepted, current specs for capabilities that have shipped.
- `openspec/changes/<change-id>/` — an in-flight or archived change: `proposal.md` (why/what), `design.md` (technical decisions and rejected alternatives), `tasks.md` (checklist), `specs/<capability>/spec.md` (delta spec for that change).
- `openspec/roadmap.md` — living log of product/technical decisions not fully captured by any single change's own artifacts (e.g. the shape ID format's rationale, and the "8-type primitive ceiling" constraint on the encoding). Check this before making decisions that touch the ID format or primitive registry.
- Slash commands under `.claude/commands/opsx/` (`propose`, `explore`, `apply`, `update`, `sync`, `archive`) and matching skills under `.claude/skills/openspec-*` drive the workflow: propose a change → implement against its tasks.md → sync/archive when done.

The active change is `bitshaper-core-package` (`openspec/changes/bitshaper-core-package/`). Read its `proposal.md`, `design.md`, and `tasks.md` before touching anything under a future `src/` — they are the accepted design, not open for re-litigation, and `tasks.md` is the actual work checklist.

## Code standards and architecture reference

`docs/code-standards.md` (coding conventions: naming, exports, errors, testing, formatting) and `docs/architecture.md` (directory structure and dependency direction) are living references for implementers. Keep them in sync with the code as it evolves.

## Architecture (as designed by `bitshaper-core-package`)

The package is `bitshaper`, dual ESM+CJS via `tsup`, tested with `vitest` (tests mirror `src/` under `test/`), CLI built with `commander`.

- **`src/core/types.ts`** — `Rotation`, `CellDef`, `ShapeDef`: the data model a shape is built from.
- **`src/core/id.ts`** — the codec: `encodeShapeId`/`decodeShapeId`. Per-cell flat index = `type × 8 + rotation × 2 + invert`, looked up against the base62 alphabet (`0-9A-Za-z`). This flat-index formula is why the primitive registry is capped at 8 types (`8 × 4 rotations × 2 invert = 64`, indices 0–61 usable in base62) — adding a 9th primitive type requires a format revision (version-prefix character or 2-chars-per-cell), deliberately deferred until it's actually needed.
- **`src/core/registry.ts`** — an ordered, **append-only** array of primitive definitions. A primitive's array index *is* its type value baked into every ID ever issued for that primitive — reordering silently breaks previously issued IDs. New primitives are always pushed to the end; a pinned-index test guards this (e.g. `empty=0, fill=1, fillet=2, bulge=3`).
- **`src/core/primitives/`** — one pure function per primitive (`empty`, `fill`, `fillet`, `bulge` to start), each taking `(cellSize, rotation, invert)` and returning path-segment commands for a unit cell. Rotation/inversion transform the corner coordinates directly (invert applied before rotation) — primitives never emit SVG `transform=`, matching the samples' single-`<path>` style.
- **`src/core/random.ts`** — mulberry32 PRNG plus deterministic string-seed hashing, backing `generateShapeDef`/`generateShapeId`.
- **`src/core/render.ts`** — `renderShape(shapeId, opts?)`: decodes, concatenates per-cell path data into one `<path>`, wraps in `<svg>` (default 256×256).
- **`src/library/`** — `catalog.json` (curated `[{id, name, tags}]`) + accessors; only curates shapes buildable from the *current* primitive set, so `bitshaper list` never references an unrenderable ID.
- **`src/cli/`** — `bitshaper` bin with `render`, `generate`, `list` subcommands, wired via commander.

Public API surface: `encodeShapeId`, `decodeShapeId`, `renderShape`, `generateShapeDef`, `generateShapeId`.

`samples/` (reference SVGs and inspiration screenshots) is read during development but is not part of the published package — keep it out of `package.json`'s `files` allowlist when that file exists.
