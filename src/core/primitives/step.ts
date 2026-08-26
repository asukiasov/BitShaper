import { type PathSegment, type PrimitivePathBuilder, transformPathSegment } from "./transform.js";

/**
 * Half-width of {@link step}'s horizontal jog, as a fraction of `cellSize`.
 * A pinned but arbitrary ratio (no source vector data exists for this
 * primitive) — chosen as the simplest fraction that keeps the jog visually
 * distinct from a straight {@link wedge} cut without dominating the cell.
 */
const STEP_JOG_HALF_WIDTH_RATIO = 1 / 8;

/**
 * The step primitive: a corner-to-corner cut like {@link wedge}, but the
 * connecting edge is a 3-segment polyline (diagonal, then a short horizontal
 * jog, then diagonal) instead of one straight line — a "dogleg" cut, per
 * `docs/primitive-survey-screens2.md`. The two diagonal segments are
 * symmetric under 180° rotation about the cell center.
 */
export const step: PrimitivePathBuilder = (cellSize, rotation, invert) => {
  const j = cellSize * STEP_JOG_HALF_WIDTH_RATIO;
  const mid = cellSize / 2;
  const local: PathSegment[] = [
    { command: "M", x: 0, y: 0 },
    { command: "L", x: cellSize, y: 0 },
    { command: "L", x: cellSize, y: cellSize },
    { command: "L", x: mid + j, y: mid },
    { command: "L", x: mid - j, y: mid },
    { command: "Z" },
  ];
  return local.map((segment) => transformPathSegment(segment, cellSize, rotation, invert));
};
