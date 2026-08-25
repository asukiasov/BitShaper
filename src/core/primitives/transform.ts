import type { Rotation } from "../types.js";

/** A 2D point in a cell's local coordinate space, `[0, cellSize] x [0, cellSize]`. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * One command in a primitive's output geometry. Coordinates are absolute
 * within the cell's local `[0, cellSize] x [0, cellSize]` space (origin at
 * the cell's top-left corner, y increasing downward, matching SVG).
 *
 * This is the primitive path-builder contract that `src/core/render.ts`
 * (Task 4) consumes: it will translate each cell's segments by that cell's
 * grid offset and concatenate every cell's segments into one `<path d="...">`
 * string.
 */
export type PathSegment =
  | { readonly command: "M"; readonly x: number; readonly y: number }
  | { readonly command: "L"; readonly x: number; readonly y: number }
  | {
      readonly command: "A";
      readonly rx: number;
      readonly ry: number;
      readonly xAxisRotation: number;
      readonly largeArcFlag: 0 | 1;
      readonly sweepFlag: 0 | 1;
      readonly x: number;
      readonly y: number;
    }
  | { readonly command: "Z" };

/**
 * The signature every primitive in `src/core/primitives/` implements: given
 * the cell's pixel size and the cell's rotation/invert (from its `CellDef`),
 * returns that cell's geometry as an array of {@link PathSegment}s in local
 * `[0, cellSize]^2` coordinates. Rotation/invert are already baked into the
 * returned coordinates — callers never apply an SVG `transform=`.
 */
export type PrimitivePathBuilder = (
  cellSize: number,
  rotation: Rotation,
  invert: boolean,
) => PathSegment[];

/**
 * Mirrors a point horizontally within `[0, cellSize]`, then rotates it
 * clockwise about the cell's center by `rotation` degrees. Invert is always
 * applied before rotation (per design.md) so the two transforms compose the
 * same way regardless of call order.
 */
export function transformPoint(
  point: Point,
  cellSize: number,
  rotation: Rotation,
  invert: boolean,
): Point {
  const mirroredX = invert ? cellSize - point.x : point.x;
  const center = cellSize / 2;
  const dx = mirroredX - center;
  const dy = point.y - center;

  let rotatedDx: number;
  let rotatedDy: number;
  switch (rotation) {
    case 0:
      rotatedDx = dx;
      rotatedDy = dy;
      break;
    case 90:
      rotatedDx = -dy;
      rotatedDy = dx;
      break;
    case 180:
      rotatedDx = -dx;
      rotatedDy = -dy;
      break;
    case 270:
      rotatedDx = dy;
      rotatedDy = -dx;
      break;
  }

  return { x: center + rotatedDx, y: center + rotatedDy };
}

/**
 * A mirror reflection reverses an arc's geometric handedness, so a sweep
 * flag computed for the un-inverted primitive must flip when `invert` is
 * true. A proper rotation (multiples of 90 degrees) never changes
 * handedness, so rotation alone never flips the sweep flag.
 */
export function transformSweepFlag(sweepFlag: 0 | 1, invert: boolean): 0 | 1 {
  return invert ? (sweepFlag === 0 ? 1 : 0) : sweepFlag;
}

/**
 * Applies {@link transformPoint} (and, for arcs, {@link transformSweepFlag})
 * to one path segment. The single place where a primitive's local geometry
 * becomes its final, cell-transformed geometry — every primitive builds its
 * local-coordinate segments and maps them through this function.
 */
export function transformPathSegment(
  segment: PathSegment,
  cellSize: number,
  rotation: Rotation,
  invert: boolean,
): PathSegment {
  switch (segment.command) {
    case "Z":
      return segment;
    case "M":
    case "L": {
      const { x, y } = transformPoint({ x: segment.x, y: segment.y }, cellSize, rotation, invert);
      return { command: segment.command, x, y };
    }
    case "A": {
      const { x, y } = transformPoint({ x: segment.x, y: segment.y }, cellSize, rotation, invert);
      return {
        ...segment,
        x,
        y,
        sweepFlag: transformSweepFlag(segment.sweepFlag, invert),
      };
    }
  }
}
