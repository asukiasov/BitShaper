import { decodeShapeId, listPrimitives } from "bitshaper";
import { describe, expect, it } from "vitest";
import type { Mask } from "../../src/trace/mask.js";
import { assembleShapeId, iou, matchCell } from "../../src/trace/score.js";

function mask(width: number, rows: readonly (readonly number[])[]): Mask {
  return { width, height: rows.length, data: Uint8Array.from(rows.flat()) };
}

const EMPTY = mask(2, [
  [0, 0],
  [0, 0],
]);
const FULL = mask(2, [
  [1, 1],
  [1, 1],
]);
const HALF = mask(2, [
  [1, 1],
  [0, 0],
]);

describe("iou", () => {
  it("computes partial overlap", () => {
    // FULL vs HALF: intersection 2, union 4
    expect(iou(FULL, HALF)).toBeCloseTo(0.5, 6);
  });

  it("returns 1 when both masks are empty", () => {
    expect(iou(EMPTY, EMPTY)).toBe(1);
  });

  it("throws when sizes differ", () => {
    expect(() => iou(FULL, mask(1, [[1]]))).toThrow();
  });
});

describe("matchCell", () => {
  it("returns the argmax IoU key", () => {
    const candidates = new Map<number, Mask>([
      [0, EMPTY],
      [3, HALF],
      [5, FULL],
    ]);
    expect(matchCell(FULL, candidates)).toBe(5);
  });

  it("breaks ties toward the lowest key", () => {
    const candidates = new Map<number, Mask>([
      [7, FULL],
      [2, FULL],
    ]);
    expect(matchCell(FULL, candidates)).toBe(2);
  });
});

describe("assembleShapeId", () => {
  it("round-trips through decodeShapeId with the expected cells", () => {
    // flat index 10 -> type 1, rotation 90, invert false
    const id = assembleShapeId(2, [0, 1, 10, 11]);
    const shape = decodeShapeId(id);
    expect(shape.cols).toBe(2);
    expect(shape.rows).toBe(2);
    expect(shape.cells[2]).toEqual({ type: 1, rotation: 90, invert: false });
    expect(shape.cells[3]).toEqual({ type: 1, rotation: 90, invert: true });
  });

  it("produces a BS2 id when a cell's flat index exceeds 61", () => {
    const typeCount = listPrimitives().length;
    expect(typeCount).toBeGreaterThanOrEqual(8); // need a type whose flat base (>=64) overflows BS1

    const highFlat = 8 * 8; // type 8, rotation 0, invert false -> 64 > 61
    const indices = new Array<number>(64).fill(0);
    indices[0] = highFlat;
    const id = assembleShapeId(8, indices);

    expect(id.startsWith("BS2-")).toBe(true);
    const shape = decodeShapeId(id);
    expect(shape.cells[0]).toEqual({ type: 8, rotation: 0, invert: false });
    expect(shape.cells).toHaveLength(64);
  });
});
