import { describe, expect, it } from "vitest";
import { fillet } from "../../../src/core/primitives/fillet.js";

describe("fillet", () => {
  it("cuts a concave quarter circle from the top-left corner at rotation 0", () => {
    const segments = fillet(100, 0, false);
    expect(segments).toEqual([
      { command: "M", x: 100, y: 0 },
      {
        command: "A",
        rx: 100,
        ry: 100,
        xAxisRotation: 0,
        largeArcFlag: 0,
        sweepFlag: 1,
        x: 0,
        y: 100,
      },
      { command: "L", x: 100, y: 100 },
      { command: "Z" },
    ]);
  });

  it("closes the path", () => {
    expect(fillet(100, 0, false).at(-1)).toEqual({ command: "Z" });
  });

  it("uses a quarter-circle arc radius equal to the cell size", () => {
    const arc = fillet(64, 0, false).find((s) => s.command === "A");
    expect(arc).toMatchObject({ rx: 64, ry: 64 });
  });

  it("rotates the affected corner 90 degrees clockwise", () => {
    const segments = fillet(100, 90, false);
    // top-left corner treatment rotates so its straight-edge start point
    // (100, 0) moves to (100, 100) about the cell center.
    expect(segments[0]).toEqual({ command: "M", x: 100, y: 100 });
  });

  it("flips the arc's sweep flag when inverted", () => {
    const segments = fillet(100, 0, true);
    const arc = segments.find((s) => s.command === "A");
    expect(arc).toMatchObject({ sweepFlag: 0 });
  });
});
