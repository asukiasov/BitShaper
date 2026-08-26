import { type PathSegment, type PrimitivePathBuilder, transformPathSegment } from "./transform.js";

/**
 * Radius ratio for {@link pinwheelArc}, as a fraction of `cellSize`. An
 * empirical fit from `docs/primitive-survey.md` (not an exact fraction) —
 * open to revision if a future sample batch narrows it further.
 */
const PINWHEEL_ARC_RADIUS_RATIO = 0.78;

/**
 * The pinwheel-arc primitive: a concave quarter-arc like {@link fillet}, but
 * anchored at the cell's bottom-right corner (before rotation/invert) with a
 * radius smaller than `cellSize` ({@link PINWHEEL_ARC_RADIUS_RATIO}), leaving
 * a short straight stub edge along each of the two adjacent edges before the
 * arc begins — instead of the arc spanning corner-to-corner the way
 * `fillet`'s full-`cellSize`-radius arc does.
 */
export const pinwheelArc: PrimitivePathBuilder = (cellSize, rotation, invert) => {
  const r = cellSize * PINWHEEL_ARC_RADIUS_RATIO;
  const local: PathSegment[] = [
    { command: "M", x: cellSize, y: cellSize },
    { command: "L", x: cellSize, y: cellSize - r },
    {
      command: "A",
      rx: r,
      ry: r,
      xAxisRotation: 0,
      largeArcFlag: 0,
      sweepFlag: 0,
      x: cellSize - r,
      y: cellSize,
    },
    { command: "Z" },
  ];
  return local.map((segment) => transformPathSegment(segment, cellSize, rotation, invert));
};
