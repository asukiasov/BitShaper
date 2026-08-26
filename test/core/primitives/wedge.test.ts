import { describe, expect, it } from "vitest";
import { wedge } from "../../../src/core/primitives/wedge.js";

describe("wedge", () => {
  it("cuts a straight diagonal from top-left to bottom-right at rotation 0", () => {
    const segments = wedge(100, 0, false);
    expect(segments).toEqual([
      { command: "M", x: 0, y: 0 },
      { command: "L", x: 100, y: 0 },
      { command: "L", x: 100, y: 100 },
      { command: "Z" },
    ]);
  });

  it("closes the path", () => {
    expect(wedge(100, 0, false).at(-1)).toEqual({ command: "Z" });
  });

  it("uses no arc segments (a straight-line cut, unlike fillet/bulge)", () => {
    const segments = wedge(100, 0, false);
    expect(segments.some((s) => s.command === "A")).toBe(false);
  });

  it("rotates the triangle 90 degrees clockwise", () => {
    const segments = wedge(100, 90, false);
    // (0,0) about center (50,50) rotated 90deg clockwise -> (100,0)
    expect(segments[0]).toEqual({ command: "M", x: 100, y: 0 });
  });

  it("mirrors horizontally when inverted", () => {
    const segments = wedge(100, 0, true);
    // (0,0) mirrored across x=50 -> (100,0)
    expect(segments[0]).toEqual({ command: "M", x: 100, y: 0 });
  });
});
