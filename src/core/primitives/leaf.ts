import { type PathSegment, type PrimitivePathBuilder, transformPathSegment } from "./transform.js";

/**
 * The leaf primitive: a pointed lens (vesica) spanning the cell along its
 * anti-diagonal (before rotation/invert) — the region shared by two
 * quarter-disks of radius `cellSize` centered on the cell's top-left and
 * bottom-right corners. Its two edges are the same corner-to-corner arc
 * {@link fillet}/{@link bulge}/{@link arcBand} already use (radius
 * `cellSize`), one bowing toward each of those corners, meeting at sharp
 * points on the top-right and bottom-left corners. Unlike drawing `bulge`
 * twice — which fills the union of the two quarter-disks — `leaf` traces the
 * single closed outline of their intersection.
 */
export const leaf: PrimitivePathBuilder = (cellSize, rotation, invert) => {
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
    {
      command: "A",
      rx: cellSize,
      ry: cellSize,
      xAxisRotation: 0,
      largeArcFlag: 0,
      sweepFlag: 1,
      x: cellSize,
      y: 0,
    },
    { command: "Z" },
  ];
  return local.map((segment) => transformPathSegment(segment, cellSize, rotation, invert));
};
