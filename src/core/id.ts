import { RampError, decodeRampBlock, encodeRampBlock } from "./ramp.js";
import type { CellDef, Rotation, ShapeDef } from "./types.js";

/** Base62 alphabet: index 0-9 -> "0"-"9", 10-35 -> "A"-"Z", 36-61 -> "a"-"z". */
const BASE62_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Highest flat per-cell index representable by one base62 character (format version 1). */
const MAX_CELL_INDEX_V1 = 61;

/** Highest flat per-cell index representable by two base62 characters (format version 2). */
const MAX_CELL_INDEX_V2 = 3843;

/** Base of the base62 alphabet, used to combine/split 2-digit (version 2) indices. */
const BASE62_RADIX = 62;

/**
 * Pattern for a well-formed shape ID: `BS{version}-{cols}X{rows}-{payload}{checksum}`,
 * where `{version}` is empty (version 1) or `2` (version 2). The `cols`/`rows`
 * groups use `[1-9]\d*` rather than `\d+` so that a non-canonical dimension
 * string with a leading zero (e.g. `01`) is rejected as malformed rather than
 * accepted as an alternate spelling of `1` — this preserves the
 * `encode(decode(id)) === id` round-trip guarantee.
 *
 * The optional trailing `(~[0-9A-Za-z]+)` group is the ramp-modifier block
 * (see `src/core/ramp.ts`). `~` is not a base62 character, so the greedy
 * payload group always stops at it and the split is unambiguous.
 */
const SHAPE_ID_PATTERN = /^BS(2)?-([1-9]\d*)X([1-9]\d*)-([0-9A-Za-z]+)(~[0-9A-Za-z]+)?$/;

/**
 * Error raised by {@link encodeShapeId} and {@link decodeShapeId} for every
 * distinguishable failure mode in the shape ID codec. Check `code` to
 * handle a specific failure programmatically.
 */
export class ShapeIdError extends Error {
  constructor(
    public readonly code:
      | "bad-format"
      | "payload-length-mismatch"
      | "checksum-mismatch"
      | "primitive-ceiling-overflow"
      | "invalid-shape-def"
      | "bad-ramp-block",
    message: string,
  ) {
    super(message);
    this.name = "ShapeIdError";
  }
}

/** Maps a rotation in degrees to its 0-3 code (`rotation / 90`). */
function rotationToCode(rotation: Rotation): number {
  return rotation / 90;
}

/** Maps a 0-3 rotation code back to degrees. */
function codeToRotation(code: number): Rotation {
  return (code * 90) as Rotation;
}

/** Computes a cell's flat index: `type * 8 + rotation * 2 + invert`. */
function cellToFlatIndex(cell: CellDef): number {
  return cell.type * 8 + rotationToCode(cell.rotation) * 2 + (cell.invert ? 1 : 0);
}

/** Decomposes a flat index back into its `type`, `rotation`, and `invert` parts. */
function flatIndexToCell(index: number): CellDef {
  const invert = (index & 1) === 1;
  const rotationCode = (index >> 1) & 0b11;
  const type = index >> 3;
  return { type, rotation: codeToRotation(rotationCode), invert };
}

/** Encodes a single base62 index (0-61) as its alphabet character. */
function indexToBase62Char(index: number): string {
  const char = BASE62_ALPHABET[index];
  if (char === undefined) {
    throw new ShapeIdError(
      "primitive-ceiling-overflow",
      `Base62 index ${index} is out of range (must be 0-61).`,
    );
  }
  return char;
}

/** Decodes a single base62 character to its alphabet index (0-61), or -1 if invalid. */
function base62CharToIndex(char: string): number {
  return BASE62_ALPHABET.indexOf(char);
}

/**
 * Encodes an index as `width` base62 digits, big-endian (most significant
 * digit first). `width` is 1 for format version 1 (index 0-61) or 2 for
 * version 2 (index 0-3843).
 */
function indexToBase62Digits(index: number, width: 1 | 2): string {
  if (width === 1) {
    return indexToBase62Char(index);
  }
  const high = Math.floor(index / BASE62_RADIX);
  const low = index % BASE62_RADIX;
  return indexToBase62Char(high) + indexToBase62Char(low);
}

