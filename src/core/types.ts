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
}
