import { describe, expect, it } from "vitest";
import { generateShapeDef, generateShapeId } from "../../src/core/generate.js";
import { decodeShapeId } from "../../src/core/id.js";
import { PRIMITIVE_REGISTRY } from "../../src/core/registry.js";

describe("generateShapeDef", () => {
  it("applies the documented default 4x4 grid when grid is omitted", () => {
    const shape = generateShapeDef("some-seed");
    expect(shape.cols).toBe(4);
    expect(shape.rows).toBe(4);
    expect(shape.cells).toHaveLength(16);
  });

  it("uses the given grid size and produces exactly cols * rows cells", () => {
    const shape = generateShapeDef("some-seed", { cols: 3, rows: 2 });
    expect(shape.cols).toBe(3);
    expect(shape.rows).toBe(2);
    expect(shape.cells).toHaveLength(6);
  });

  it("produces cells whose type is always a valid registry index", () => {
    const shape = generateShapeDef("some-seed", { cols: 4, rows: 4 });
    for (const cell of shape.cells) {
      expect(cell.type).toBeGreaterThanOrEqual(0);
      expect(cell.type).toBeLessThan(PRIMITIVE_REGISTRY.length);
    }
  });

  it("produces cells whose rotation is always one of 0/90/180/270", () => {
    const shape = generateShapeDef("some-seed", { cols: 4, rows: 4 });
    for (const cell of shape.cells) {
      expect([0, 90, 180, 270]).toContain(cell.rotation);
    }
  });

  it("is deterministic for the same string seed and grid", () => {
    const a = generateShapeDef("repeat-me", { cols: 3, rows: 3 });
    const b = generateShapeDef("repeat-me", { cols: 3, rows: 3 });
    expect(a).toEqual(b);
  });

  it("is deterministic for the same numeric seed and grid", () => {
    const a = generateShapeDef(12345, { cols: 3, rows: 3 });
    const b = generateShapeDef(12345, { cols: 3, rows: 3 });
    expect(a).toEqual(b);
  });

  it("generally differs for different seeds", () => {
    const a = generateShapeDef("seed-one", { cols: 4, rows: 4 });
    const b = generateShapeDef("seed-two", { cols: 4, rows: 4 });
    expect(a).not.toEqual(b);
  });
});

describe("generateShapeId", () => {
  it("returns a shape id that decodes back to the same ShapeDef generateShapeDef produced", () => {
    const shape = generateShapeDef("round-trip-seed", { cols: 2, rows: 2 });
    const id = generateShapeId("round-trip-seed", { cols: 2, rows: 2 });
    expect(decodeShapeId(id)).toEqual(shape);
  });

  it("is deterministic for the same seed and grid", () => {
    const idA = generateShapeId("same-seed", { cols: 3, rows: 3 });
    const idB = generateShapeId("same-seed", { cols: 3, rows: 3 });
    expect(idA).toBe(idB);
  });

  it("applies the default grid when omitted", () => {
    const id = generateShapeId("default-grid-seed");
    expect(id).toMatch(/^BS-4X4-/);
  });
});
