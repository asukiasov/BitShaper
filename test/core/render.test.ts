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

describe("renderShape: ramp modifier", () => {
  const CIRCLE_CELL: CellDef = { type: 4, rotation: 0, invert: false };
  const pathData = (svg: string): string =>
    (svg.match(/ d="([^"]+)"/) as RegExpMatchArray)[1] as string;
  const numbersIn = (d: string): number[] => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

  it("renders a single well-formed svg with one path", () => {
    const id = encodeShapeId({
      ...uniformShape(4, 4, CIRCLE_CELL),
      ramp: { axis: "column", curve: "linear", tracks: [{ param: "scaleX", from: 0.2, to: 1 }] },
    });
    const svg = renderShape(id);
    expect(svg.match(/<svg/g)).toHaveLength(1);
    expect(svg.match(/<path/g)).toHaveLength(1);
  });

  it("flattens arcs to polylines in ramped cells but not otherwise", () => {
    const base = uniformShape(2, 2, CIRCLE_CELL);
    expect(pathData(renderShape(encodeShapeId(base)))).toContain("A");

    const ramped = encodeShapeId({
      ...base,
      ramp: { axis: "column", curve: "linear", tracks: [{ param: "scale", from: 0.5, to: 1 }] },
    });
    expect(pathData(renderShape(ramped))).not.toContain("A");
  });

  it("shrinks a scaled-down cell toward its own center", () => {
    // 1x1 grid, column axis -> t = 0 -> scale resolves to `from` (0.5).
    const id = encodeShapeId({
      ...uniformShape(1, 1, FILL_CELL),
      ramp: { axis: "column", curve: "linear", tracks: [{ param: "scale", from: 0.5, to: 1 }] },
    });
    const nums = numbersIn(pathData(renderShape(id)));
    const xs = nums.filter((_, i) => i % 2 === 0);
    const ys = nums.filter((_, i) => i % 2 === 1);
    // cell is 256 wide, center (128,128); a ~0.5 scale shrinks it but keeps it centered.
    expect(Math.min(...xs)).toBeGreaterThan(0);
    expect(Math.max(...xs)).toBeLessThan(256);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(180);
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(128);
    expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(128);
  });

  it("rotates a cell by a non-90-degree angle", () => {
    const plain = numbersIn(pathData(renderShape(encodeShapeId(uniformShape(1, 1, FILL_CELL)))));
    // every coordinate of an un-ramped fill is 0 or 256
    expect(plain.every((n) => n === 0 || n === 256)).toBe(true);

    const id = encodeShapeId({
      ...uniformShape(1, 1, FILL_CELL),
      ramp: { axis: "column", curve: "linear", tracks: [{ param: "angle", from: 45, to: 45 }] },
    });
    const rotated = numbersIn(pathData(renderShape(id)));
    expect(rotated.some((n) => n !== 0 && n !== 256 && n !== 128)).toBe(true);
  });

  it("leaves empty cells empty under a ramp", () => {
    const shape: ShapeDef = {
      cols: 2,
      rows: 1,
      cells: [FILL_CELL, { type: 0, rotation: 0, invert: false }],
      ramp: { axis: "column", curve: "linear", tracks: [{ param: "scale", from: 0.5, to: 1 }] },
    };
    const d = pathData(renderShape(encodeShapeId(shape)));
    expect(d.match(/M/g)).toHaveLength(1); // only the fill cell contributes
  });

  it("is deterministic and covers every cell", () => {
    const id = encodeShapeId({
      ...uniformShape(4, 4, CIRCLE_CELL),
      ramp: { axis: "column", curve: "linear", tracks: [{ param: "scaleX", from: 0.2, to: 1 }] },
    });
    const d = pathData(renderShape(id));
    expect(pathData(renderShape(id))).toBe(d);
    expect(d.match(/M/g)).toHaveLength(16);
  });

  it("surfaces a malformed ramp block as a decode error", () => {
    const base = encodeShapeId(uniformShape(2, 2, FILL_CELL));
    expect(() => renderShape(`${base}~0021050`)).toThrow(ShapeIdError);
  });
});
