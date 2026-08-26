import { type PathSegment, type PrimitivePathBuilder, transformPathSegment } from "./transform.js";

/**
 * The cap primitive: a single semicircular arc spanning the cell's bottom
 * edge (before rotation/invert), radius = half the edge length, centered on
 * the edge midpoint, bulging upward into the cell — a "stadium end" that
 * rounds both of that edge's corners with one smooth curve rather than two
 * independent quarter-circle cuts.
 */
export const cap: PrimitivePathBuilder = (cellSize, rotation, invert) => {
  const r = cellSize / 2;
  const local: PathSegment[] = [
    { command: "M", x: 0, y: cellSize },
    {
      command: "A",
      rx: r,
      ry: r,
      xAxisRotation: 0,
      largeArcFlag: 0,
      sweepFlag: 1,
      x: cellSize,
      y: cellSize,
    },
    { command: "Z" },
  ];
  return local.map((segment) => transformPathSegment(segment, cellSize, rotation, invert));
};
