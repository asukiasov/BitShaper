import { describe, expect, it } from "vitest";
import { gable } from "../../../src/core/primitives/gable.js";

describe("gable", () => {
  it("is a triangle with its base on the bottom edge and apex at the top-edge midpoint, at rotation 0", () => {
    expect(gable(100, 0, false)).toEqual([
      { command: "M", x: 0, y: 100 },
      { command: "L", x: 100, y: 100 },
      { command: "L", x: 50, y: 0 },
      { command: "Z" },
    ]);
  });

  it("closes the path and uses no arcs", () => {
    const segs = gable(100, 0, false);
    expect(segs.at(-1)).toEqual({ command: "Z" });
    expect(segs.some((s) => s.command === "A")).toBe(false);
  });

  it("points its apex the other way under 180 degree rotation", () => {
    // local apex (50,0) about centre (50,50) rotated 180 -> (50,100)
    expect(gable(100, 180, false)).toContainEqual({ command: "L", x: 50, y: 100 });
  });

  it("occupies the same vertices when inverted (symmetric about the vertical axis)", () => {
    const vertices = (invert: boolean) =>
      gable(100, 0, invert)
        .filter((s): s is Extract<typeof s, { x: number }> => s.command !== "Z")
        .map((s) => `${s.x},${s.y}`)
        .sort();
    expect(vertices(true)).toEqual(vertices(false));
  });
});
