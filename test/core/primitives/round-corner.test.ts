import { describe, expect, it } from "vitest";
import { roundCorner } from "../../../src/core/primitives/round-corner.js";

describe("roundCorner", () => {
  it("rounds the top-left corner at rotation 0", () => {
    const cellSize = 256;
    const r = cellSize * (25 / 32);
    const segments = roundCorner(cellSize, 0, false);
    expect(segments).toEqual([
      { command: "M", x: r, y: 0 },
      { command: "L", x: cellSize, y: 0 },
      { command: "L", x: cellSize, y: cellSize },
      { command: "L", x: 0, y: cellSize },
      { command: "L", x: 0, y: r },
      {
        command: "A",
        rx: r,
        ry: r,
        xAxisRotation: 0,
        largeArcFlag: 0,
        sweepFlag: 1,
        x: r,
        y: 0,
      },
      { command: "Z" },
    ]);
  });

  it("closes the path", () => {
    expect(roundCorner(100, 0, false).at(-1)).toEqual({ command: "Z" });
  });

  it("uses a radius of 25/32 x cellSize", () => {
    const arc = roundCorner(128, 0, false).find((s) => s.command === "A");
    expect(arc).toMatchObject({ rx: 100, ry: 100 });
  });

  it("outputs the full cell square's other three corners unchanged before the arc", () => {
    const cellSize = 100;
    const segments = roundCorner(cellSize, 0, false);
    const lines = segments.filter((s) => s.command === "L");
    expect(lines).toEqual([
      { command: "L", x: cellSize, y: 0 },
      { command: "L", x: cellSize, y: cellSize },
      { command: "L", x: 0, y: cellSize },
      { command: "L", x: 0, y: cellSize * (25 / 32) },
    ]);
  });

  it("flips the arc's sweep flag when inverted", () => {
    const segments = roundCorner(100, 0, true);
    const arc = segments.find((s) => s.command === "A");
    expect(arc).toMatchObject({ sweepFlag: 0 });
  });
});
