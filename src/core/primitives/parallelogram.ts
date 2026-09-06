import { type PathSegment, type PrimitivePathBuilder, transformPathSegment } from "./transform.js";

/**
 * The parallelogram primitive: a full-cell-height quadrilateral whose top
 * edge is sheared right by `cellSize / 2` relative to its bottom edge. At
 * rotation 0 / invert false it slants like a forward slash; invert mirrors
 * it to a backslash; rotation 90 swings the shear axis. Two adjacent cells
 * at complementary rotations read as a cube corner. Derived from
 * `samples/new 4/` (the isometric-cube mark and the slanted bar rows).
 */
export const parallelogram: PrimitivePathBuilder = (cellSize, rotation, invert) => {
  const mid = cellSize / 2;
  const local: PathSegment[] = [
    { command: "M", x: mid, y: 0 },
    { command: "L", x: cellSize, y: 0 },
    { command: "L", x: mid, y: cellSize },
    { command: "L", x: 0, y: cellSize },
    { command: "Z" },
  ];
  return local.map((segment) => transformPathSegment(segment, cellSize, rotation, invert));
};
