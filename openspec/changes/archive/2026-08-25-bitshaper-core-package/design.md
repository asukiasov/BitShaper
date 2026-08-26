## Context

See proposal.md - Why. This is a greenfield npm package; there is no existing code to integrate with, only `samples/svgs/` (72 reference SVGs) and `samples/screens/` used as visual/geometric reference while building primitives. The user-supplied design below is treated as the accepted approach, not a proposal to re-litigate — this document records the resulting technical decisions and their rationale.

## Goals / Non-Goals

**Goals:**
- Ship a working `bitshaper` package: ID codec, primitive registry with 4 starter primitives, render/generate API, and CLI.
- Keep the ID format decodable offline, forever, with no lookup table.
- Make the primitive registry append-only so future primitive additions never invalidate previously issued IDs.

**Non-Goals:**
- Extracting all primitives needed to reproduce all 72 sample SVGs — that is explicitly deferred to a follow-up change (proposal's "next phase").
- Publishing to npm or setting up CI/release tooling.
- A GUI/web viewer — CLI only in this change.
- Supporting grids larger than 8×8 (the ID format's `cols`/`rows` digits cap at 8).
- Growing the primitive registry past 8 types without a format change — the base62 per-cell alphabet has no room left; a future schema revision (e.g. a version-prefix character, or a widened 2-char-per-cell fallback) would be needed, deliberately deferred.

## Decisions

### ID layout: flat base62 index per cell
Each cell is encoded independently as one base62 character via `index = type × 8 + rotation × 2 + invert` → alphabet lookup (`0-9A-Za-z`). No BigInt, no bitstream, no schema-version nibble — payload length is always exactly `cols × rows`, and decoding is a straight per-character lookup. This trades headroom (see the primitive-index ceiling in the shape-id-codec spec) for simplicity and length-predictability, and — critically — for readability: identical cells always render as identical characters regardless of position, so repeated structure in a shape is visible directly in the ID string.

Alternatives considered and rejected: (1) the original whole-bitstream-as-one-BigInt-then-base36 approach — compact but each character's value depends on every other cell, so nothing is visually scannable and a single changed cell can cascade the whole string; (2) fixed-width 2-char-per-cell base36 — avoids the ceiling below but produces ambiguous runs of leading zeros in typical sparse shapes; (3) dot-separated `types.rotations.inverts` planes — legible but ~2–3x longer for no decoding benefit once a flat per-cell alphabet is large enough to hold a full cell's state in one character.

### Checksum: mod-62 sum over payload character indices
Sum of each payload character's base62 alphabet index, mod 62, re-expressed as one base62 character. Same rationale as before (typo/corruption detection, not cryptographic integrity) — just re-based to match the base62 payload alphabet instead of base36.

### Rotation/inversion: transform the geometry, not SVG `transform=`
Per the starter-primitive requirement, each primitive's path-builder receives `(cellSize, rotation, invert)` and computes transformed corner coordinates directly, emitting one path per cell that's concatenated into a single `<path d="...">` — matching the samples' single-path style and avoiding nested `<g transform>` wrappers that the samples don't use. Invert (horizontal mirror) is applied before rotation, both order-independent per-cell (no cross-cell state).

### Registry: array-index-is-ID-bit-value, append-only
`src/core/registry.ts` holds an ordered array of primitive definitions; a primitive's index in that array is its 4-bit type value in the ID format. New primitives are always pushed to the end. This is enforced by convention + a test that pins existing primitives' indices (e.g. `empty=0, fill=1, fillet=2, bulge=3`) — CI-style protection against accidental reordering, not a runtime check (there's no way to detect reordering at runtime since the registry has no memory of past states).

### Seeded generation: mulberry32
Small, dependency-free, fast PRNG with good-enough distribution for shape variety; deterministic from a numeric seed. String seeds are hashed to a 32-bit integer (e.g. via a simple string hash) before seeding mulberry32, so `generateShapeDef("foo", ...)` is reproducible across platforms/Node versions without needing crypto-grade hashing.

### Package structure and build
Single npm package, `tsup` for dual ESM+CJS output (keeps consumers flexible — Node CLI usage and potential future bundler/browser usage), `vitest` for tests mirroring `src/` under `test/`, `commander` for CLI argument parsing (well-established, minimal boilerplate for subcommands).

## Risks / Trade-offs

- [Only 4 starter primitives reproduce a subset of the 72 samples] → Explicitly scoped as phase 1 in the proposal; catalog.json only curates shapes buildable from the starter set, so `bitshaper list` never references an unrenderable ID.
- [Primitive registry is capped at 8 types before the ID format itself must change] → Documented explicitly (see Non-Goals and the shape-id-codec spec's primitive-index ceiling requirement); encoding fails loudly rather than silently overflowing. Revisit if/when the starter set's follow-up phase needs a 9th+ primitive.
- [Mod-62 checksum only catches single-character corruption with modest probability, not all corruption] → Acceptable per proposal ("catches typos/corruption, not cryptographic"); documented, not silently overstated.
- [Registry index reordering would silently break all previously issued IDs] → Mitigated by a pinned-index test (see Decisions) and an explicit code comment at the registry's registration call sites warning against reordering.

## Open Questions

- Exact string-to-seed hashing algorithm for `generateShapeDef`/`generateShapeId` when given a string seed — left to implementation as long as it's deterministic; does not affect specs or task breakdown.
