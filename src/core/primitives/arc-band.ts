import { type PathSegment, type PrimitivePathBuilder, transformPathSegment } from "./transform.js";

/** Outer arc radius ratio for {@link arcBand}, as a fraction of `cellSize`. */
const ARC_BAND_OUTER_RADIUS_RATIO = 1;

/** Inner arc radius ratio for {@link arcBand}, as a fraction of `cellSize`. */
const ARC_BAND_INNER_RADIUS_RATIO = 1 / 2;

/**
 * The arc-band primitive: a quarter-annulus band occupying the cell's
 * top-left corner (before rotation/invert) — the region between two arcs of
 * different radii sharing that corner as their center. The outer arc
 * (radius `cellSize`, {@link ARC_BAND_OUTER_RADIUS_RATIO}) is exactly
 * {@link fillet}/{@link bulge}'s existing corner-to-corner arc; the inner
 * arc (radius `cellSize / 2`, {@link ARC_BAND_INNER_RADIUS_RATIO}, opposite
 * sweep) is subtracted near the corner, leaving a band of uniform radial
 * width rather than a single solid arc region.
 */
export const arcBand: PrimitivePathBuilder = (cellSize, rotation, invert) => {
  const rOuter = cellSize * ARC_BAND_OUTER_RADIUS_RATIO;
  const rInner = cellSize * ARC_BAND_INNER_RADIUS_RATIO;
  const local: PathSegment[] = [
    { command: "M", x: cellSize, y: 0 },
    {
      command: "A",
      rx: rOuter,
      ry: rOuter,
      xAxisRotation: 0,
      largeArcFlag: 0,
      sweepFlag: 1,
      x: 0,
      y: cellSize,
    },
    { command: "L", x: 0, y: rInner },
    {
      command: "A",
      rx: rInner,
      ry: rInner,
      xAxisRotation: 0,
      largeArcFlag: 0,
      sweepFlag: 0,
      x: rInner,
      y: 0,
    },
    { command: "Z" },
  ];
  return local.map((segment) => transformPathSegment(segment, cellSize, rotation, invert));
};
