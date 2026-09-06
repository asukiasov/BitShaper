import { type PathSegment, type PrimitivePathBuilder, transformPathSegment } from "./transform.js";

/**
 * The gable primitive: an isosceles triangle with its base on the cell's
 * bottom edge and its apex at the midpoint of the top edge (points up at
 * rotation 0). The straight-line sibling of {@link cap} (a semicircle over a
 * full edge); two gables base-to-base tile a {@link diamond}. Symmetric
 * about the vertical axis, so invert is a visual no-op. A faceted companion
 * motif for the `samples/new 4/` marks.
 */
export const gable: PrimitivePathBuilder = (cellSize, rotation, invert) => {
  const local: PathSegment[] = [
    { command: "M", x: 0, y: cellSize },
    { command: "L", x: cellSize, y: cellSize },
    { command: "L", x: cellSize / 2, y: 0 },
    { command: "Z" },
  ];
  return local.map((segment) => transformPathSegment(segment, cellSize, rotation, invert));
};
