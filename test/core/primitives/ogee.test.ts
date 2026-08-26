import { describe, expect, it } from "vitest";
import { ogee } from "../../../src/core/primitives/ogee.js";

describe("ogee", () => {
  it("draws a top band closed by two opposite-sweep arcs at rotation 0", () => {
    const cellSize = 80;
    const r = cellSize / 4;
    const mid = cellSize / 2;
    const segments = ogee(cellSize, 0, false);
    expect(segments).toEqual([
      { command: "M", x: 0, y: 0 },
      { command: "L", x: cellSize, y: 0 },
      { command: "L", x: cellSize, y: mid },
      {
        command: "A",
        rx: r,
        ry: r,
        xAxisRotation: 0,
        largeArcFlag: 0,
        sweepFlag: 1,
        x: mid,
        y: mid,
      },
      {
        command: "A",
        rx: r,
        ry: r,
        xAxisRotation: 0,
        largeArcFlag: 0,
        sweepFlag: 0,
        x: 0,
        y: mid,
      },
      { command: "Z" },
    ]);
  });

  it("closes the path", () => {
    expect(ogee(100, 0, false).at(-1)).toEqual({ command: "Z" });
  });

  it("uses two arcs of equal radius (cellSize / 4) with opposite sweep flags, forming an S", () => {
    const arcs = ogee(80, 0, false).filter((s) => s.command === "A");
    expect(arcs).toHaveLength(2);
    expect(arcs[0]).toMatchObject({ rx: 20, ry: 20, sweepFlag: 1 });
    expect(arcs[1]).toMatchObject({ rx: 20, ry: 20, sweepFlag: 0 });
  });

  it("has both arc endpoints at the cell's vertical midpoint", () => {
    const cellSize = 100;
    const mid = cellSize / 2;
    const arcs = ogee(cellSize, 0, false).filter((s) => s.command === "A");
    for (const arc of arcs) {
      expect(arc.y).toBe(mid);
    }
  });

  it("flips both arcs' sweep flags when inverted", () => {
    const arcs = ogee(100, 0, true).filter((s) => s.command === "A");
    expect(arcs[0]).toMatchObject({ sweepFlag: 0 });
    expect(arcs[1]).toMatchObject({ sweepFlag: 1 });
  });
});