/**
 * Decodes `width` base62 digits (big-endian) back into an index, or -1 if
 * any digit is invalid.
 */
function base62DigitsToIndex(digits: string, width: 1 | 2): number {
  if (width === 1) {
    return base62CharToIndex(digits);
  }
  const high = base62CharToIndex(digits[0] as string);
  const low = base62CharToIndex(digits[1] as string);
  if (high === -1 || low === -1) {
    return -1;
  }
  return high * BASE62_RADIX + low;
}

/**
 * Computes the checksum digits over a payload's per-cell flat indices, for
 * the given format version. Version 1: one base62 character, mod-62 sum of
 * each payload character's index. Version 2: two base62 characters, mod-3844
 * sum of each cell's full flat index (not of individual half-characters).
 */
function computeChecksumDigits(payload: string, width: 1 | 2): string {
  const modulus = BASE62_RADIX ** width;
  let sum = 0;
  for (let i = 0; i < payload.length; i += width) {
    sum += base62DigitsToIndex(payload.slice(i, i + width), width);
  }
  return indexToBase62Digits(sum % modulus, width);
}

/**
 * Encodes a {@link ShapeDef} into its shape ID string
 * (`BS{2}-{cols}X{rows}-{payload}{checksum}`, `{2}` present only when the
 * shape needs format version 2's wider per-cell range). Encoding is
 * canonical: two
 * `ShapeDef` values describing identical geometry always produce the same
 * ID, including checksum.
 *
 * @throws {ShapeIdError} with code `invalid-shape-def` if `shape.cols` or
 * `shape.rows` is not an integer in range 1-8, or if `shape.cells.length`
 * does not equal `cols * rows`.
 * @throws {ShapeIdError} with code `primitive-ceiling-overflow` if any
 * cell's flat index (`type * 8 + rotation * 2 + invert`) exceeds 3843 — the
 * ceiling imposed by two base62 characters per cell (format version 2), the
 * widest format currently defined. Encoding automatically chooses the
 * narrowest format that can represent the shape: version 1 (one character
 * per cell) whenever every cell's flat index is ≤ 61, version 2 (two
 * characters per cell) otherwise.
 */
export function encodeShapeId(shape: ShapeDef): string {
  if (
    !Number.isInteger(shape.cols) ||
    shape.cols < 1 ||
    shape.cols > 8 ||
    !Number.isInteger(shape.rows) ||
    shape.rows < 1 ||
    shape.rows > 8
  ) {
    throw new ShapeIdError(
      "invalid-shape-def",
      `Grid dimensions ${shape.cols}x${shape.rows} are out of range; cols and rows must each be integers in 1-8.`,
    );
  }

  const expectedLength = shape.cols * shape.rows;
  if (shape.cells.length !== expectedLength) {
    throw new ShapeIdError(
      "invalid-shape-def",
      `Cells length ${shape.cells.length} does not equal cols * rows (${expectedLength}) for a ${shape.cols}x${shape.rows} grid.`,
    );
  }

  const flatIndices = shape.cells.map(cellToFlatIndex);
  const maxIndex = Math.max(0, ...flatIndices);
  if (maxIndex > MAX_CELL_INDEX_V2) {
    const offendingCell = shape.cells[flatIndices.indexOf(maxIndex)] as CellDef;
    throw new ShapeIdError(
      "primitive-ceiling-overflow",
      `Cell flat index ${maxIndex} (type=${offendingCell.type}, rotation=${offendingCell.rotation}, invert=${offendingCell.invert}) exceeds the primitive-index ceiling of ${MAX_CELL_INDEX_V2} (format version 2, the widest format currently defined).`,
    );
  }

  const width: 1 | 2 = maxIndex > MAX_CELL_INDEX_V1 ? 2 : 1;
  const versionMarker = width === 2 ? "2" : "";
  const payload = flatIndices.map((flatIndex) => indexToBase62Digits(flatIndex, width)).join("");
  const checksum = computeChecksumDigits(payload, width);
  const baseId = `BS${versionMarker}-${shape.cols}X${shape.rows}-${payload}${checksum}`;

  if (shape.ramp === undefined) {
    return baseId;
  }
  let rampBlock: string;
  try {
    rampBlock = encodeRampBlock(shape.ramp);
  } catch (error) {
    if (error instanceof RampError) {
      throw new ShapeIdError("invalid-shape-def", `Invalid ramp modifier: ${error.message}`);
    }
    throw error;
  }
  // An all-identity ramp encodes to nothing; the canonical ID has no `~` block.
  return rampBlock === "" ? baseId : `${baseId}~${rampBlock}`;
}

