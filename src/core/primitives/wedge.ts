import { type PathSegment, type PrimitivePathBuilder, transformPathSegment } from "./transform.js";

/**
 * The wedge primitive: a straight (non-curved) diagonal cut from the cell's
 * top-left corner to its bottom-right corner (before rotation/invert) — the
 * straight-line sibling of {@link fillet}/{@link bulge}'s quarter-circle
 * corner cuts. The filled region is the triangle spanning the top-left,
 * top-right, and bottom-right corners; the diagonal cut is the implicit
 * closing edge back to the top-left corner.
 */
export const wedge: PrimitivePathBuilder = (cellSize, rotation, invert) => {
  const local: PathSegment[] = [
    { command: "M", x: 0, y: 0 },
    { command: "L", x: cellSize, y: 0 },
    { command: "L", x: cellSize, y: cellSize },
    { command: "Z" },
  ];
  return local.map((segment) => transformPathSegment(segment, cellSize, rotation, invert));
};
