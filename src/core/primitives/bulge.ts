import { type PathSegment, type PrimitivePathBuilder, transformPathSegment } from "./transform.js";

/**
 * The bulge primitive: a convex quarter-circle disk bulging out from the
 * cell's top-left corner (before rotation/invert) — the quarter disk of
 * radius `cellSize`, centered on that corner. Shares its arc segment with
 * {@link fillet}'s canonical geometry; only the straight edge that closes
 * the path differs (back through the cut corner itself instead of the
 * opposite corner).
 */
export const bulge: PrimitivePathBuilder = (cellSize, rotation, invert) => {
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
    { command: "L", x: 0, y: 0 },
    { command: "Z" },
  ];
  return local.map((segment) => transformPathSegment(segment, cellSize, rotation, invert));
};
