# BitShaper Roadmap

Living log of product/technical direction decisions that aren't fully captured by an in-flight change's planning artifacts. Each entry links back to the change that decided it.

## Shape ID Format: Version 1 (flat base62 per-cell)

**Decided in:** `bitshaper-core-package` (see `changes/bitshaper-core-package/specs/shape-id-codec/spec.md` and `design.md` for the normative spec and full rationale).

**Format:** `BS-{cols}X{rows}-{payload}{checksum}`
- `payload`: exactly `cols × rows` characters, one base62 character (`0-9A-Za-z`) per cell, row-major.
- Each character = `type × 8 + rotation × 2 + invert`, mapped onto the base62 alphabet.
- `checksum`: one trailing base62 character, mod-62 sum of the payload's character indices.

**Why this shape, over the alternatives explored:**
- A single bit-packed integer (base36-encoded) was rejected — compact, but opaque: a single changed cell can cascade the whole string, so nothing is visually scannable.
- Dot-separated `types.rotations.inverts` planes (and fixed-width 2-char-per-cell variants) were rejected — more legible in isolation, but 2–3x longer for no decoding benefit once one base62 character can hold a full cell's state.
- Version 1 wins on all three axes we cared about: shortest (payload length = `cols × rows`, always predictable), plain ASCII (typable, URL-safe, no font/Unicode-support risk), and still "hex-code legible" — identical cells always encode to identical characters regardless of position, so repeated structure in a shape is visible by eye in the ID itself.

**Known constraint — the 8-type ceiling:** the flat per-cell index (`type × 8 + rotation × 2 + invert`) must fit in base62's 62 symbols, which caps the primitive registry at 8 types under this format (`8 × 4 rotations × 2 invert = 64`, indices 0–61 usable). This is a deliberate simplification, not an oversight — the original design carried a 4-bit schema-version nibble specifically to allow the bit layout to evolve, and Version 1 drops that in favor of predictable length and per-cell readability.

**Fast-follow when the ceiling is hit:** once the primitive registry needs a 9th type, the format will need to grow. Options noted but not decided: a version-prefix character ahead of the payload, or a widened 2-characters-per-cell fallback for future schema versions. Revisit this when the "extract all primitives from the 72 sample SVGs" follow-up phase (see `bitshaper-core-package` proposal's Impact/Non-Goals) approaches 8 primitive types.

## Shape ID Format: Version 2 (2026-08-25 — the ceiling was hit)

**Decided in:** `bitshaper-id-format-v2` (see `changes/bitshaper-id-format-v2/design.md` for full rationale and rejected alternatives).

The 8-type ceiling above was hit for real once `bitshaper-expand-primitives` needed to register 6 new primitives (`circle`, `wedge`, `cap`, `pinwheel-arc`, `step`, `ogee`) on top of the 4 starters — 10 types, 2 past the ceiling. Both options the fast-follow note above left undecided turned out to be needed together, not as alternatives:

- **Version marker**: `BS-...` (no digit) stays version 1 forever, byte-identical to every ID already issued. `BS2-...` marks version 2.
- **Widened payload**: version 2 uses 2 base62 characters per cell (not 1), raising the per-cell flat-index range from 0–61 to 0–3843 — the primitive-type ceiling rises from 8 to `floor(3843 / 8) = 480` — and a matching 2-character mod-3844 checksum.

`encodeShapeId` always picks the narrowest version a shape actually needs, so canonical encoding stays as short as possible: version 1 whenever every cell's flat index is ≤ 61, version 2 only when at least one cell requires it. No existing shape ID needs re-encoding.
