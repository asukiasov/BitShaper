## Why

The registry's 8-type ceiling (`type × 8 + rotation × 2 + invert` must fit one base62 character,
0–61) is now actually being hit: `bitshaper-expand-primitives` fills indices 4–7 with `circle`,
`wedge`, `cap`, `pinwheel-arc`, and two more surveyed candidates (`step`, `ogee`, from
`docs/primitive-survey-screens2.md`) are wanted too — 10 types total, 2 past the ceiling.
`openspec/roadmap.md` anticipated this exact moment and pre-recorded two candidate fixes
("a version-prefix character ahead of the payload, or a widened 2-characters-per-cell
fallback"); this change picks one and implements it now, unblocking every primitive on deck.

## What Changes

- **BREAKING (new opt-in format, old format unaffected)**: introduce shape ID format version 2,
  combining both options the roadmap flagged:
  - A version marker right after the `BS` prefix: `BS-...` (no digit) stays version 1, exactly
    as today; `BS2-...` marks version 2.
  - Version 2's payload uses **2 base62 characters per cell** instead of 1 (big-endian: first
    character = `flatIndex div 62`, second = `flatIndex mod 62`), raising the per-cell flat
    index range from 0–61 to 0–3843 — i.e. the primitive-type ceiling rises from 8 to
    `floor(3843 / 8) = 480` types, without changing the `type × 8 + rotation × 2 + invert`
    formula itself.
  - Version 2's checksum is 2 trailing base62 characters: a mod-3844 sum of every cell's flat
    index (not of individual half-characters), re-expressed as 2 base62 digits the same way a
    cell's index is.
- `encodeShapeId`/`decodeShapeId` gain version-aware parsing: version 1 IDs continue to decode
  byte-for-byte as before (no regression, no re-encoding of existing IDs); version 2 is used
  automatically by `encodeShapeId` only when a shape's cells actually need it (any cell's flat
  index > 61), otherwise version 1 is still emitted — canonical encoding stays as compact as
  possible for shapes that don't need the extra range.
- `docs/roadmap.md` gets a new dated entry closing out the "Fast-follow when the ceiling is hit"
  note with the decision actually made.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `shape-id-codec`: format, per-cell encoding, ceiling, checksum, and canonical-encoding
  requirements all gain version-2 behavior alongside the unchanged version-1 behavior.

## Impact

- `src/core/id.ts` (version-aware encode/decode, both format widths)
- `test/core/id.test.ts` (or wherever shape-id-codec tests live): version-2 round-trip,
  version-1 regression (unchanged), mixed-ceiling scenarios, checksum validation for both
  widths
- No change to `src/core/registry.ts`, `src/core/primitives/`, `src/core/render.ts`, or the
  public API surface — this change is purely about the ID codec's capacity
- `docs/roadmap.md` updated
- Unblocks `bitshaper-expand-primitives`, which will register 6 new primitives (indices 4–9)
  once this lands
