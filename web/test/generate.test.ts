import { decodeShapeId, listPrimitives } from "bitshaper";
import { describe, expect, it } from "vitest";
import {
  applyPrimitiveMix,
  generateFilteredShapeId,
  summarizePrimitiveUsage,
} from "../src/generate.js";

const ALL_PRIMITIVE_TYPES = listPrimitives().map((p) => p.index);

describe("generateFilteredShapeId", () => {
  it("is deterministic for the same seed, grid, and primitive mix", () => {
    const a = generateFilteredShapeId("acorn", { cols: 3, rows: 3 }, ALL_PRIMITIVE_TYPES);
    const b = generateFilteredShapeId("acorn", { cols: 3, rows: 3 }, ALL_PRIMITIVE_TYPES);
    expect(b).toBe(a);
  });

  it("produces a shape whose cols/rows match the requested grid", () => {
    const shape = decodeShapeId(
      generateFilteredShapeId("acorn", { cols: 5, rows: 2 }, ALL_PRIMITIVE_TYPES),
    );
    expect(shape.cols).toBe(5);
    expect(shape.rows).toBe(2);
  });

  it("only uses primitive types from the allowed set", () => {
    const allowed = [0, 1];
    const shape = decodeShapeId(generateFilteredShapeId("acorn", { cols: 4, rows: 4 }, allowed));
    for (const cell of shape.cells) {
      expect(allowed).toContain(cell.type);
    }
  });
});

describe("applyPrimitiveMix", () => {
  it("throws when the allowed set is empty", () => {
    expect(() => applyPrimitiveMix({ cols: 1, rows: 1, cells: [] }, [])).toThrow();
  });

  it("leaves already-allowed cells untouched", () => {
    const shape = {
      cols: 2,
      rows: 1,
      cells: [
        { type: 1, rotation: 0, invert: false } as const,
        { type: 1, rotation: 90, invert: true } as const,
      ],
    };
    expect(applyPrimitiveMix(shape, [1]).cells).toEqual(shape.cells);
  });
});

describe("summarizePrimitiveUsage", () => {
  it("counts distinct primitives, ordered by registry index", () => {
    const usage = summarizePrimitiveUsage({
      cols: 2,
      rows: 2,
      cells: [
        { type: 1, rotation: 0, invert: false },
        { type: 0, rotation: 0, invert: false },
        { type: 1, rotation: 0, invert: false },
        { type: 1, rotation: 0, invert: false },
      ],
    });
    expect(usage).toEqual([
      { index: 0, name: "empty", count: 1 },
      { index: 1, name: "fill", count: 3 },
    ]);
  });
});
