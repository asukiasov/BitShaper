## Purpose

Defines a compact, self-describing, human-shareable identifier that encodes the complete geometry of a BitShaper grid shape so it can be decoded deterministically without a lookup table, database, or network call.

## ADDED Requirements

### Requirement: Shape ID format
A shape ID SHALL have the form `BS-{cols}X{rows}-{payload}{checksum}`, where `cols` and `rows` are each an integer from 1 to 8 written in decimal, `payload` is exactly `cols × rows` base62 characters (`0-9`, then `A-Z`, then `a-z`) — one character per cell, row-major (left-to-right, top-to-bottom) — and `checksum` is exactly one trailing base62 character.

#### Scenario: Well-formed ID accepted
- **WHEN** a string matching `BS-{cols}X{rows}-{payload}{checksum}` with `cols`/`rows` in range 1–8 and `payload` exactly `cols × rows` characters long is decoded
- **THEN** decoding proceeds without a format error

#### Scenario: Malformed ID rejected
- **WHEN** a string is decoded that does not match the `BS-{cols}X{rows}-{payload}{checksum}` pattern, has `cols`/`rows` outside 1–8, or has a payload whose length does not equal `cols × rows`
- **THEN** decoding SHALL fail with an error describing the format problem, and SHALL NOT return a partial or best-guess `ShapeDef`

### Requirement: Per-cell flat encoding
Each payload character SHALL encode exactly one cell, independently of every other cell (no cross-cell bit-packing). A cell's character is derived from a flat index `type × 8 + rotation × 2 + invert` (where rotation is coded 0/1/2/3 for 0°/90°/180°/270°), mapped onto the base62 alphabet (index 0–9 → `0`-`9`, 10–35 → `A`-`Z`, 36–61 → `a`-`z`).

#### Scenario: Round-trip preserves geometry
- **WHEN** a `ShapeDef` is encoded to a shape ID and that ID is immediately decoded
- **THEN** the decoded `ShapeDef` SHALL equal the original in grid dimensions, cell count, and every cell's `type`, `rotation`, and `invert` value

#### Scenario: Identical cells always produce identical characters
- **WHEN** two cells (in the same or different shapes) share the same `type`, `rotation`, and `invert`
- **THEN** their encoded payload characters SHALL be identical, regardless of grid position or neighboring cells

### Requirement: Primitive index ceiling
The flat per-cell index (`type × 8 + rotation × 2 + invert`) SHALL stay within the base62 alphabet's 62 symbols, which caps the primitive registry at 8 types (`8 × 4 rotations × 2 invert = 64`, of which indices 0–61 are usable) under the current one-character-per-cell format. Encoding SHALL fail loudly, not silently overflow, if a cell's computed index exceeds 61.

#### Scenario: Index within range encodes normally
- **WHEN** a cell's `type` index is low enough that `type × 8 + rotation × 2 + invert ≤ 61`
- **THEN** encoding SHALL succeed and produce exactly one payload character for that cell

#### Scenario: Registry growth beyond the ceiling rejected clearly
- **WHEN** a `ShapeDef` is encoded whose cell references a primitive type index such that `type × 8 + rotation × 2 + invert > 61`
- **THEN** encoding SHALL fail with an error identifying the primitive-index ceiling, rather than producing a corrupt or ambiguous character

### Requirement: Canonical encoding
Encoding SHALL be canonical: two `ShapeDef` values describing identical geometry (same grid, same cells in the same order) SHALL always produce byte-identical shape IDs.

#### Scenario: Identical geometry yields identical IDs
- **WHEN** the same `ShapeDef` value is encoded twice, or two distinct `ShapeDef` values with equal grid and cells are each encoded
- **THEN** the resulting shape ID strings SHALL be exactly equal, including checksum

### Requirement: Checksum validation
The trailing checksum character SHALL be a mod-62 sum of every payload character's base62 index, re-expressed as a base62 character. Decoding SHALL validate the checksum against the payload before returning a `ShapeDef`.

#### Scenario: Valid checksum decodes successfully
- **WHEN** an ID is decoded whose trailing character matches the mod-62 sum of its payload character indices
- **THEN** decoding SHALL succeed and return the corresponding `ShapeDef`

#### Scenario: Corrupted payload or checksum rejected
- **WHEN** an ID is decoded whose trailing character does not match the mod-62 sum of its payload character indices (e.g. a single mistyped character)
- **THEN** decoding SHALL fail with a checksum error and SHALL NOT return a `ShapeDef`
