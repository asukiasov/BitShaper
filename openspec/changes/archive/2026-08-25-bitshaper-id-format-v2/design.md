## Context

`openspec/roadmap.md` already anticipated this moment and recorded two candidate fixes without
picking one: "a version-prefix character ahead of the payload, or a widened 2-characters-per-cell
fallback." Both are needed simultaneously: a version marker alone doesn't add capacity, and a
wider payload alone is ambiguous to detect from length (a version-1 4-cell ID and a
hypothetical-wider 2-cell ID could both be, say, 4 payload characters).

## Decision: version marker + 2-chars-per-cell, combined

`BS-{cols}X{rows}-{payload}{checksum}` (version 1, unchanged forever) vs.
`BS2-{cols}X{rows}-{payload}{checksum}` (version 2, 2 chars/cell, 2-char checksum).

- The version marker is a single digit immediately after `BS`, empty for version 1. This keeps
  version 1 IDs byte-identical to today — no re-encoding, no migration, no regression risk for
  anything already issued.
- Version 2 doubles per-cell width (62² = 3844 values) instead of switching alphabets or adding
  a bit-packed scheme, because it reuses every existing per-cell primitive (`flatIndex div 62`,
  `flatIndex mod 62`, both indexed through the same base62 alphabet already in `id.ts`) — the
  simplest change that actually needed writing new code for, versus alternatives below.
- Checksum widens to match (2 chars, mod 3844) rather than staying a single mod-62 char, so it
  keeps the same "sum of per-cell indices" design and error-detection strength relative to the
  wider payload; a 1-char checksum over a 2-char-per-cell payload would be weaker per byte of ID.

## Alternatives considered

- **Base94 alphabet (full printable ASCII) instead of base62, still 1 char/cell**: would raise
  the ceiling to `floor(93/8) = 11` types — barely more headroom than needed today, and burns
  the "typable, URL-safe, no escaping" property the original ID design explicitly optimized for
  (some printable ASCII needs escaping in URLs/shells). Rejected — trades a hard-won property
  for a small, soon-to-be-exhausted-again ceiling raise.
- **Always emit version 2, drop version 1 entirely**: simpler code (one path, no version
  branching) but doubles the length of every ID for shapes that never come close to needing the
  extra range — most curated catalog entries and most seeded generations. Rejected — canonical
  encoding should stay as compact as the shape actually requires; "shortest representation for
  the given geometry" is one of the three axes the original ID design was scored on
  (`openspec/roadmap.md`).
- **Bit-packed variable-length encoding (e.g. varint-style continuation bits)**: maximum
  compactness, but reintroduces exactly the "single changed cell cascades the whole string"
  opacity problem version 1 was designed to avoid — a version-2 payload should stay one
  fixed-width unit per cell, just a wider one. Rejected on the same grounds the original design
  rejected bit-packing.

## Non-goals

- Retroactively re-encoding any already-issued ID. Version 1 stays valid indefinitely.
- Deciding the *next* ceiling past 480 types. 480 is generous enough (60x the current need) that
  a third format revision is not a near-term concern; this design doesn't try to future-proof
  beyond that.
- Anything about which primitives actually get registered next (that's
  `bitshaper-expand-primitives`, which depends on this change but is scoped separately).

## Rollout / sequencing

This change lands and is archived first. `bitshaper-expand-primitives` (registering `circle`,
`wedge`, `cap`, `pinwheel-arc`, `step`, `ogee` at indices 4–9) depends on the ceiling raise
implemented here and should not be applied until this change is merged, since `wedge` at
`type=5` already exceeds the version-1 ceiling on its own for cells using `invert`/high
`rotation` combinations (`5 × 8 + 3 × 2 + 1 = 47` is fine, but `9 × 8 + 3 × 2 + 1 = 79` for
`ogee` at type 9 is not) — several of the six new primitives need version 2 to be encodable at
all rotation/invert combinations.
