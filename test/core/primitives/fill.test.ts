import { describe, expect, it } from "vitest";
import { fill } from "../../../src/core/primitives/fill.js";

describe("fill", () => {
  it("traces the full unit square's four corners at rotation 0", () => {
    const segments = fill(100, 0, false);
    expect(segments).toEqual([
      { command: "M", x: 0, y: 0 },
      { command: "L", x: 100, y: 0 },
      { command: "L", x: 100, y: 100 },
      { command: "L", x: 0, y: 100 },
      { command: "Z" },
    ]);
  });

  it("closes the path", () => {
    const segments = fill(100, 0, false);
    expect(segments.at(-1)).toEqual({ command: "Z" });
  });

  it("is visually unchanged (same corner set) under rotation, since a square is rotationally symmetric", () => {
    const rotated = fill(100, 90, false);
    const corners = rotated.filter((s) => s.command === "M" || s.command === "L");
    const xs = corners.map((c) => (c as { x: number }).x).sort();
    const ys = corners.map((c) => (c as { y: number }).y).sort();
    expect(xs).toEqual([0, 0, 100, 100]);
    expect(ys).toEqual([0, 0, 100, 100]);
  });
});
