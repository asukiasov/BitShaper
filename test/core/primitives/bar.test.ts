import { describe, expect, it } from "vitest";
import { bar } from "../../../src/core/primitives/bar.js";

describe("bar", () => {
  it("is a centred horizontal band of full width and half-cell thickness, at rotation 0", () => {
    expect(bar(100, 0, false)).toEqual([
      { command: "M", x: 0, y: 25 },
      { command: "L", x: 100, y: 25 },
      { command: "L", x: 100, y: 75 },
      { command: "L", x: 0, y: 75 },
      { command: "Z" },
    ]);
  });

  it("closes the path and uses no arcs", () => {
    const segs = bar(100, 0, false);
    expect(segs.at(-1)).toEqual({ command: "Z" });
    expect(segs.some((s) => s.command === "A")).toBe(false);
  });

  it("becomes a vertical band under 90 degree rotation", () => {
    // local (0,25) about centre (50,50) rotated 90deg clockwise -> (75,0)
    expect(bar(100, 90, false)[0]).toEqual({ command: "M", x: 75, y: 0 });
  });

  it("occupies the same vertices when inverted (symmetric about the vertical axis)", () => {
    const vertices = (invert: boolean) =>
      bar(100, 0, invert)
        .filter((s): s is Extract<typeof s, { x: number }> => s.command !== "Z")
        .map((s) => `${s.x},${s.y}`)
        .sort();
    expect(vertices(true)).toEqual(vertices(false));
  });
});
