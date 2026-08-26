import { describe, expect, it } from "vitest";
import { cap } from "../../../src/core/primitives/cap.js";

describe("cap", () => {
  it("draws a single semicircular arc spanning the bottom edge at rotation 0", () => {
    const segments = cap(100, 0, false);
    expect(segments).toEqual([
      { command: "M", x: 0, y: 100 },
      {
        command: "A",
        rx: 50,
        ry: 50,
        xAxisRotation: 0,
        largeArcFlag: 0,
        sweepFlag: 1,
        x: 100,
        y: 100,
      },
      { command: "Z" },
    ]);
  });

  it("closes the path", () => {
    expect(cap(100, 0, false).at(-1)).toEqual({ command: "Z" });
  });

  it("uses exactly one arc segment, with radius equal to half the cell size", () => {
    const arcs = cap(64, 0, false).filter((s) => s.command === "A");
    expect(arcs).toHaveLength(1);
    expect(arcs[0]).toMatchObject({ rx: 32, ry: 32 });
  });

  it("flips the arc's sweep flag when inverted", () => {
    const segments = cap(100, 0, true);
    const arc = segments.find((s) => s.command === "A");
    expect(arc).toMatchObject({ sweepFlag: 0 });
  });
});
