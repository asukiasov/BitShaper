import type { CellDef, Rotation, ShapeDef } from "./types.js";

/** Base62 alphabet: index 0-9 -> "0"-"9", 10-35 -> "A"-"Z", 36-61 -> "a"-"z". */
const BASE62_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Highest flat per-cell index representable by one base62 character. */
const MAX_CELL_INDEX = 61;

/** Pattern for a well-formed shape ID: `BS-{cols}X{rows}-{payload}{checksum}`. */
const SHAPE_ID_PATTERN = /^BS-(\d+)X(\d+)-([0-9A-Za-z]+)$/;

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
      | "primitive-ceiling-overflow",
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

/** Computes the mod-62 checksum character over a payload's base62 indices. */
function computeChecksumChar(payload: string): string {
  let sum = 0;
  for (const char of payload) {
    sum += base62CharToIndex(char);
  }
  return indexToBase62Char(sum % 62);
}

/**
 * Encodes a {@link ShapeDef} into its shape ID string
 * (`BS-{cols}X{rows}-{payload}{checksum}`). Encoding is canonical: two
 * `ShapeDef` values describing identical geometry always produce the same
 * ID, including checksum.
 *
 * @throws {ShapeIdError} with code `primitive-ceiling-overflow` if any
 * cell's flat index (`type * 8 + rotation * 2 + invert`) exceeds 61 — the
 * ceiling imposed by one base62 character per cell.
 */
export function encodeShapeId(shape: ShapeDef): string {
  const payload = shape.cells
    .map((cell) => {
      const flatIndex = cellToFlatIndex(cell);
      if (flatIndex > MAX_CELL_INDEX) {
        throw new ShapeIdError(
          "primitive-ceiling-overflow",
          `Cell flat index ${flatIndex} (type=${cell.type}, rotation=${cell.rotation}, invert=${cell.invert}) exceeds the primitive-index ceiling of ${MAX_CELL_INDEX}.`,
        );
      }
      return indexToBase62Char(flatIndex);
    })
    .join("");

  const checksum = computeChecksumChar(payload);
  return `BS-${shape.cols}X${shape.rows}-${payload}${checksum}`;
}

/**
 * Decodes a shape ID string into its {@link ShapeDef}. Validates the ID's
 * format, grid dimensions, payload length, and checksum before returning
 * anything — a partial or best-guess `ShapeDef` is never returned.
 *
 * @throws {ShapeIdError} with code `bad-format` if the string does not
 * match `BS-{cols}X{rows}-{payload}{checksum}` or `cols`/`rows` fall
 * outside 1-8.
 * @throws {ShapeIdError} with code `payload-length-mismatch` if the
 * payload length does not equal `cols * rows`.
 * @throws {ShapeIdError} with code `checksum-mismatch` if the trailing
 * checksum character does not match the mod-62 sum of the payload's
 * base62 indices.
 */
export function decodeShapeId(id: string): ShapeDef {
  const match = SHAPE_ID_PATTERN.exec(id);
  if (!match) {
    throw new ShapeIdError(
      "bad-format",
      `"${id}" does not match the shape ID pattern BS-{cols}X{rows}-{payload}{checksum}.`,
    );
  }

  const [, colsStr, rowsStr, payloadAndChecksum] = match as unknown as [
    string,
    string,
    string,
    string,
  ];
  const cols = Number(colsStr);
  const rows = Number(rowsStr);

  if (cols < 1 || cols > 8 || rows < 1 || rows > 8) {
    throw new ShapeIdError(
      "bad-format",
      `Grid dimensions ${cols}x${rows} are out of range; cols and rows must each be 1-8.`,
    );
  }

  // The pattern's final group covers payload + checksum together (the
  // regex guarantees at least one character); the checksum is always
  // exactly the last character.
  const payload = payloadAndChecksum.slice(0, -1);
  const checksum = payloadAndChecksum.at(-1) as string;

  const expectedLength = cols * rows;
  if (payload.length !== expectedLength) {
    throw new ShapeIdError(
      "payload-length-mismatch",
      `Payload length ${payload.length} does not equal cols * rows (${expectedLength}) for a ${cols}x${rows} grid.`,
    );
  }

  const expectedChecksum = computeChecksumChar(payload);
  if (checksum !== expectedChecksum) {
    throw new ShapeIdError(
      "checksum-mismatch",
      `Checksum "${checksum}" does not match the expected checksum "${expectedChecksum}" for this payload.`,
    );
  }

  const cells: CellDef[] = [];
  for (const char of payload) {
    const flatIndex = base62CharToIndex(char);
    cells.push(flatIndexToCell(flatIndex));
  }

  return { cols, rows, cells };
}
