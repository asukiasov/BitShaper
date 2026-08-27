## ADDED Requirements

### Requirement: Ramp modifier block
A shape ID MAY carry an optional trailing **ramp modifier block**: a `~` character followed by
one or more base62 characters, appended after the checksum
(`BS{version}-{cols}X{rows}-{payload}{checksum}~{rampBlock}`). The base ID (everything before
the `~`) SHALL be byte-identical to the ID the same `ShapeDef` produces without a ramp, and an
ID with no ramp SHALL have no `~` and decode exactly as it does today.

The ramp block encodes a `Ramp` = one `axis`, one `curve`, and 1–4 `tracks`, each track a
`{ param, from, to }` interpolating one of `scale` / `scaleX` / `scaleY` / `angle` between two
endpoints. Grammar (each field one base62 character, index 0–61):

```
~ {axis}{curve}{trackCount}  ({param}{from}{to}) × trackCount  {checksum}
```

- `axis`: 0=column, 1=row, 2=diagonal, 3=radial
- `curve`: 0=linear, 1=easeIn, 2=easeOut, 3=easeInOut, 4=symmetric
- `trackCount`: base62 index 1–4
- `param`: 0=scale, 1=scaleX, 2=scaleY, 3=angle
- `from`, `to`: quantized endpoint index. `scale`/`scaleX`/`scaleY`: `value = index / 31`
  (index 31 = 1.0). `angle`: `degrees = (index − 31) × (90 / 31)` (index 31 = 0°).
- `checksum`: the sum of every preceding ramp-block character's base62 index, modulo 62,
  as one base62 character.

`scale` SHALL be mutually exclusive with `scaleX` and `scaleY` within one ramp, and every
track's `param` SHALL be distinct.

#### Scenario: ID without a ramp is unchanged
- **WHEN** a `ShapeDef` with no `ramp` (or a `ramp` whose tracks are all identity) is encoded
- **THEN** the shape ID SHALL contain no `~` character and SHALL be byte-identical to the ID
  produced before this capability existed

#### Scenario: Ramp block round-trips
- **WHEN** a `ShapeDef` with a `ramp` is encoded and the resulting ID is immediately decoded
- **THEN** the decoded `ShapeDef` SHALL equal the original in grid, cells, and ramp — where
  every ramp endpoint equals the quantization-grid value nearest the original — and
  re-encoding the decoded `ShapeDef` SHALL reproduce the same ID (`encode(decode(id)) === id`)

#### Scenario: Canonical ramp encoding
- **WHEN** two `ShapeDef` values with equal grid, cells, and equivalent ramps — one with tracks
  in a different order, or carrying a track whose `from` and `to` both quantize to the identity
  index — are each encoded
- **THEN** the resulting shape IDs SHALL be byte-identical: tracks are emitted sorted ascending
  by `param` index, identity-only tracks are dropped, and a ramp with no surviving tracks emits
  no `~` block

#### Scenario: Malformed ramp block rejected
- **WHEN** an ID whose `~` block has a length other than `3 + 3 × trackCount + 1`, a
  `trackCount` outside 1–4, a field index out of range, a duplicate `param`, `scale` alongside
  `scaleX`/`scaleY`, or a checksum that does not match is decoded
- **THEN** decoding SHALL fail with a `bad-ramp-block` error and SHALL NOT return a `ShapeDef`

#### Scenario: Encoding rejects a contradictory ramp
- **WHEN** `encodeShapeId` is called with a `ShapeDef` whose `ramp` has two tracks for the same
  `param`, or a `scale` track together with a `scaleX` or `scaleY` track
- **THEN** encoding SHALL fail with an `invalid-shape-def` error rather than emitting an
  ambiguous ID
