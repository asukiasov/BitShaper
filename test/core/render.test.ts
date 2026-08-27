import { describe, expect, it } from "vitest";
import { ShapeIdError, encodeShapeId } from "../../src/core/id.js";
import { RenderError, renderShape } from "../../src/core/render.js";
import type { CellDef, ShapeDef } from "../../src/core/types.js";

/** Builds a ShapeDef of `cols x rows` filled with the same cell definition. */
function uniformShape(cols: number, rows: number, cell: CellDef): ShapeDef {
  return {
    cols,
    rows,
    cells: Array.from({ length: cols * rows }, () => cell),
  };
}

const FILL_CELL: CellDef = { type: 1, rotation: 0, invert: false };

describe("renderShape", () => {
  it("wraps output in a single well-formed svg element", () => {
    const id = encodeShapeId(uniformShape(1, 1, FILL_CELL));
    const svg = renderShape(id);
    expect(svg).toMatch(/^<svg[^>]*>[\s\S]*<\/svg>$/);
    expect(svg.match(/<svg/g)).toHaveLength(1);
  });

  it("contains a single path element concatenating all cells' segments", () => {
    const id = encodeShapeId(uniformShape(2, 1, FILL_CELL));
    const svg = renderShape(id);
    expect(svg.match(/<path/g)).toHaveLength(1);
  });

  it("positions each cell's path data at its correct grid offset", () => {
    const id = encodeShapeId(uniformShape(2, 1, FILL_CELL));
    const svg = renderShape(id);
    const dMatch = svg.match(/ d="([^"]+)"/);
    expect(dMatch).not.toBeNull();
    const d = dMatch?.[1] ?? "";
    // Default size 256, grid is 2x1 -> cellSize = 256 / max(2,1) = 128.
    // Cell 0 at offset (0,0), cell 1 at offset (128,0).
    expect(d).toContain("M0 0");
    expect(d).toContain("M128 0");
    // Two M commands: one per cell.
    expect(d.match(/M/g)).toHaveLength(2);
  });

  it("uses the default 256x256 size when opts.size is omitted", () => {
    const id = encodeShapeId(uniformShape(1, 1, FILL_CELL));
    const svg = renderShape(id);
    expect(svg).toContain('width="256"');
    expect(svg).toContain('height="256"');
  });

  it("honors a custom opts.size for the root element", () => {
    const id = encodeShapeId(uniformShape(1, 1, FILL_CELL));
    const svg = renderShape(id, { size: 100 });
    expect(svg).toContain('width="100"');
    expect(svg).toContain('height="100"');
  });

  it("honors a custom opts.fill for the path", () => {
    const id = encodeShapeId(uniformShape(1, 1, FILL_CELL));
    const svg = renderShape(id, { fill: "red" });
    expect(svg).toContain('fill="red"');
  });

  it("uses the documented default fill when opts.fill is omitted", () => {
    const id = encodeShapeId(uniformShape(1, 1, FILL_CELL));
    const svg = renderShape(id);
    expect(svg).toContain('fill="currentColor"');
  });

  it("produces no path segments for empty cells but still emits the cell's slot", () => {
    const id = encodeShapeId(uniformShape(1, 1, { type: 0, rotation: 0, invert: false }));
    const svg = renderShape(id);
    const dMatch = svg.match(/ d="([^"]*)"/);
    expect(dMatch?.[1]).toBe("");
  });

  it("propagates the underlying decode error for a badly-formatted id", () => {
    expect(() => renderShape("not-a-shape-id")).toThrow(ShapeIdError);
  });

  it("propagates the underlying decode error for a checksum mismatch", () => {
    const id = encodeShapeId(uniformShape(1, 1, FILL_CELL));
    const corrupted = `${id.slice(0, -1)}${id.at(-1) === "0" ? "1" : "0"}`;
    expect(() => renderShape(corrupted)).toThrow(ShapeIdError);
  });

  it("rejects a decoded cell whose type has no registry entry", () => {
    // type=14 is one past the last registered primitive (0-13).
    const id = encodeShapeId(uniformShape(1, 1, { type: 14, rotation: 0, invert: false }));
    expect(() => renderShape(id)).toThrow(RenderError);
  });

  it("identifies the unknown primitive index in the error", () => {
    const id = encodeShapeId(uniformShape(1, 1, { type: 14, rotation: 0, invert: false }));
    expect(() => renderShape(id)).toThrow(/14/);
  });

  it("renders each of the six newly registered primitives (types 4-9) without error", () => {
    for (let type = 4; type <= 9; type++) {
      const id = encodeShapeId(uniformShape(1, 1, { type, rotation: 0, invert: false }));
      expect(() => renderShape(id)).not.toThrow();
    }
  });

  it("round-trips a shape using step/ogee (types 8/9) at a rotation/invert combination requiring format version 2", () => {
    // type=9 (ogee), rotation=270 (code 3), invert=1 => 9*8 + 3*2 + 1 = 79 > 61, needs version 2.
    const shape = uniformShape(1, 1, { type: 9, rotation: 270, invert: true });
    const id = encodeShapeId(shape);
    expect(id).toMatch(/^BS2-/);
    expect(() => renderShape(id)).not.toThrow();
  });
});
