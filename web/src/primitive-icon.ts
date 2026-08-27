import { encodeShapeId, renderShape } from "bitshaper";

/**
 * Renders a single primitive (rotation 0, uninverted) as a small standalone
 * SVG string, by encoding it as a 1×1 shape and rendering that. Used by the
 * primitive-usage breakdown and the cell editor's primitive picker.
 */
export function renderPrimitiveIcon(primitiveIndex: number, size = 24): string {
  const id = encodeShapeId({
    cols: 1,
    rows: 1,
    cells: [{ type: primitiveIndex, rotation: 0, invert: false }],
  });
  return renderShape(id, { size });
}
