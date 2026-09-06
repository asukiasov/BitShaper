import { type PathSegment, type PrimitivePathBuilder, transformPathSegment } from "./transform.js";

/**
 * The diamond primitive: a square rotated 45 degrees, its four vertices at
 * the midpoints of the cell's four edges. Centrally symmetric — rotation in
 * 90-degree steps and horizontal invert both map the shape onto itself, but
 * the coordinates are still passed through {@link transformPathSegment} for
 * API consistency with every other primitive. Two {@link gable} triangles
 * base-to-base form this same shape. Derived from `samples/new 4/` (the
 * 45-degree checkerboard, and the centre of the lobed emblem).
 */
export const diamond: PrimitivePathBuilder = (cellSize, rotation, invert) => {
  const mid = cellSize / 2;
  const local: PathSegment[] = [
    { command: "M", x: mid, y: 0 },
    { command: "L", x: cellSize, y: mid },
    { command: "L", x: mid, y: cellSize },
    { command: "L", x: 0, y: mid },
    { command: "Z" },
  ];
  return local.map((segment) => transformPathSegment(segment, cellSize, rotation, invert));
};
