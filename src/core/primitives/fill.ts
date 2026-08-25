import { type PathSegment, type PrimitivePathBuilder, transformPathSegment } from "./transform.js";

/**
 * The fill primitive: a solid square covering the full `cellSize x cellSize`
 * cell area.
 */
export const fill: PrimitivePathBuilder = (cellSize, rotation, invert) => {
  const local: PathSegment[] = [
    { command: "M", x: 0, y: 0 },
    { command: "L", x: cellSize, y: 0 },
    { command: "L", x: cellSize, y: cellSize },
    { command: "L", x: 0, y: cellSize },
    { command: "Z" },
  ];
  return local.map((segment) => transformPathSegment(segment, cellSize, rotation, invert));
};
