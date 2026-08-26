import { type PathSegment, type PrimitivePathBuilder, transformPathSegment } from "./transform.js";

/**
 * The circle primitive: a filled circle centered in the cell, tangent to all
 * four sides (diameter = `cellSize`), traced as two half-circle arcs. The
 * traced circle is centrally symmetric, so it renders identically at every
 * rotation/invert combination, but the emitted path segments still change
 * (the start point rotates to a different point on the circle, and `invert`
 * flips both arcs' sweep flags) — rotation/invert are applied the same way
 * as every other primitive, purely for `PrimitivePathBuilder` contract
 * consistency.
 */
export const circle: PrimitivePathBuilder = (cellSize, rotation, invert) => {
  const r = cellSize / 2;
  const local: PathSegment[] = [
    { command: "M", x: 0, y: r },
    {
      command: "A",
      rx: r,
      ry: r,
      xAxisRotation: 0,
      largeArcFlag: 1,
      sweepFlag: 0,
      x: cellSize,
      y: r,
    },
    {
      command: "A",
      rx: r,
      ry: r,
      xAxisRotation: 0,
      largeArcFlag: 1,
      sweepFlag: 0,
      x: 0,
      y: r,
    },
    { command: "Z" },
  ];
  return local.map((segment) => transformPathSegment(segment, cellSize, rotation, invert));
};
