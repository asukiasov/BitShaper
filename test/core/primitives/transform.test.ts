import { describe, expect, it } from "vitest";
import {
  transformPathSegment,
  transformPoint,
  transformSweepFlag,
} from "../../../src/core/primitives/transform.js";

describe("transformPoint", () => {
  it("leaves a point unchanged at rotation 0 with no invert", () => {
    expect(transformPoint({ x: 10, y: 0 }, 100, 0, false)).toEqual({ x: 10, y: 0 });
  });

  it("mirrors a point horizontally within the cell when inverted", () => {
    // x=10 within a 100-wide cell mirrors to x=90; y is unaffected.
    expect(transformPoint({ x: 10, y: 30 }, 100, 0, true)).toEqual({ x: 90, y: 30 });
  });

  it("rotates a point 90 degrees clockwise about the cell center", () => {
    // top-right corner (100,0) of a 100x100 cell rotates to bottom-right (100,100)
    const result = transformPoint({ x: 100, y: 0 }, 100, 90, false);
    expect(result.x).toBeCloseTo(100);
    expect(result.y).toBeCloseTo(100);
  });

  it("rotates a point 180 degrees about the cell center", () => {
    const result = transformPoint({ x: 0, y: 0 }, 100, 180, false);
    expect(result.x).toBeCloseTo(100);
    expect(result.y).toBeCloseTo(100);
  });

  it("rotates a point 270 degrees clockwise about the cell center", () => {
    const result = transformPoint({ x: 100, y: 0 }, 100, 270, false);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(0);
  });

  it("applies invert before rotation", () => {
    // (10, 0) inverted -> (90, 0), then rotated 90 cw about center -> (100, 90)
    const result = transformPoint({ x: 10, y: 0 }, 100, 90, true);
    expect(result.x).toBeCloseTo(100);
    expect(result.y).toBeCloseTo(90);
  });
});

describe("transformSweepFlag", () => {
  it("leaves the sweep flag unchanged when not inverted", () => {
    expect(transformSweepFlag(1, false)).toBe(1);
    expect(transformSweepFlag(0, false)).toBe(0);
  });

  it("flips the sweep flag when inverted", () => {
    expect(transformSweepFlag(1, true)).toBe(0);
    expect(transformSweepFlag(0, true)).toBe(1);
  });
});

describe("transformPathSegment", () => {
  it("passes a Z segment through unchanged", () => {
    expect(transformPathSegment({ command: "Z" }, 100, 90, true)).toEqual({ command: "Z" });
  });

  it("transforms M/L segment coordinates", () => {
    const result = transformPathSegment({ command: "L", x: 10, y: 0 }, 100, 0, true);
    expect(result).toEqual({ command: "L", x: 90, y: 0 });
  });

  it("transforms an A segment's endpoint and flips its sweep flag when inverted", () => {
    const result = transformPathSegment(
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
      100,
      0,
      true,
    );
    expect(result).toEqual({
      command: "A",
      rx: 100,
      ry: 100,
      xAxisRotation: 0,
      largeArcFlag: 0,
      sweepFlag: 0,
      x: 100,
      y: 100,
    });
  });
});
