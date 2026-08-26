import { describe, expect, it } from "vitest";
import { circle } from "../../../src/core/primitives/circle.js";

describe("circle", () => {
  it("draws a full circle of diameter cellSize, centered in the cell, at rotation 0", () => {
    const segments = circle(100, 0, false);
    expect(segments).toEqual([
      { command: "M", x: 0, y: 50 },
      {
        command: "A",
        rx: 50,
        ry: 50,
        xAxisRotation: 0,
        largeArcFlag: 1,
        sweepFlag: 0,
        x: 100,
        y: 50,
      },
      {
        command: "A",
        rx: 50,
        ry: 50,
        xAxisRotation: 0,
        largeArcFlag: 1,
        sweepFlag: 0,
        x: 0,
        y: 50,
      },
      { command: "Z" },
    ]);
  });

  it("closes the path", () => {
    expect(circle(100, 0, false).at(-1)).toEqual({ command: "Z" });
  });

  it("uses a radius equal to half the cell size, at every rotation", () => {
    for (const rotation of [0, 90, 180, 270] as const) {
      const arcs = circle(64, rotation, false).filter((s) => s.command === "A");
      expect(arcs).toHaveLength(2);
      for (const arc of arcs) {
        expect(arc).toMatchObject({ rx: 32, ry: 32 });
      }
    }
  });

  it("keeps every point on the circle equidistant (radius) from the cell center, regardless of rotation", () => {
    const cellSize = 100;
    const center = cellSize / 2;
    for (const rotation of [0, 90, 180, 270] as const) {
      const segments = circle(cellSize, rotation, false);
      for (const segment of segments) {
        if (segment.command === "M" || segment.command === "L" || segment.command === "A") {
          const distance = Math.hypot(segment.x - center, segment.y - center);
          expect(distance).toBeCloseTo(center, 10);
        }
      }
    }
  });

  it("flips the arcs' sweep flags when inverted", () => {
    const segments = circle(100, 0, true);
    const arcs = segments.filter((s) => s.command === "A");
    for (const arc of arcs) {
      expect(arc).toMatchObject({ sweepFlag: 1 });
    }
  });
});
