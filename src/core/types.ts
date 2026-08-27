/**
 * Rotation applied to a cell's primitive geometry, in degrees clockwise.
 * The shape ID format encodes this as a 0-3 code (`rotation / 90`) as part
 * of its `type * 8 + rotation * 2 + invert` per-cell flat index.
 */
export type Rotation = 0 | 90 | 180 | 270;

/**
 * One cell's placement within a {@link ShapeDef}: which primitive to draw,
 * at what rotation, and whether it is mirrored first.
 */
export interface CellDef {
  /** Index into the primitive registry (see `src/core/registry.ts`). */
  readonly type: number;
  /** Clockwise rotation applied to the primitive's geometry. */
  readonly rotation: Rotation;
  /** Whether the primitive is horizontally mirrored before rotation. */
  readonly invert: boolean;
}

/** Which grid axis a {@link Ramp}'s progress is measured along. */
export type RampAxis = "column" | "row" | "diagonal" | "radial";

/** How a {@link Ramp}'s linear progress `t` is reshaped before use. */
export type RampCurve = "linear" | "easeIn" | "easeOut" | "easeInOut" | "symmetric";

/** Which per-cell transform component a {@link RampTrack} drives. */
export type RampParam = "scale" | "scaleX" | "scaleY" | "angle";

/**
 * One interpolated component of a {@link Ramp}: a `param` swept linearly from
 * `from` to `to` as the (curved) grid progress goes 0 -> 1.
 *
 * `from`/`to` are real values: for `scale`/`scaleX`/`scaleY` roughly `0` to
 * `1.968` with `1` meaning identity (no scaling); for `angle`, degrees
 * roughly `-90` to `90` with `0` meaning identity. `encodeShapeId` snaps each
 * endpoint to the ID format's quantization grid (`scale = index / 31`,
 * `angleDeg = (index - 31) * 90 / 31`, index in `0..61`), so a `ShapeDef`
 * built with off-grid values encodes to the nearest representable ID.
 */
export interface RampTrack {
  readonly param: RampParam;
  readonly from: number;
  readonly to: number;
}

/**
 * An optional modifier on a {@link ShapeDef} that varies a continuous per-cell
 * transform (non-uniform scale and/or rotation-angle offset) across the grid.
 * Every cell stays a discrete `CellDef`; the ramp is applied at render time,
 * about each cell's center, after the cell's own rotation/invert and before
 * its grid offset. All `tracks` share the one `axis` and `curve`; each track's
 * `param` must be distinct, and `scale` is mutually exclusive with
 * `scaleX`/`scaleY`.
 */
export interface Ramp {
  readonly axis: RampAxis;
  readonly curve: RampCurve;
  /** 1 to 4 tracks. */
  readonly tracks: readonly RampTrack[];
}

/**
 * A full shape definition: a `cols` x `rows` grid of cells, in row-major
 * order (left-to-right, top-to-bottom).
 */
export interface ShapeDef {
  /** Number of columns in the grid. */
  readonly cols: number;
  /** Number of rows in the grid. */
  readonly rows: number;
  /** Row-major cell list; length must equal `cols * rows`. */
  readonly cells: readonly CellDef[];
  /** Optional parametric transform swept across the grid. */
  readonly ramp?: Ramp;
}
