import type { Ramp, RampAxis, RampCurve, RampParam, RampTrack } from "./types.js";

/** Base62 alphabet, identical to the one the shape-ID codec uses. */
const BASE62_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Ordered enums: a value's array index is its base62 code in the ramp block. */
const RAMP_AXES: readonly RampAxis[] = ["column", "row", "diagonal", "radial"];
const RAMP_CURVES: readonly RampCurve[] = ["linear", "easeIn", "easeOut", "easeInOut", "symmetric"];
const RAMP_PARAMS: readonly RampParam[] = ["scale", "scaleX", "scaleY", "angle"];

/**
 * Quantization: every endpoint is one base62 digit (index 0-61). Index 31 is
 * the identity for both families — `scale` 1.0 and `angle` 0 degrees.
 */
const QUANT_IDENTITY_INDEX = 31;
const SCALE_STEPS = 31; // scale value = index / 31  -> 0 .. ~1.968, index 31 = 1.0
const ANGLE_HALF_RANGE_DEG = 90; // angle deg = (index - 31) * 90 / 31 -> -90 .. +90

/** Error thrown for a malformed {@link Ramp} or ramp block; the codec re-wraps it. */
export class RampError extends Error {
  constructor(
    public readonly code: "invalid-ramp" | "bad-ramp-block",
    message: string,
  ) {
    super(message);
    this.name = "RampError";
  }
}

function base62Index(char: string): number {
  return BASE62_ALPHABET.indexOf(char);
}

function base62Char(index: number): string {
  const char = BASE62_ALPHABET[index];
  if (char === undefined) {
    throw new RampError("invalid-ramp", `Ramp block index ${index} is out of base62 range 0-61.`);
  }
  return char;
}

/** Whether a param drives scaling (`scale`/`scaleX`/`scaleY`) rather than rotation. */
function isScaleParam(param: RampParam): boolean {
  return param === "scale" || param === "scaleX" || param === "scaleY";
}

/** Snaps a real endpoint value to its base62 quantization index (0-61). */
export function quantizeEndpoint(param: RampParam, value: number): number {
  const raw = isScaleParam(param)
    ? Math.round(value * SCALE_STEPS)
    : Math.round((value * SCALE_STEPS) / ANGLE_HALF_RANGE_DEG + QUANT_IDENTITY_INDEX);
  return Math.min(61, Math.max(0, raw));
}

/** Maps a base62 quantization index (0-61) back to its real endpoint value. */
export function dequantizeEndpoint(param: RampParam, index: number): number {
  return isScaleParam(param)
    ? index / SCALE_STEPS
    : ((index - QUANT_IDENTITY_INDEX) * ANGLE_HALF_RANGE_DEG) / SCALE_STEPS;
}

/** Reshapes linear progress `t` in `[0, 1]` by a {@link RampCurve}. */
function applyCurve(curve: RampCurve, t: number): number {
  switch (curve) {
    case "linear":
      return t;
    case "easeIn":
      return t * t;
    case "easeOut":
      return 1 - (1 - t) * (1 - t);
    case "easeInOut":
      return t * t * (3 - 2 * t);
    case "symmetric":
      return 1 - Math.abs(2 * t - 1);
  }
}

/**
 * Maps a cell's grid position to a ramp progress value in `[0, 1]`: raw
 * position along the ramp's axis, then reshaped by its curve. An axis whose
 * denominator would be zero (a `column` ramp on a 1-column grid, `row` on a
 * 1-row grid, `diagonal`/`radial` on a 1x1 grid) yields `0` for every cell.
 */
export function rampParameterAt(
  axis: RampAxis,
  curve: RampCurve,
  col: number,
  row: number,
  cols: number,
  rows: number,
): number {
  let raw: number;
  switch (axis) {
    case "column":
      raw = cols > 1 ? col / (cols - 1) : 0;
      break;
    case "row":
      raw = rows > 1 ? row / (rows - 1) : 0;
      break;
    case "diagonal": {
      const span = cols + rows - 2;
      raw = span > 0 ? (col + row) / span : 0;
      break;
    }
    case "radial": {
      const cx = (cols - 1) / 2;
      const cy = (rows - 1) / 2;
      const maxDistance = Math.hypot(cx, cy);
      raw = maxDistance > 0 ? Math.hypot(col - cx, row - cy) / maxDistance : 0;
      break;
    }
  }
  return applyCurve(curve, raw);
}

/** The resolved per-cell transform a {@link Ramp} produces for one cell. */
export interface CellRampTransform {
  readonly scaleX: number;
  readonly scaleY: number;
  readonly angleDeg: number;
}

/**
 * Resolves a {@link Ramp} to the concrete transform for one cell: computes the
 * cell's ramp progress once, then folds every track in (a `scale` track fills
 * both scale axes; `scaleX`/`scaleY` fill one; `angle` sets the rotation).
 * Unset components stay at identity (`1`, `1`, `0`).
 */
export function resolveCellTransform(
  ramp: Ramp,
  col: number,
  row: number,
  cols: number,
  rows: number,
): CellRampTransform {
  const t = rampParameterAt(ramp.axis, ramp.curve, col, row, cols, rows);
  let scaleX = 1;
  let scaleY = 1;
  let angleDeg = 0;
  for (const track of ramp.tracks) {
    const value = track.from + (track.to - track.from) * t;
    switch (track.param) {
      case "scale":
        scaleX = value;
        scaleY = value;
        break;
      case "scaleX":
        scaleX = value;
        break;
      case "scaleY":
        scaleY = value;
        break;
      case "angle":
        angleDeg = value;
        break;
    }
  }
  return { scaleX, scaleY, angleDeg };
}

