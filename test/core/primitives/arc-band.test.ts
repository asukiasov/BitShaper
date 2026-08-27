import { describe, expect, it } from "vitest";
import { arcBand } from "../../../src/core/primitives/arc-band.js";

describe("arcBand", () => {
  it("bands the top-left corner at rotation 0", () => {
    const cellSize = 256;
    const rOuter = cellSize;
    const rInner = cellSize / 2;
    const segments = arcBand(cellSize, 0, false);
    expect(segments).toEqual([
      { command: "M", x: cellSize, y: 0 },
      {
        command: "A",
        rx: rOuter,
        ry: rOuter,
        xAxisRotation: 0,
        largeArcFlag: 0,
        sweepFlag: 1,
        x: 0,
        y: cellSize,
      },
      { command: "L", x: 0, y: rInner },
      {
        command: "A",
        rx: rInner,
        ry: rInner,
        xAxisRotation: 0,
        largeArcFlag: 0,
        sweepFlag: 0,
        x: rInner,
        y: 0,
      },
      { command: "Z" },
    ]);
  });

  it("closes the path", () => {
    expect(arcBand(100, 0, false).at(-1)).toEqual({ command: "Z" });
  });

  it("produces two arc segments per cell", () => {
    const arcs = arcBand(100, 0, false).filter((s) => s.command === "A");
    expect(arcs).toHaveLength(2);
  });

  it("uses an outer radius of cellSize and an inner radius of cellSize / 2", () => {
    const [outer, inner] = arcBand(128, 0, false).filter((s) => s.command === "A");
    expect(outer).toMatchObject({ rx: 128, ry: 128 });
    expect(inner).toMatchObject({ rx: 64, ry: 64 });
  });

  it("flips both arcs' sweep flags when inverted", () => {
    const [outer, inner] = arcBand(100, 0, true).filter((s) => s.command === "A");
    expect(outer).toMatchObject({ sweepFlag: 0 });
    expect(inner).toMatchObject({ sweepFlag: 1 });
  });
});
