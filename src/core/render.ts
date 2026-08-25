import { decodeShapeId } from "./id.js";
import type { PathSegment } from "./primitives/transform.js";
import { getPrimitiveByIndex } from "./registry.js";
import type { CellDef } from "./types.js";

/** Default width/height (in SVG user units) used when `opts.size` is omitted. */
const DEFAULT_SIZE = 256;

/** Default `fill` value used for the rendered path when `opts.fill` is omitted. */
const DEFAULT_FILL = "currentColor";

/** Options accepted by {@link renderShape}. */
export interface RenderShapeOptions {
  /** Width/height of the rendered `<svg>` element, in user units. Defaults to 256. */
  readonly size?: number;
  /** Fill color applied to the rendered `<path>`. Defaults to `"currentColor"`. */
  readonly fill?: string;
}

/**
 * Error raised by {@link renderShape} when a decoded cell's primitive type
 * index has no corresponding entry in the primitive registry. Check `code`
 * to handle this failure programmatically.
 */
export class RenderError extends Error {
  constructor(
    public readonly code: "unknown-primitive",
    message: string,
  ) {
    super(message);
    this.name = "RenderError";
  }
}

/** Rounds away floating-point noise, then formats without a trailing ".0". */
function formatNumber(value: number): string {
  const rounded = Math.round(value * 1e6) / 1e6;
  return String(rounded);
}

/** Renders one already-offset path segment as its SVG path `d` string fragment. */
function segmentToPathFragment(segment: PathSegment, offsetX: number, offsetY: number): string {
  switch (segment.command) {
    case "M":
    case "L":
      return `${segment.command}${formatNumber(segment.x + offsetX)} ${formatNumber(segment.y + offsetY)}`;
    case "A":
      return (
        `A${formatNumber(segment.rx)} ${formatNumber(segment.ry)} ${formatNumber(segment.xAxisRotation)} ` +
        `${segment.largeArcFlag} ${segment.sweepFlag} ${formatNumber(segment.x + offsetX)} ${formatNumber(segment.y + offsetY)}`
      );
    case "Z":
      return "Z";
  }
}

/** Builds one cell's path `d` fragment, translated to its grid offset. */
function cellToPathFragment(cell: CellDef, cellSize: number, col: number, row: number): string {
  const primitive = getPrimitiveByIndex(cell.type);
  if (!primitive) {
    throw new RenderError(
      "unknown-primitive",
      `Cell type index ${cell.type} has no corresponding entry in the primitive registry.`,
    );
  }

  const segments = primitive.build(cellSize, cell.rotation, cell.invert);
  const offsetX = col * cellSize;
  const offsetY = row * cellSize;
  return segments.map((segment) => segmentToPathFragment(segment, offsetX, offsetY)).join(" ");
}

/**
 * Decodes a shape ID and renders it as a single, well-formed SVG document
 * string: one `<svg>` element (sized to `opts.size`, default 256×256) and
 * one `<path>` element whose `d` attribute concatenates every cell's
 * path-segment commands, each positioned at that cell's grid offset.
 *
 * @throws {ShapeIdError} propagated as-is if `shapeId` fails to decode (bad
 * format, cell-count mismatch, or checksum failure) — no partial or empty
 * SVG is ever returned.
 * @throws {RenderError} with code `unknown-primitive` if a decoded cell's
 * type index has no corresponding entry in the primitive registry.
 */
export function renderShape(shapeId: string, opts?: RenderShapeOptions): string {
  const shape = decodeShapeId(shapeId);
  const size = opts?.size ?? DEFAULT_SIZE;
  const fill = opts?.fill ?? DEFAULT_FILL;
  const cellSize = size / Math.max(shape.cols, shape.rows);

  const fragments: string[] = [];
  for (let row = 0; row < shape.rows; row++) {
    for (let col = 0; col < shape.cols; col++) {
      const cell = shape.cells[row * shape.cols + col] as CellDef;
      const fragment = cellToPathFragment(cell, cellSize, col, row);
      if (fragment.length > 0) {
        fragments.push(fragment);
      }
    }
  }

  const d = fragments.join(" ");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${size} ${size}"><path d="${d}" fill="${fill}"/></svg>`
  );
}
