import type { PathSegment } from "./primitives/transform.js";
import type { CellRampTransform } from "./ramp.js";

/** Line segments emitted per 90 degrees of arc sweep when flattening under a ramp. */
const ARC_SAMPLES_PER_QUARTER_TURN = 24;

/**
 * The 2x2 matrix `M = R(angleDeg) * diag(scaleX, scaleY)` as `[a, b, c, d]`
 * where a transformed point is `(a*x + b*y, c*x + d*y)`. Rotation is clockwise
 * in SVG's y-down space, matching the discrete-rotation convention in
 * `primitives/transform.ts`.
 */
function rampMatrix(transform: CellRampTransform): [number, number, number, number] {
  const rad = (transform.angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [
    cos * transform.scaleX,
    -sin * transform.scaleY,
    sin * transform.scaleX,
    cos * transform.scaleY,
  ];
}

/** Applies a ramp matrix to a point taken relative to the cell center. */
function apply(
  m: [number, number, number, number],
  x: number,
  y: number,
  center: number,
): { x: number; y: number } {
  const dx = x - center;
  const dy = y - center;
  return { x: m[0] * dx + m[1] * dy + center, y: m[2] * dx + m[3] * dy + center };
}

/**
 * Samples an SVG elliptical-arc segment (`A`) into points along the curve,
 * from the arc's start point to its end point, using the standard endpoint ->
 * center parameterization (SVG spec F.6.5). The primitives only ever emit
 * circular arcs (`rx === ry`, no x-axis rotation), but the general form costs
 * little and is robust.
 */
function sampleArc(
  x1: number,
  y1: number,
  seg: Extract<PathSegment, { command: "A" }>,
  out: Array<{ x: number; y: number }>,
): void {
  let rx = Math.abs(seg.rx);
  let ry = Math.abs(seg.ry);
  const { x: x2, y: y2 } = seg;
  if (rx === 0 || ry === 0) {
    out.push({ x: x2, y: y2 });
    return;
  }

  const phi = (seg.xAxisRotation * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;

  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    const scale = Math.sqrt(lambda);
    rx *= scale;
    ry *= scale;
  }

  const sign = seg.largeArcFlag === seg.sweepFlag ? -1 : 1;
  const numerator = Math.max(0, rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p);
  const denominator = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
  const coefficient = denominator === 0 ? 0 : sign * Math.sqrt(numerator / denominator);
  const cxp = (coefficient * (rx * y1p)) / ry;
  const cyp = (coefficient * -(ry * x1p)) / rx;

  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

  const angleBetween = (ux: number, uy: number, vx: number, vy: number): number => {
    const dot = ux * vx + uy * vy;
    const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    let angle = Math.acos(Math.min(1, Math.max(-1, len === 0 ? 1 : dot / len)));
    if (ux * vy - uy * vx < 0) {
      angle = -angle;
    }
    return angle;
  };

  const theta1 = angleBetween(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let deltaTheta = angleBetween(
    (x1p - cxp) / rx,
    (y1p - cyp) / ry,
    (-x1p - cxp) / rx,
    (-y1p - cyp) / ry,
  );
  if (seg.sweepFlag === 0 && deltaTheta > 0) {
    deltaTheta -= 2 * Math.PI;
  } else if (seg.sweepFlag === 1 && deltaTheta < 0) {
    deltaTheta += 2 * Math.PI;
  }

  const steps = Math.max(
    2,
    Math.ceil((Math.abs(deltaTheta) / (Math.PI / 2)) * ARC_SAMPLES_PER_QUARTER_TURN),
  );
  for (let i = 1; i <= steps; i++) {
    const theta = theta1 + (deltaTheta * i) / steps;
    const ex = cosPhi * rx * Math.cos(theta) - sinPhi * ry * Math.sin(theta) + cx;
    const ey = sinPhi * rx * Math.cos(theta) + cosPhi * ry * Math.sin(theta) + cy;
    out.push({ x: ex, y: ey });
  }
}

/**
 * Applies a cell's resolved {@link CellRampTransform} to its already
 * rotation/invert-transformed local segments, about the cell center. `M`/`L`
 * points are mapped through the ramp matrix; `A` arc segments are flattened to
 * polylines (their sampled points mapped through the matrix and emitted as
 * `L`), because a non-uniform scale followed by a rotation turns a circular
 * arc into a rotated ellipse that a single `A` command cannot always express.
 */
export function applyRampTransform(
  segments: PathSegment[],
  transform: CellRampTransform,
  center: number,
): PathSegment[] {
  const m = rampMatrix(transform);
  const out: PathSegment[] = [];
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;

  for (const segment of segments) {
    switch (segment.command) {
      case "M": {
        const p = apply(m, segment.x, segment.y, center);
        out.push({ command: "M", x: p.x, y: p.y });
        currentX = segment.x;
        currentY = segment.y;
        startX = segment.x;
        startY = segment.y;
        break;
      }
      case "L": {
        const p = apply(m, segment.x, segment.y, center);
        out.push({ command: "L", x: p.x, y: p.y });
        currentX = segment.x;
        currentY = segment.y;
        break;
      }
      case "A": {
        const points: Array<{ x: number; y: number }> = [];
        sampleArc(currentX, currentY, segment, points);
        for (const point of points) {
          const p = apply(m, point.x, point.y, center);
          out.push({ command: "L", x: p.x, y: p.y });
        }
        currentX = segment.x;
        currentY = segment.y;
        break;
      }
      case "Z": {
        out.push({ command: "Z" });
        currentX = startX;
        currentY = startY;
        break;
      }
    }
  }
  return out;
}
