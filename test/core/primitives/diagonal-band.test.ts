import { describe, expect, it } from "vitest";
import { diagonalBand } from "../../../src/core/primitives/diagonal-band.js";

describe("diagonalBand", () => {
  it("bands the cell from the top-left corner to the bottom-right corner at rotation 0", () => {
    const cellSize = 256;
    const w = cellSize / 2;
    expect(diagonalBand(cellSize, 0, false)).toEqual([
      { command: "M", x: 0, y: 0 },
      { command: "L", x: cellSize, y: w },
      { command: "L", x: cellSize, y: cellSize },
      { command: "L", x: 0, y: w },
      { command: "Z" },
    ]);
  });

  it("closes the path", () => {
    expect(diagonalBand(100, 0, false).at(-1)).toEqual({ command: "Z" });
  });

  it("emits no arc segments", () => {
    expect(diagonalBand(100, 0, false).some((s) => s.command === "A")).toBe(false);
  });

  it("has a vertical thickness of cellSize / 2 (parallel long edges)", () => {
    const segments = diagonalBand(128, 0, false);
    // Long edges: (0,0)->(128,64) and (0,64)->(128,128); both rise 64 over run 128.
    expect(segments[1]).toMatchObject({ x: 128, y: 64 });
    expect(segments[3]).toMatchObject({ x: 0, y: 64 });
  });

  it("mirrors to the opposite diagonal when inverted", () => {
    const [m, l1] = diagonalBand(128, 0, true);
    expect(m).toEqual({ command: "M", x: 128, y: 0 });
    expect(l1).toEqual({ command: "L", x: 0, y: 64 });
  });
});
