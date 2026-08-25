import { describe, expect, it } from "vitest";
import { ShapeIdError, decodeShapeId, encodeShapeId } from "../../src/core/id.js";
import type { CellDef, Rotation, ShapeDef } from "../../src/core/types.js";

/** Builds a ShapeDef of `cols x rows` filled with the same cell definition. */
function uniformShape(cols: number, rows: number, cell: CellDef): ShapeDef {
  return {
    cols,
    rows,
    cells: Array.from({ length: cols * rows }, () => cell),
  };
}

const CELL_A: CellDef = { type: 0, rotation: 0, invert: false };

describe("encodeShapeId", () => {
  it("produces the expected format for a 1x1 shape", () => {
    const shape = uniformShape(1, 1, CELL_A);
    const id = encodeShapeId(shape);
    expect(id).toMatch(/^BS-1X1-[0-9A-Za-z][0-9A-Za-z]$/);
  });

  it("produces a payload of exactly cols x rows characters", () => {
    const shape: ShapeDef = {
      cols: 3,
      rows: 2,
      cells: Array.from({ length: 6 }, (_, i) => ({
        type: 1,
        rotation: ((i % 4) * 90) as Rotation,
        invert: i % 2 === 0,
      })),
    };
    const id = encodeShapeId(shape);
    const match = id.match(/^BS-3X2-([0-9A-Za-z]+)([0-9A-Za-z])$/);
    expect(match).not.toBeNull();
    expect(match?.[1]).toHaveLength(6);
  });

  it("encodes identical cells to identical payload characters regardless of position", () => {
    const cellX: CellDef = { type: 2, rotation: 90, invert: true };
    const shape = uniformShape(2, 2, cellX);
    const id = encodeShapeId(shape);
    const payload = id.split("-")[2]?.slice(0, -1) ?? "";
    const chars = new Set(payload.split(""));
    expect(chars.size).toBe(1);
  });

  it("is canonical: identical geometry always yields identical IDs", () => {
    const shapeA = uniformShape(2, 3, { type: 1, rotation: 180, invert: false });
    const shapeB = uniformShape(2, 3, { type: 1, rotation: 180, invert: false });
    expect(encodeShapeId(shapeA)).toBe(encodeShapeId(shapeB));
  });

  it("encoding the same shape twice yields the same ID", () => {
    const shape = uniformShape(4, 4, { type: 3, rotation: 270, invert: true });
    expect(encodeShapeId(shape)).toBe(encodeShapeId(shape));
  });

  it("succeeds when a cell's flat index is exactly at the ceiling (61)", () => {
    // type=7, rotation=270 (code 3), invert=true => 7*8 + 3*2 + 1 = 63... too high.
    // Find a combination that lands exactly at 61: type=7, rotation=180 (code 2), invert=1 => 56+4+1=61
    const shape = uniformShape(1, 1, { type: 7, rotation: 180, invert: true });
    expect(() => encodeShapeId(shape)).not.toThrow();
    const id = encodeShapeId(shape);
    const payload = id.split("-")[2]?.slice(0, -1) ?? "";
    expect(payload).toBe("z");
  });

  it("throws a ShapeIdError with primitive-ceiling-overflow code when a cell's index exceeds 61", () => {
    // type=7, rotation=270 (code 3), invert=1 => 56 + 6 + 1 = 63 > 61
    const shape = uniformShape(1, 1, { type: 7, rotation: 270, invert: true });
    expect(() => encodeShapeId(shape)).toThrow(ShapeIdError);
    try {
      encodeShapeId(shape);
      throw new Error("expected encodeShapeId to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ShapeIdError);
      expect((err as ShapeIdError).code).toBe("primitive-ceiling-overflow");
    }
  });

  it("rejects grid dimensions outside 1-8 with a descriptive error", () => {
    const shape = uniformShape(9, 9, CELL_A);
    expect(() => encodeShapeId(shape)).toThrow(ShapeIdError);
    try {
      encodeShapeId(shape);
      throw new Error("expected encodeShapeId to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ShapeIdError);
      expect((err as ShapeIdError).code).toBe("invalid-shape-def");
    }
  });

  it("rejects a cells array whose length does not equal cols x rows", () => {
    const shape: ShapeDef = { cols: 2, rows: 2, cells: [CELL_A, CELL_A, CELL_A] };
    expect(() => encodeShapeId(shape)).toThrow(ShapeIdError);
    try {
      encodeShapeId(shape);
      throw new Error("expected encodeShapeId to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(ShapeIdError);
      expect((err as ShapeIdError).code).toBe("invalid-shape-def");
    }
  });
});

describe("decodeShapeId", () => {
  it("decodes a well-formed ID without a format error", () => {
    const shape = uniformShape(2, 2, CELL_A);
    const id = encodeShapeId(shape);
    expect(() => decodeShapeId(id)).not.toThrow();
  });

  it("returns a ShapeDef with matching grid dimensions", () => {
    const shape = uniformShape(3, 5, { type: 1, rotation: 90, invert: false });
    const id = encodeShapeId(shape);
    const decoded = decodeShapeId(id);
    expect(decoded.cols).toBe(3);
    expect(decoded.rows).toBe(5);
  });

  it("rejects a string not matching the ID pattern", () => {
    expect(() => decodeShapeId("not-a-shape-id")).toThrow(ShapeIdError);
    try {
      decodeShapeId("not-a-shape-id");
    } catch (err) {
      expect((err as ShapeIdError).code).toBe("bad-format");
    }
  });

  it("rejects cols/rows outside 1-8", () => {
    expect(() => decodeShapeId("BS-9X1-000000000A")).toThrow(ShapeIdError);
    try {
      decodeShapeId("BS-9X1-000000000A");
    } catch (err) {
      expect((err as ShapeIdError).code).toBe("bad-format");
    }
  });

  it("rejects a payload whose length does not equal cols x rows", () => {
    // cols=2, rows=2 requires 4 payload chars; give 3 + checksum.
    expect(() => decodeShapeId("BS-2X2-000A")).toThrow(ShapeIdError);
    try {
      decodeShapeId("BS-2X2-000A");
    } catch (err) {
      expect((err as ShapeIdError).code).toBe("payload-length-mismatch");
    }
  });

  it("rejects an ID with a checksum that does not match the payload", () => {
    const shape = uniformShape(1, 1, CELL_A);
    const id = encodeShapeId(shape);
    // Flip the checksum character to something guaranteed wrong.
    const corrupted = `${id.slice(0, -1)}${id.at(-1) === "0" ? "1" : "0"}`;
    expect(() => decodeShapeId(corrupted)).toThrow(ShapeIdError);
    try {
      decodeShapeId(corrupted);
    } catch (err) {
      expect((err as ShapeIdError).code).toBe("checksum-mismatch");
    }
  });

  it("rejects a non-canonical dimension string with a leading zero", () => {
    expect(() => decodeShapeId("BS-01X01-88")).toThrow(ShapeIdError);
    try {
      decodeShapeId("BS-01X01-88");
    } catch (err) {
      expect((err as ShapeIdError).code).toBe("bad-format");
    }
  });

  it("does not return a partial ShapeDef when checksum validation fails", () => {
    const shape = uniformShape(1, 1, CELL_A);
    const id = encodeShapeId(shape);
    const corrupted = `${id.slice(0, -1)}${id.at(-1) === "0" ? "1" : "0"}`;
    let thrown = false;
    let result: ShapeDef | undefined;
    try {
      result = decodeShapeId(corrupted);
    } catch {
      thrown = true;
    }
    expect(thrown).toBe(true);
    expect(result).toBeUndefined();
  });
});

describe("round-trip: encode/decode across grid sizes 1x1 through 8x8", () => {
  for (let cols = 1; cols <= 8; cols++) {
    for (let rows = 1; rows <= 8; rows++) {
      it(`round-trips a ${cols}x${rows} shape`, () => {
        const cells: CellDef[] = Array.from({ length: cols * rows }, (_, i) => ({
          type: i % 4, // stay within registry (empty/fill/fillet/bulge) and safely under ceiling
          rotation: ((i % 4) * 90) as Rotation,
          invert: i % 2 === 0,
        }));
        const shape: ShapeDef = { cols, rows, cells };

        const id = encodeShapeId(shape);
        const decoded = decodeShapeId(id);
        expect(decoded).toEqual(shape);

        // decode(encode(shape)) then re-encode should reproduce the same ID.
        expect(encodeShapeId(decoded)).toBe(id);
      });
    }
  }

  it("round-trips encode(decode(id)) === id for a representative ID", () => {
    const shape: ShapeDef = {
      cols: 8,
      rows: 8,
      cells: Array.from({ length: 64 }, (_, i) => ({
        type: i % 4,
        rotation: ((i % 4) * 90) as Rotation,
        invert: i % 3 === 0,
      })),
    };
    const id = encodeShapeId(shape);
    const decoded = decodeShapeId(id);
    expect(encodeShapeId(decoded)).toBe(id);
  });
});
