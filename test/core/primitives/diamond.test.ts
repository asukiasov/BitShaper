import { describe, expect, it } from "vitest";
import { diamond } from "../../../src/core/primitives/diamond.js";

describe("diamond", () => {
  it("is a square on its point, vertices at the edge midpoints, at rotation 0", () => {
    expect(diamond(100, 0, false)).toEqual([
      { command: "M", x: 50, y: 0 },
      { command: "L", x: 100, y: 50 },
      { command: "L", x: 50, y: 100 },
      { command: "L", x: 0, y: 50 },
      { command: "Z" },
    ]);
  });

  it("closes the path", () => {
    expect(diamond(100, 0, false).at(-1)).toEqual({ command: "Z" });
  });

  it("uses no arc segments", () => {
    expect(diamond(100, 0, false).some((s) => s.command === "A")).toBe(false);
  });

  it("maps onto itself under 90 degree rotation (vertices are the same set)", () => {
    const points = diamond(100, 90, false)
      .filter((s): s is Extract<typeof s, { x: number }> => s.command !== "Z")
      .map((s) => `${s.x},${s.y}`)
      .sort();
    expect(points).toEqual(["0,50", "100,50", "50,0", "50,100"].sort());
  });

  it("occupies the same vertices when inverted (symmetric about the vertical axis)", () => {
    const vertices = (invert: boolean) =>
      diamond(100, 0, invert)
        .filter((s): s is Extract<typeof s, { x: number }> => s.command !== "Z")
        .map((s) => `${s.x},${s.y}`)
        .sort();
    expect(vertices(true)).toEqual(vertices(false));
  });
});