/**
 * Decodes a shape ID string into its {@link ShapeDef}. Validates the ID's
 * format, grid dimensions, payload length, and checksum before returning
 * anything — a partial or best-guess `ShapeDef` is never returned.
 *
 * @throws {ShapeIdError} with code `bad-format` if the string does not
 * match `BS{version}-{cols}X{rows}-{payload}{checksum}` (`{version}` empty
 * or `2`), or `cols`/`rows` fall outside 1-8.
 * @throws {ShapeIdError} with code `payload-length-mismatch` if the
 * payload length does not equal the width required for the ID's version
 * and cell count (`cols * rows` for version 1, `2 * cols * rows` for
 * version 2).
 * @throws {ShapeIdError} with code `checksum-mismatch` if the trailing
 * checksum does not match the modular sum defined for the ID's version.
 * @throws {ShapeIdError} with code `bad-ramp-block` if a trailing `~` ramp
 * modifier block is present but malformed (see `src/core/ramp.ts`).
 */
export function decodeShapeId(id: string): ShapeDef {
  const match = SHAPE_ID_PATTERN.exec(id);
  if (!match) {
    throw new ShapeIdError(
      "bad-format",
      `"${id}" does not match the shape ID pattern BS{2}-{cols}X{rows}-{payload}{checksum}.`,
    );
  }

  const [, versionMarker, colsStr, rowsStr, payloadAndChecksum, rampGroup] = match as unknown as [
    string,
    string | undefined,
    string,
    string,
    string,
    string | undefined,
  ];
  const width: 1 | 2 = versionMarker === "2" ? 2 : 1;
  const cols = Number(colsStr);
  const rows = Number(rowsStr);

  if (cols < 1 || cols > 8 || rows < 1 || rows > 8) {
    throw new ShapeIdError(
      "bad-format",
      `Grid dimensions ${cols}x${rows} are out of range; cols and rows must each be 1-8.`,
    );
  }

  // The pattern's final group covers payload + checksum together; the
  // checksum is always exactly the last `width` characters.
  const payload = payloadAndChecksum.slice(0, -width);
  const checksum = payloadAndChecksum.slice(-width);

  const expectedLength = cols * rows * width;
  if (payload.length !== expectedLength) {
    throw new ShapeIdError(
      "payload-length-mismatch",
      `Payload length ${payload.length} does not equal ${width === 2 ? "2 * " : ""}cols * rows (${expectedLength}) for a ${cols}x${rows} grid${width === 2 ? " under format version 2" : ""}.`,
    );
  }

  const expectedChecksum = computeChecksumDigits(payload, width);
  if (checksum !== expectedChecksum) {
    throw new ShapeIdError(
      "checksum-mismatch",
      `Checksum "${checksum}" does not match the expected checksum "${expectedChecksum}" for this payload.`,
    );
  }

  const cells: CellDef[] = [];
  for (let i = 0; i < payload.length; i += width) {
    const flatIndex = base62DigitsToIndex(payload.slice(i, i + width), width);
    cells.push(flatIndexToCell(flatIndex));
  }

  if (rampGroup === undefined) {
    return { cols, rows, cells };
  }
  try {
    // `rampGroup` still carries its leading "~".
    const ramp = decodeRampBlock(rampGroup.slice(1));
    return { cols, rows, cells, ramp };
  } catch (error) {
    if (error instanceof RampError) {
      throw new ShapeIdError("bad-ramp-block", `Invalid ramp modifier block: ${error.message}`);
    }
    throw error;
  }
}
