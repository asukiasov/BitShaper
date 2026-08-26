## MODIFIED Requirements

### Requirement: Shape ID format
A shape ID SHALL have the form `BS{version}-{cols}X{rows}-{payload}{checksum}`, where `{version}` is either empty (version 1) or the literal digit `2` (version 2), `cols` and `rows` are each an integer from 1 to 8 written in decimal, and `payload`/`checksum` widths depend on version:
- **Version 1** (`BS-...`): `payload` is exactly `cols × rows` base62 characters (`0-9`, then `A-Z`, then `a-z`) — one character per cell, row-major (left-to-right, top-to-bottom) — and `checksum` is exactly one trailing base62 character. This is byte-for-byte the original format; every version-1 ID ever issued SHALL continue to decode exactly as before.
- **Version 2** (`BS2-...`): `payload` is exactly `2 × cols × rows` base62 characters — two characters per cell, row-major — and `checksum` is exactly two trailing base62 characters.

#### Scenario: Well-formed ID accepted
- **WHEN** a string matching `BS{version}-{cols}X{rows}-{payload}{checksum}` with `cols`/`rows` in range 1–8, `{version}` either empty or `2`, and `payload` exactly the width required for that version and cell count is decoded
- **THEN** decoding proceeds without a format error

#### Scenario: Malformed ID rejected
- **WHEN** a string is decoded that does not match the `BS{version}-{cols}X{rows}-{payload}{checksum}` pattern, has `cols`/`rows` outside 1–8, has an unrecognized `{version}` marker (anything other than empty or `2`), or has a payload whose length does not equal the width required for its version and cell count
- **THEN** decoding SHALL fail with an error describing the format problem, and SHALL NOT return a partial or best-guess `ShapeDef`

#### Scenario: Version 1 IDs decode unchanged
- **WHEN** an ID issued under the original one-character-per-cell format (no version marker) is decoded
- **THEN** it SHALL decode to the same `ShapeDef` it always did, with no behavior change from before version 2 existed

### Requirement: Per-cell flat encoding
Each cell SHALL be encoded independently of every other cell (no cross-cell bit-packing) from a flat index `type × 8 + rotation × 2 + invert` (where rotation is coded 0/1/2/3 for 0°/90°/180°/270°). The number of base62 characters used to represent that index depends on the ID's version:
- **Version 1**: one base62 character (index 0–9 → `0`-`9`, 10–35 → `A`-`Z`, 36–61 → `a`-`z`), representing indices 0–61.
- **Version 2**: two base62 characters, big-endian (first character = `flatIndex div 62`, second = `flatIndex mod 62`, each digit mapped through the same base62 alphabet), representing indices 0–3843.

#### Scenario: Round-trip preserves geometry
- **WHEN** a `ShapeDef` is encoded to a shape ID (either version) and that ID is immediately decoded
- **THEN** the decoded `ShapeDef` SHALL equal the original in grid dimensions, cell count, and every cell's `type`, `rotation`, and `invert` value

#### Scenario: Identical cells always produce identical characters
- **WHEN** two cells (in the same or different shapes, same ID version) share the same `type`, `rotation`, and `invert`
- **THEN** their encoded payload characters (one for version 1, two for version 2) SHALL be identical, regardless of grid position or neighboring cells

### Requirement: Primitive index ceiling
The flat per-cell index (`type × 8 + rotation × 2 + invert`) SHALL stay within the range representable by the ID's version:
- **Version 1**: base62's 62 symbols, capping the primitive registry at 8 types (`8 × 4 rotations × 2 invert = 64`, of which indices 0–61 are usable) under the one-character-per-cell format.
- **Version 2**: two base62 digits (0–3843), capping the primitive registry at `floor(3843 / 8) = 480` types under the two-characters-per-cell format.

Encoding SHALL fail loudly, not silently overflow, if a cell's computed index exceeds the maximum representable by the version being used.

#### Scenario: Index within range encodes normally
- **WHEN** a cell's `type` index is low enough that `type × 8 + rotation × 2 + invert ≤ 61`
- **THEN** encoding SHALL succeed and produce exactly one payload character for that cell

#### Scenario: Registry growth beyond the ceiling rejected clearly
- **WHEN** a `ShapeDef` is encoded whose cell references a primitive type index such that `type × 8 + rotation × 2 + invert > 3843` (the version-2 ceiling, the highest representable under any current version)
- **THEN** encoding SHALL fail with an error identifying the primitive-index ceiling, rather than producing a corrupt or ambiguous character

#### Scenario: Index beyond version-1 range but within version-2 range encodes as version 2
- **WHEN** `encodeShapeId` is called for a `ShapeDef` where at least one cell's flat index exceeds 61 but no cell's flat index exceeds 3843
- **THEN** encoding SHALL succeed by producing a version-2 ID (`BS2-...`), using two payload characters for every cell in the shape (not only the cell(s) that needed the wider range)

### Requirement: Canonical encoding
Encoding SHALL be canonical: two `ShapeDef` values describing identical geometry (same grid, same cells in the same order) SHALL always produce byte-identical shape IDs. `encodeShapeId` SHALL always choose the narrowest version that can represent the shape — version 1 whenever every cell's flat index is ≤ 61, version 2 only when at least one cell requires it — so a shape's canonical ID never varies based on how it happens to be constructed.

#### Scenario: Identical geometry yields identical IDs
- **WHEN** the same `ShapeDef` value is encoded twice, or two distinct `ShapeDef` values with equal grid and cells are each encoded
- **THEN** the resulting shape ID strings SHALL be exactly equal, including checksum and version marker

#### Scenario: Version is never wider than necessary
- **WHEN** a `ShapeDef` is encoded whose every cell's flat index is ≤ 61
- **THEN** `encodeShapeId` SHALL produce a version-1 ID, never a version-2 ID, even if the caller could in principle request version 2

### Requirement: Checksum validation
The trailing checksum SHALL be a sum of every cell's flat index, taken modulo the version's index space and re-expressed as base62 digit(s) using the same width as that version's per-cell encoding. Decoding SHALL validate the checksum against the payload before returning a `ShapeDef`.
- **Version 1**: checksum is one base62 character, a mod-62 sum of every payload character's base62 index.
- **Version 2**: checksum is two base62 characters, a mod-3844 sum of every cell's flat index (summing whole per-cell indices, not individual half-characters), encoded the same big-endian way a cell's index is.

#### Scenario: Valid checksum decodes successfully
- **WHEN** an ID is decoded whose trailing checksum matches the modular sum defined for its version
- **THEN** decoding SHALL succeed and return the corresponding `ShapeDef`

#### Scenario: Corrupted payload or checksum rejected
- **WHEN** an ID is decoded whose trailing checksum does not match the modular sum defined for its version (e.g. a single mistyped character)
- **THEN** decoding SHALL fail with a checksum error and SHALL NOT return a `ShapeDef`
