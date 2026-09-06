import { describe, expect, it } from "vitest";
import { parallelogram } from "../../../src/core/primitives/parallelogram.js";

describe("parallelogram", () => {
  it("is a full-height quad with the top edge sheared right by cellSize/2, at rotation 0", () => {
    expect(parallelogram(100, 0, false)).toEqual([
      { command: "M", x: 50, y: 0 },
      { command: "L", x: 100, y: 0 },
      { command: "L", x: 50, y: 100 },
      { command: "L", x: 0, y: 100 },
      { command: "Z" },
    ]);
  });

  it("closes the path and uses no arcs", () => {
    const segs = parallelogram(100, 0, false);
    expect(segs.at(-1)).toEqual({ command: "Z" });
    expect(segs.some((s) => s.command === "A")).toBe(false);
  });

  it("mirrors to a backslash slant when inverted (top edge sheared left)", () => {
    expect(parallelogram(100, 0, true)).toEqual([
      { command: "M", x: 50, y: 0 },
      { command: "L", x: 0, y: 0 },
      { command: "L", x: 50, y: 100 },
      { command: "L", x: 100, y: 100 },
      { command: "Z" },
    ]);
  });

  it("rotates 90 degrees clockwise: local (50,0) about centre (50,50) -> (100,50)", () => {
    expect(parallelogram(100, 90, false)[0]).toEqual({ command: "M", x: 100, y: 50 });
  });
});
