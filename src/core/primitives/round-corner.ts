import { type PathSegment, type PrimitivePathBuilder, transformPathSegment } from "./transform.js";

/**
 * Radius ratio for {@link roundCorner}, as a fraction of `cellSize`. An
 * exact fraction (unlike {@link pinwheelArc}'s empirically-fit ratio):
 * `128 * 25/32 = 100`, matching its source reference sample with zero
 * rounding error.
 */
const ROUND_CORNER_RADIUS_RATIO = 25 / 32;

/**
 * The round-corner primitive: a filled cell with its top-left corner
 * (before rotation/invert) rounded off by a quarter-circle arc whose center
 * is inset from that corner by the arc's own radius along both axes — the
 * standard "rounded rectangle corner" construction. This distinguishes it
 * from {@link fillet}/{@link bulge}/{@link pinwheelArc}, whose arcs are all
 * centered directly on a cell corner rather than inset from it.
 */
export const roundCorner: PrimitivePathBuilder = (cellSize, rotation, invert) => {
  const r = cellSize * ROUND_CORNER_RADIUS_RATIO;
  const local: PathSegment[] = [
    { command: "M", x: r, y: 0 },
    { command: "L", x: cellSize, y: 0 },
    { command: "L", x: cellSize, y: cellSize },
    { command: "L", x: 0, y: cellSize },
    { command: "L", x: 0, y: r },
    {
      command: "A",
      rx: r,
      ry: r,
      xAxisRotation: 0,
      largeArcFlag: 0,
      sweepFlag: 1,
      x: r,
      y: 0,
    },
    { command: "Z" },
  ];
  return local.map((segment) => transformPathSegment(segment, cellSize, rotation, invert));
};
