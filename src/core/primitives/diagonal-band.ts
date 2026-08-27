import { type PathSegment, type PrimitivePathBuilder, transformPathSegment } from "./transform.js";

/**
 * Vertical thickness of {@link diagonalBand}'s band, as a fraction of
 * `cellSize`. An exact fraction — the reference sample's band edges sit
 * precisely on the cell's vertical midpoints (`128 * 1/2 = 64`).
 */
const DIAGONAL_BAND_WIDTH_RATIO = 1 / 2;

/**
 * The diagonal-band primitive: a full-width parallelogram band sheared
 * across the cell — the straight-line sibling of {@link arcBand}, and the
 * band sibling of {@link wedge}'s corner-to-corner cut. Its two long edges
 * are parallel diagonals; at rotation 0 / invert false the band enters at
 * the cell's top-left corner and exits at its bottom-right corner, with a
 * vertical thickness of `cellSize / 2` ({@link DIAGONAL_BAND_WIDTH_RATIO})
 * leaving a matching empty triangle above and below it.
 */
export const diagonalBand: PrimitivePathBuilder = (cellSize, rotation, invert) => {
  const w = cellSize * DIAGONAL_BAND_WIDTH_RATIO;
  const local: PathSegment[] = [
    { command: "M", x: 0, y: 0 },
    { command: "L", x: cellSize, y: w },
    { command: "L", x: cellSize, y: cellSize },
    { command: "L", x: 0, y: w },
    { command: "Z" },
  ];
  return local.map((segment) => transformPathSegment(segment, cellSize, rotation, invert));
};
