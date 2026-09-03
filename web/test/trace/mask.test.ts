import { describe, expect, it } from "vitest";
import {
  type Mask,
  binarize,
  contentBounds,
  cropAndSquare,
  downsample,
  guessSwapForeground,
  otsuThreshold,
  toLuminance,
} from "../../src/trace/mask.js";

function mask(width: number, rows: readonly (readonly number[])[]): Mask {
  return {
    width,
    height: rows.length,
    data: Uint8Array.from(rows.flat()),
  };
}

describe("toLuminance", () => {
  it("applies Rec.709 weights and ignores alpha", () => {
    const rgba = new Uint8ClampedArray([255, 255, 255, 0, 0, 0, 0, 255]);
    const lum = toLuminance(rgba, 2, 1);
    expect(lum[0]).toBeCloseTo(255, 3);
    expect(lum[1]).toBeCloseTo(0, 3);
  });
});

describe("otsuThreshold", () => {
  it("splits a bimodal histogram between its two clusters", () => {
    const values: number[] = [];
    for (let i = 0; i < 50; i += 1) values.push(20);
    for (let i = 0; i < 50; i += 1) values.push(220);
    const threshold = otsuThreshold(Float32Array.from(values));
    expect(threshold).toBeGreaterThanOrEqual(20);
    expect(threshold).toBeLessThan(220);
  });
});

describe("binarize", () => {
  it("marks pixels darker than the threshold as foreground", () => {
    const lum = Float32Array.from([10, 200, 128, 127]);
    const result = binarize(lum, 4, 1, 128);
    expect([...result.data]).toEqual([1, 0, 0, 1]);
  });
});

describe("guessSwapForeground", () => {
  it("returns false for a small shape on a blank border", () => {
    const m = mask(4, [
      [0, 0, 0, 0],
      [0, 1, 1, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
    ]);
    expect(guessSwapForeground(m)).toBe(false);
  });

  it("returns true when the border ring is mostly foreground", () => {
    const m = mask(4, [
      [1, 1, 1, 1],
      [1, 0, 0, 1],
      [1, 0, 0, 1],
      [1, 1, 1, 1],
    ]);
    expect(guessSwapForeground(m)).toBe(true);
  });
});

describe("contentBounds", () => {
  it("returns the tight foreground bounding box", () => {
    const m = mask(5, [
      [0, 0, 0, 0, 0],
      [0, 0, 1, 1, 0],
      [0, 0, 1, 1, 0],
      [0, 0, 0, 0, 0],
    ]);
    expect(contentBounds(m)).toEqual({ x: 2, y: 1, width: 2, height: 2 });
  });

  it("returns null for an all-background mask", () => {
    expect(contentBounds(mask(3, [[0, 0, 0]]))).toBeNull();
  });
});

describe("cropAndSquare", () => {
  it("centres a wide crop in a square with background padding", () => {
    const m = mask(4, [
      [0, 0, 0, 0],
      [0, 1, 1, 1],
      [0, 0, 0, 0],
    ]);
    const squared = cropAndSquare(m, { x: 1, y: 1, width: 3, height: 1 });
    expect(squared.width).toBe(3);
    expect(squared.height).toBe(3);
    expect([...squared.data]).toEqual([0, 0, 0, 1, 1, 1, 0, 0, 0]);
  });
});

describe("downsample", () => {
  it("area-averages blocks and thresholds at 0.5", () => {
    const m = mask(4, [
      [1, 1, 0, 0],
      [1, 1, 0, 0],
      [1, 0, 1, 1],
      [0, 0, 1, 1],
    ]);
    const small = downsample(m, 2);
    // top-left block fully ink -> 1; top-right empty -> 0;
    // bottom-left 1/4 ink -> 0; bottom-right fully ink -> 1
    expect([...small.data]).toEqual([1, 0, 0, 1]);
  });

  it("keeps a mask unchanged when downsampled to its own size", () => {
    const m = mask(2, [
      [1, 0],
      [0, 1],
    ]);
    expect([...downsample(m, 2).data]).toEqual([1, 0, 0, 1]);
  });
});
