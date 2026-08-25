import { type PathSegment, type PrimitivePathBuilder, transformPathSegment } from "./transform.js";

/**
 * The fillet primitive: a concave quarter-circle cut from the cell's
 * top-left corner (before rotation/invert) — the square with the quarter
 * disk of radius `cellSize`, centered on that corner, removed. Shares its
 * arc segment with {@link bulge}'s canonical geometry; only the straight
 * edge that closes the path differs (back through the opposite corner
 * instead of the cut corner itself).
 */
export const fillet: PrimitivePathBuilder = (cellSize, rotation, invert) => {
  const local: PathSegment[] = [
    { command: "M", x: cellSize, y: 0 },
    {
      command: "A",
      rx: cellSize,
      ry: cellSize,
      xAxisRotation: 0,
      largeArcFlag: 0,
      sweepFlag: 1,
      x: 0,
      y: cellSize,
    },
    { command: "L", x: cellSize, y: cellSize },
    { command: "Z" },
  ];
  return local.map((segment) => transformPathSegment(segment, cellSize, rotation, invert));
};
