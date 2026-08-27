import { describe, expect, it } from "vitest";
import { leaf } from "../../../src/core/primitives/leaf.js";

describe("leaf", () => {
  it("traces a lens between the top-right and bottom-left corners at rotation 0", () => {
    const cellSize = 256;
    expect(leaf(cellSize, 0, false)).toEqual([
      { command: "M", x: cellSize, y: 0 },
      {
        command: "A",
        rx: cellSize,
        ry: cellSize,
        xAxisRotation: 0,
        largeArcFlag: 0,
        sweepFlag: 1,
        x: 0,
        y: cellSize,
      },
      {
        command: "A",
        rx: cellSize,
        ry: cellSize,
        xAxisRotation: 0,
        largeArcFlag: 0,
        sweepFlag: 1,
        x: cellSize,
        y: 0,
      },
      { command: "Z" },
    ]);
  });

  it("closes the path", () => {
    expect(leaf(100, 0, false).at(-1)).toEqual({ command: "Z" });
  });

  it("uses two arc segments of radius cellSize", () => {
    const arcs = leaf(128, 0, false).filter((s) => s.command === "A");
    expect(arcs).toHaveLength(2);
    for (const arc of arcs) {
      expect(arc).toMatchObject({ rx: 128, ry: 128 });
    }
  });

  it("flips both arc sweep flags when inverted", () => {
    const arcs = leaf(128, 0, true).filter((s) => s.command === "A");
    expect(arcs.every((s) => s.command === "A" && s.sweepFlag === 0)).toBe(true);
  });
});
