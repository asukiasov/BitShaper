import { type PathSegment, type PrimitivePathBuilder, transformPathSegment } from "./transform.js";

/**
 * The ogee primitive: a band from the cell's top edge down to an S-curve,
 * built from two arcs of equal radius (`cellSize / 4`) with opposite sweep
 * flags — matching curvature on both halves so they meet with a continuous
 * (tangent-matched) direction at the cell's horizontal midpoint, rather than
 * a cusp. Both arc endpoints sit at `y = cellSize / 2`, tangent to the left
 * and right cell edges at their vertical midpoint.
 */
export const ogee: PrimitivePathBuilder = (cellSize, rotation, invert) => {
  const r = cellSize / 4;
  const mid = cellSize / 2;
  const local: PathSegment[] = [
    { command: "M", x: 0, y: 0 },
    { command: "L", x: cellSize, y: 0 },
    { command: "L", x: cellSize, y: mid },
    {
      command: "A",
      rx: r,
      ry: r,
      xAxisRotation: 0,
      largeArcFlag: 0,
      sweepFlag: 1,
      x: mid,
      y: mid,
    },
    {
      command: "A",
      rx: r,
      ry: r,
      xAxisRotation: 0,
      largeArcFlag: 0,
      sweepFlag: 0,
      x: 0,
      y: mid,
    },
    { command: "Z" },
  ];
  return local.map((segment) => transformPathSegment(segment, cellSize, rotation, invert));
};
