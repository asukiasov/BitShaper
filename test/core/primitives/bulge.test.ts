import { describe, expect, it } from "vitest";
import { bulge } from "../../../src/core/primitives/bulge.js";

describe("bulge", () => {
  it("draws a convex quarter circle from the top-left corner at rotation 0", () => {
    const segments = bulge(100, 0, false);
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
      { command: "L", x: 0, y: 0 },
      { command: "Z" },
    ]);
  });

  it("closes the path", () => {
    expect(bulge(100, 0, false).at(-1)).toEqual({ command: "Z" });
  });

  it("shares the same arc as fillet but closes back through the corner instead of the opposite corner", () => {
    const segments = bulge(100, 0, false);
    const closingLine = segments.find((s) => s.command === "L");
    expect(closingLine).toEqual({ command: "L", x: 0, y: 0 });
  });

  it("flips the arc's sweep flag when inverted", () => {
    const segments = bulge(100, 0, true);
    const arc = segments.find((s) => s.command === "A");
    expect(arc).toMatchObject({ sweepFlag: 0 });
  });
});
