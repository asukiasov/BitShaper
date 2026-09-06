import { type PathSegment, type PrimitivePathBuilder, transformPathSegment } from "./transform.js";

/**
 * The bar primitive: a centred, axis-aligned band spanning the full cell
 * width, with a thickness of `cellSize / 2` (band edges at the cell's
 * vertical quarter points). The axis-aligned sibling of {@link diagonalBand}
 * (which is sheared) — stacked bars read as stripes, crossed bars as plaid.
 * Symmetric about the vertical axis, so invert is a visual no-op. Derived
 * from `samples/new 4/` (the offset horizontal stripes).
 */
export const bar: PrimitivePathBuilder = (cellSize, rotation, invert) => {
  const quarter = cellSize / 4;
  const local: PathSegment[] = [
    { command: "M", x: 0, y: quarter },
    { command: "L", x: cellSize, y: quarter },
    { command: "L", x: cellSize, y: cellSize - quarter },
    { command: "L", x: 0, y: cellSize - quarter },
    { command: "Z" },
  ];
  return local.map((segment) => transformPathSegment(segment, cellSize, rotation, invert));
};
