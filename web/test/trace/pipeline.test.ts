import { decodeShapeId } from "bitshaper";
import { describe, expect, it } from "vitest";
import type { Mask } from "../../src/trace/mask.js";
import { reconstruct } from "../../src/trace/pipeline.js";

const SUB_RES = 2;

function mask(width: number, rows: readonly (readonly number[])[]): Mask {
  return { width, height: rows.length, data: Uint8Array.from(rows.flat()) };
}

const EMPTY_CELL = mask(SUB_RES, [
  [0, 0],
  [0, 0],
]);
const FULL_CELL = mask(SUB_RES, [
  [1, 1],
  [1, 1],
]);

/** flat index 0 -> empty primitive; flat index 9 -> some non-empty primitive. */
const candidates: ReadonlyMap<number, Mask> = new Map([
  [0, EMPTY_CELL],
  [9, FULL_CELL],
]);

describe("reconstruct", () => {
  it("splits into gridN × gridN cells in row-major order and matches each", () => {
    // 4×4 mask, gridN 2: only the top-right quadrant is foreground.
    const squaredMask = mask(4, [
      [0, 0, 1, 1],
      [0, 0, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);

    const { shapeId, cellMasks } = reconstruct({
      squaredMask,
      gridN: 2,
      candidates,
      subRes: SUB_RES,
    });

    expect(cellMasks).toHaveLength(4);

    const shape = decodeShapeId(shapeId);
    // Row-major: [top-left empty, top-right full, bottom-left empty, bottom-right empty].
    expect(shape.cells).toHaveLength(4);
    expect(shape.cells[0]).toEqual({ type: 0, rotation: 0, invert: false });
    expect(shape.cells[1]).toEqual({ type: 1, rotation: 0, invert: true });
    expect(shape.cells[2]).toEqual({ type: 0, rotation: 0, invert: false });
    expect(shape.cells[3]).toEqual({ type: 0, rotation: 0, invert: false });
  });

  it("handles a mask side that does not divide evenly by gridN", () => {
    // 5×5 mask, gridN 2: boundaries round to 0/3/5, so tiles are 3px and 2px
    // wide/tall and the last column/row exercises the clamped sample index.
    const squaredMask = mask(5, [
      [1, 1, 1, 0, 0],
      [1, 1, 1, 0, 0],
      [1, 1, 1, 0, 0],
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0],
    ]);

    const { shapeId, cellMasks } = reconstruct({
      squaredMask,
      gridN: 2,
      candidates,
      subRes: SUB_RES,
    });

    expect(cellMasks).toHaveLength(4);
    const shape = decodeShapeId(shapeId);
    expect(shape.cells).toHaveLength(4);
    expect(shape.cols).toBe(2);
    expect(shape.rows).toBe(2);
  });

  it("is deterministic for the same input", () => {
    const squaredMask = mask(4, [
      [1, 1, 0, 0],
      [1, 1, 0, 0],
      [0, 0, 1, 1],
      [0, 0, 1, 1],
    ]);
    const input = { squaredMask, gridN: 2, candidates, subRes: SUB_RES } as const;
    expect(reconstruct(input).shapeId).toBe(reconstruct(input).shapeId);
  });

  it("maps an all-empty mask to an all-empty grid (flat index 0)", () => {
    const squaredMask = mask(6, [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ]);

    const { shapeId, cellMasks } = reconstruct({
      squaredMask,
      gridN: 3,
      candidates,
      subRes: SUB_RES,
    });

    expect(cellMasks).toHaveLength(9);
    const shape = decodeShapeId(shapeId);
    expect(shape.cells).toHaveLength(9);
    for (const cell of shape.cells) {
      expect(cell).toEqual({ type: 0, rotation: 0, invert: false });
    }
  });
});
