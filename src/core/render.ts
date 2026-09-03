import { decodeShapeId } from "./id.js";
import type { PathSegment } from "./primitives/transform.js";
import { applyRampTransform } from "./ramp-transform.js";
import { resolveCellTransform } from "./ramp.js";
import { getPrimitiveByIndex } from "./registry.js";
import type { CellDef, Ramp } from "./types.js";

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
  /**
   * When `true`, the shape's single `<path>` is emitted inside an SVG
   * `<pattern>` and painted across the `<rect>` viewport, so the output tiles
   * seamlessly as an infinite repeating fill. In tile mode the repeat unit
   * (see {@link tileSize}) — not {@link size} — sets the drawn cell size, and
   * the viewport defaults to 3× the unit so the repetition is visible; pass
   * {@link size} to widen or narrow the viewport. Only meaningful for shapes
   * that {@link isTileable}; a non-tileable shape still renders, with seams.
   */
  readonly tile?: boolean;
  /**
   * Repeat-unit extent (user units, longer grid axis) when {@link tile} is
   * set. Defaults to 256. The unit's other axis scales with the grid's aspect.
   */
  readonly tileSize?: number;
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

/** Per-shape context a cell needs to resolve its ramp transform. */
interface RampContext {
  readonly ramp: Ramp;
  readonly cols: number;
  readonly rows: number;
}

/** Builds one cell's path `d` fragment, translated to its grid offset. */
function cellToPathFragment(
  cell: CellDef,
  cellSize: number,
  col: number,
  row: number,
  rampContext?: RampContext,
): string {
  const primitive = getPrimitiveByIndex(cell.type);
  if (!primitive) {
    throw new RenderError(
      "unknown-primitive",
      `Cell type index ${cell.type} has no corresponding entry in the primitive registry.`,
    );
  }

  let segments = primitive.build(cellSize, cell.rotation, cell.invert);
  if (rampContext && segments.length > 0) {
    const transform = resolveCellTransform(
      rampContext.ramp,
      col,
      row,
      rampContext.cols,
      rampContext.rows,
    );
    segments = applyRampTransform(segments, transform, cellSize / 2);
  }

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
 *
 * When the decoded shape carries a `ramp`, each non-empty cell's geometry is
 * additionally scaled/rotated about the cell center by the ramp's resolved
 * per-cell transform (arc segments are flattened to polylines for that cell).
 */
export function renderShape(shapeId: string, opts?: RenderShapeOptions): string {
  const shape = decodeShapeId(shapeId);
  const fill = opts?.fill ?? DEFAULT_FILL;

  // In tile mode the repeat unit — not the viewport — sets the drawn cell size,
  // and the viewport defaults to several repeats so the tiling is actually
  // visible. Outside tile mode the mark fills the viewport as before.
  const tileUnit = opts?.tile ? (opts.tileSize ?? DEFAULT_SIZE) : undefined;
  const drawExtent = tileUnit ?? opts?.size ?? DEFAULT_SIZE;
  const size = opts?.tile ? (opts.size ?? drawExtent * 3) : drawExtent;
  const cellSize = drawExtent / Math.max(shape.cols, shape.rows);
  const rampContext: RampContext | undefined = shape.ramp
    ? { ramp: shape.ramp, cols: shape.cols, rows: shape.rows }
    : undefined;

  const fragments: string[] = [];
  for (let row = 0; row < shape.rows; row++) {
    for (let col = 0; col < shape.cols; col++) {
      const cell = shape.cells[row * shape.cols + col] as CellDef;
      const fragment = cellToPathFragment(cell, cellSize, col, row, rampContext);
      if (fragment.length > 0) {
        fragments.push(fragment);
      }
    }
  }

  const d = fragments.join(" ");
  const open =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" ` +
    `viewBox="0 0 ${size} ${size}">`;

  if (opts?.tile) {
    const unitW = formatNumber(shape.cols * cellSize);
    const unitH = formatNumber(shape.rows * cellSize);
    return (
      `${open}<defs><pattern id="bs-tile" patternUnits="userSpaceOnUse" ` +
      `width="${unitW}" height="${unitH}"><path d="${d}" fill="${fill}"/></pattern></defs>` +
      `<rect width="${size}" height="${size}" fill="url(#bs-tile)"/></svg>`
    );
  }

  return `${open}<path d="${d}" fill="${fill}"/></svg>`;
}
