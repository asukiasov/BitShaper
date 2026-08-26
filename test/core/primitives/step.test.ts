import { describe, expect, it } from "vitest";
import { step } from "../../../src/core/primitives/step.js";
import { wedge } from "../../../src/core/primitives/wedge.js";

describe("step", () => {
  it("cuts a diagonal-jog-diagonal polyline from top-left to bottom-right at rotation 0", () => {
    const cellSize = 80;
    const j = cellSize / 8;
    const mid = cellSize / 2;
    const segments = step(cellSize, 0, false);
    expect(segments).toEqual([
      { command: "M", x: 0, y: 0 },
      { command: "L", x: cellSize, y: 0 },
      { command: "L", x: cellSize, y: cellSize },
      { command: "L", x: mid + j, y: mid },
      { command: "L", x: mid - j, y: mid },
      { command: "Z" },
    ]);
  });

  it("closes the path", () => {
    expect(step(100, 0, false).at(-1)).toEqual({ command: "Z" });
  });

  it("uses no arc segments (a straight-line cut, like wedge)", () => {
    expect(step(100, 0, false).some((s) => s.command === "A")).toBe(false);
  });

  it("has one more segment than wedge's single-line diagonal (the jog adds two points)", () => {
    expect(step(100, 0, false)).toHaveLength(wedge(100, 0, false).length + 2);
  });

  it("keeps the jog symmetric about the cell center", () => {
    const cellSize = 100;
    const mid = cellSize / 2;
    const segments = step(cellSize, 0, false);
    const jogPoints = segments.filter(
      (s) => (s.command === "L" || s.command === "M") && s.y === mid,
    );
    expect(jogPoints).toHaveLength(2);
    const xs = jogPoints.map((p) => (p as { x: number }).x).sort((a, b) => a - b);
    expect(mid - (xs[0] as number)).toBeCloseTo((xs[1] as number) - mid, 10);
  });
});