/** Validates a {@link Ramp}'s track list (count, distinct params, scale exclusivity). */
function assertValidTracks(tracks: readonly RampTrack[], code: RampError["code"]): void {
  if (tracks.length < 1 || tracks.length > 4) {
    throw new RampError(code, `A ramp must have 1-4 tracks; got ${tracks.length}.`);
  }
  const params = new Set<RampParam>();
  for (const track of tracks) {
    if (params.has(track.param)) {
      throw new RampError(code, `Ramp has more than one "${track.param}" track.`);
    }
    params.add(track.param);
  }
  if (params.has("scale") && (params.has("scaleX") || params.has("scaleY"))) {
    throw new RampError(code, `Ramp mixes a "scale" track with a "scaleX"/"scaleY" track.`);
  }
}

/**
 * Encodes a {@link Ramp} to its block string (the characters that follow the
 * `~` in a shape ID — no leading `~`). Tracks are canonicalized: endpoints
 * snapped to the quantization grid, tracks whose snapped endpoints are both
 * identity dropped, the rest sorted ascending by param code. Returns `""` when
 * no tracks survive (the caller then omits the `~` block entirely).
 *
 * @throws {RampError} kind `invalid-ramp` if the track list is contradictory.
 */
export function encodeRampBlock(ramp: Ramp): string {
  assertValidTracks(ramp.tracks, "invalid-ramp");

  const survivors = ramp.tracks
    .map((track) => ({
      paramIndex: RAMP_PARAMS.indexOf(track.param),
      fromIndex: quantizeEndpoint(track.param, track.from),
      toIndex: quantizeEndpoint(track.param, track.to),
    }))
    .filter(
      (track) =>
        !(track.fromIndex === QUANT_IDENTITY_INDEX && track.toIndex === QUANT_IDENTITY_INDEX),
    )
    .sort((a, b) => a.paramIndex - b.paramIndex);

  if (survivors.length === 0) {
    return "";
  }

  const axisIndex = RAMP_AXES.indexOf(ramp.axis);
  const curveIndex = RAMP_CURVES.indexOf(ramp.curve);
  const body =
    base62Char(axisIndex) +
    base62Char(curveIndex) +
    base62Char(survivors.length) +
    survivors
      .map((t) => base62Char(t.paramIndex) + base62Char(t.fromIndex) + base62Char(t.toIndex))
      .join("");

  let checksum = 0;
  for (const char of body) {
    checksum += base62Index(char);
  }
  return body + base62Char(checksum % 62);
}

/**
 * Decodes a ramp block string (the text after the `~`, no leading `~`) into a
 * {@link Ramp}. Endpoint values come back as the exact quantization-grid value
 * for their stored index, so `encodeRampBlock` of the result reproduces the
 * same block.
 *
 * @throws {RampError} kind `bad-ramp-block` for any structural problem: wrong
 * length for the declared track count, a field index out of range, a duplicate
 * param, a `scale`/`scaleX`/`scaleY` conflict, or a checksum mismatch.
 */
export function decodeRampBlock(block: string): Ramp {
  if (block.length < 7) {
    throw new RampError("bad-ramp-block", `Ramp block "${block}" is too short.`);
  }

  const axisIndex = base62Index(block[0] as string);
  const curveIndex = base62Index(block[1] as string);
  const trackCount = base62Index(block[2] as string);

  const axis = RAMP_AXES[axisIndex];
  const curve = RAMP_CURVES[curveIndex];
  if (axis === undefined) {
    throw new RampError("bad-ramp-block", `Ramp block axis code ${axisIndex} is not 0-3.`);
  }
  if (curve === undefined) {
    throw new RampError("bad-ramp-block", `Ramp block curve code ${curveIndex} is not 0-4.`);
  }
  if (trackCount < 1 || trackCount > 4) {
    throw new RampError("bad-ramp-block", `Ramp block track count ${trackCount} is not 1-4.`);
  }

  const expectedLength = 3 + 3 * trackCount + 1;
  if (block.length !== expectedLength) {
    throw new RampError(
      "bad-ramp-block",
      `Ramp block length ${block.length} does not match ${expectedLength} for ${trackCount} track(s).`,
    );
  }

  const checksumChar = block[expectedLength - 1] as string;
  let checksum = 0;
  for (let i = 0; i < expectedLength - 1; i++) {
    checksum += base62Index(block[i] as string);
  }
  if (base62Char(checksum % 62) !== checksumChar) {
    throw new RampError(
      "bad-ramp-block",
      `Ramp block checksum "${checksumChar}" does not match the expected "${base62Char(checksum % 62)}".`,
    );
  }

  const tracks: RampTrack[] = [];
  for (let i = 0; i < trackCount; i++) {
    const offset = 3 + i * 3;
    const paramIndex = base62Index(block[offset] as string);
    const fromIndex = base62Index(block[offset + 1] as string);
    const toIndex = base62Index(block[offset + 2] as string);
    const param = RAMP_PARAMS[paramIndex];
    if (param === undefined) {
      throw new RampError("bad-ramp-block", `Ramp block param code ${paramIndex} is not 0-3.`);
    }
    if (fromIndex < 0 || toIndex < 0) {
      throw new RampError("bad-ramp-block", "Ramp block has an invalid endpoint character.");
    }
    tracks.push({
      param,
      from: dequantizeEndpoint(param, fromIndex),
      to: dequantizeEndpoint(param, toIndex),
    });
  }

  assertValidTracks(tracks, "bad-ramp-block");
  return { axis, curve, tracks };
}
