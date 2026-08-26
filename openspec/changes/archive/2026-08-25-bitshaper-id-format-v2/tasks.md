## 1. Codec: version-aware format

- [x] 1.1 Update `SHAPE_ID_PATTERN` to accept an optional `2` version marker right after `BS` (`^BS(2)?-([1-9]\d*)X([1-9]\d*)-([0-9A-Za-z]+)$`), capturing the version marker separately
- [x] 1.2 Add `MAX_CELL_INDEX_V2 = 3843` alongside the existing `MAX_CELL_INDEX = 61` (version 1)
- [x] 1.3 Implement `indexToBase62Digits(index, width)` / `base62DigitsToIndex(digits)` helpers generalizing the existing single-character `indexToBase62Char`/`base62CharToIndex` to 1-char (v1) and 2-char (v2) widths
- [x] 1.4 Implement version-2 checksum: mod-3844 sum of every cell's flat index, encoded as 2 base62 digits

## 2. Encoding

- [x] 2.1 In `encodeShapeId`, compute every cell's flat index first; choose version 1 if all indices ≤ 61, otherwise version 2 if all indices ≤ 3843, otherwise throw `primitive-ceiling-overflow`
- [x] 2.2 Emit `BS-{cols}X{rows}-{payload}{checksum}` for version 1 (unchanged output) and `BS2-{cols}X{rows}-{payload}{checksum}` for version 2 (2 chars/cell payload, 2-char checksum)
- [x] 2.3 Update the `primitive-ceiling-overflow` error message to name the offending index and both ceilings (61 for v1, 3843 for v2)

## 3. Decoding

- [x] 3.1 In `decodeShapeId`, branch on the captured version marker to pick payload/checksum width (1 vs 2 chars/cell) before validating payload length
- [x] 3.2 Validate the version marker itself: anything other than empty or `2` is `bad-format`
- [x] 3.3 Validate payload length against the version-specific expected width (`cols * rows` for v1, `2 * cols * rows` for v2)
- [x] 3.4 Validate checksum using the version-specific modular sum before returning a `ShapeDef`

## 4. Tests

- [x] 4.1 Add version-1 regression tests: every existing `test/core/id.test.ts` case still passes unmodified (no behavior change for v1)
- [x] 4.2 Add version-2 round-trip tests: shapes with cell flat indices in 62–3843 encode as `BS2-...` and round-trip correctly
- [x] 4.3 Add a canonical-encoding test: a shape whose every cell index is ≤ 61 always encodes as version 1, never version 2
- [x] 4.4 Add a ceiling test: a cell flat index > 3843 throws `primitive-ceiling-overflow` for both versions
- [x] 4.5 Add version-2 checksum tests: valid checksum decodes, corrupted checksum rejected with `checksum-mismatch`
- [x] 4.6 Add malformed-version tests: an unrecognized version marker (e.g. `BS9-...`) is rejected with `bad-format`
- [x] 4.7 Add a mixed round-trip test across grid sizes 1×1–8×8 using version-2-range cell indices (mirroring the existing v1 round-trip test loop)

## 5. Docs

- [x] 5.1 Add a dated entry to `openspec/roadmap.md` under the existing "Fast-follow when the ceiling is hit" note, recording the version-marker + 2-chars-per-cell decision and linking to this change

## 6. Verification

- [x] 6.1 Run `vitest run` and confirm all shape-id-codec tests (v1 and v2) pass
- [x] 6.2 Run `tsup` build and confirm it still succeeds with no type errors
