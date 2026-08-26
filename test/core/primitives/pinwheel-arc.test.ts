import { describe, expect, it } from "vitest";
import { pinwheelArc } from "../../../src/core/primitives/pinwheel-arc.js";

describe("pinwheelArc", () => {
  it("cuts a concave arc anchored at the bottom-right corner at rotation 0", () => {
    const cellSize = 256;
    const r = cellSize * 0.78;
    const segments = pinwheelArc(cellSize, 0, false);
    expect(segments).toEqual([
      { command: "M", x: cellSize, y: cellSize },
      { command: "L", x: cellSize, y: cellSize - r },
      {
        command: "A",
        rx: r,
        ry: r,
        xAxisRotation: 0,
        largeArcFlag: 0,
        sweepFlag: 0,
        x: cellSize - r,
        y: cellSize,
      },
      { command: "Z" },
    ]);
  });

  it("closes the path", () => {
    expect(pinwheelArc(100, 0, false).at(-1)).toEqual({ command: "Z" });
  });

  it("uses a radius of 0.78 x cellSize, smaller than fillet/bulge's full-cellSize radius", () => {
    const arc = pinwheelArc(100, 0, false).find((s) => s.command === "A");
    expect(arc).toMatchObject({ rx: 78, ry: 78 });
  });

  it("leaves straight stub edges of length cellSize - radius before and after the arc", () => {
    const cellSize = 100;
    const r = cellSize * 0.78;
    const segments = pinwheelArc(cellSize, 0, false);
    const stub = segments.find((s) => s.command === "L");
    expect(stub).toEqual({ command: "L", x: cellSize, y: cellSize - r });

    const arc = segments.find((s) => s.command === "A");
    expect(arc).toMatchObject({ x: cellSize - r, y: cellSize });
  });

  it("flips the arc's sweep flag when inverted", () => {
    const segments = pinwheelArc(100, 0, true);
    const arc = segments.find((s) => s.command === "A");
    expect(arc).toMatchObject({ sweepFlag: 1 });
  });
});
