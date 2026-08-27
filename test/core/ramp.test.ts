import { describe, expect, it } from "vitest";
import {
  RampError,
  decodeRampBlock,
  dequantizeEndpoint,
  encodeRampBlock,
  quantizeEndpoint,
  rampParameterAt,
  resolveCellTransform,
} from "../../src/core/ramp.js";
import type { Ramp } from "../../src/core/types.js";

describe("rampParameterAt", () => {
  it("runs 0 -> 1 across the columns for a column axis", () => {
    expect(rampParameterAt("column", "linear", 0, 0, 4, 4)).toBe(0);
    expect(rampParameterAt("column", "linear", 3, 0, 4, 4)).toBe(1);
    expect(rampParameterAt("column", "linear", 1, 0, 4, 4)).toBeCloseTo(1 / 3);
  });

  it("runs 0 -> 1 down the rows for a row axis", () => {
    expect(rampParameterAt("row", "linear", 0, 0, 4, 4)).toBe(0);
    expect(rampParameterAt("row", "linear", 0, 3, 4, 4)).toBe(1);
  });

  it("yields 0 everywhere when the axis has no span", () => {
    expect(rampParameterAt("column", "linear", 0, 2, 1, 4)).toBe(0);
    expect(rampParameterAt("row", "linear", 2, 0, 4, 1)).toBe(0);
    expect(rampParameterAt("diagonal", "linear", 0, 0, 1, 1)).toBe(0);
    expect(rampParameterAt("radial", "linear", 0, 0, 1, 1)).toBe(0);
  });

  it("measures radial distance from the grid center", () => {
    expect(rampParameterAt("radial", "linear", 1, 1, 3, 3)).toBe(0);
    expect(rampParameterAt("radial", "linear", 0, 0, 3, 3)).toBeCloseTo(1);
  });

  it("reshapes progress by the curve", () => {
    expect(rampParameterAt("column", "easeIn", 2, 0, 5, 1)).toBeCloseTo(0.25);
    expect(rampParameterAt("column", "easeOut", 2, 0, 5, 1)).toBeCloseTo(0.75);
    expect(rampParameterAt("column", "easeInOut", 2, 0, 5, 1)).toBeCloseTo(0.5);
    expect(rampParameterAt("column", "symmetric", 0, 0, 5, 1)).toBe(0);
    expect(rampParameterAt("column", "symmetric", 2, 0, 5, 1)).toBeCloseTo(1);
    expect(rampParameterAt("column", "symmetric", 4, 0, 5, 1)).toBe(0);
  });
});

describe("resolveCellTransform", () => {
  const scaleRamp = (): Ramp => ({
    axis: "column",
    curve: "linear",
    tracks: [{ param: "scale", from: 0, to: 1 }],
  });

  it("fills both scale axes from a single scale track", () => {
    const t = resolveCellTransform(scaleRamp(), 2, 0, 5, 1);
    expect(t.scaleX).toBeCloseTo(0.5);
    expect(t.scaleY).toBeCloseTo(0.5);
    expect(t.angleDeg).toBe(0);
  });

  it("leaves unset components at identity", () => {
    const ramp: Ramp = {
      axis: "column",
      curve: "linear",
      tracks: [{ param: "scaleX", from: 0, to: 1 }],
    };
    const t = resolveCellTransform(ramp, 4, 0, 5, 1);
    expect(t.scaleX).toBeCloseTo(1);
    expect(t.scaleY).toBe(1);
    expect(t.angleDeg).toBe(0);
  });

  it("composes multiple tracks at the same progress", () => {
    const ramp: Ramp = {
      axis: "column",
      curve: "linear",
      tracks: [
        { param: "scaleX", from: 1, to: 0 },
        { param: "angle", from: 0, to: 90 },
      ],
    };
    const t = resolveCellTransform(ramp, 2, 0, 5, 1);
    expect(t.scaleX).toBeCloseTo(0.5);
    expect(t.scaleY).toBe(1);
    expect(t.angleDeg).toBeCloseTo(45);
  });
});

describe("quantizeEndpoint / dequantizeEndpoint", () => {
  it("puts scale identity (1.0) and angle identity (0) at index 31", () => {
    expect(quantizeEndpoint("scale", 1)).toBe(31);
    expect(quantizeEndpoint("angle", 0)).toBe(31);
    expect(dequantizeEndpoint("scale", 31)).toBe(1);
    expect(dequantizeEndpoint("angle", 31)).toBe(0);
  });

  it("snaps an off-grid value to the nearest index and clamps to 0-61", () => {
    expect(quantizeEndpoint("scale", 0.5001)).toBe(16);
    expect(quantizeEndpoint("scale", 999)).toBe(61);
    expect(quantizeEndpoint("scale", -1)).toBe(0);
    expect(quantizeEndpoint("angle", 90)).toBe(61);
    expect(quantizeEndpoint("angle", -90)).toBe(0);
  });
});

describe("encodeRampBlock / decodeRampBlock", () => {
  const roundTrip = (ramp: Ramp): Ramp => decodeRampBlock(encodeRampBlock(ramp));

  it("round-trips a one-track ramp through the grid values", () => {
    const ramp: Ramp = {
      axis: "column",
      curve: "linear",
      tracks: [{ param: "scaleX", from: 5 / 31, to: 61 / 31 }],
    };
    expect(roundTrip(ramp)).toEqual(ramp);
  });

  it("emits the documented example block", () => {
    const block = encodeRampBlock({
      axis: "column",
      curve: "linear",
      tracks: [{ param: "scaleX", from: 5 / 31, to: 61 / 31 }],
    });
    expect(block).toBe("00115z6");
  });

  it("drops a track whose endpoints are both identity", () => {
    const block = encodeRampBlock({
      axis: "row",
      curve: "linear",
      tracks: [
        { param: "scale", from: 1, to: 1 },
        { param: "angle", from: 0, to: 45 },
      ],
    });
    const tracks = decodeRampBlock(block).tracks;
    expect(tracks).toHaveLength(1);
    expect(tracks[0]?.param).toBe("angle");
    expect(tracks[0]?.from).toBe(0);
    expect(tracks[0]?.to).toBeGreaterThan(40);
  });

  it("returns an empty string when no track survives", () => {
    expect(
      encodeRampBlock({
        axis: "row",
        curve: "linear",
        tracks: [{ param: "scale", from: 1, to: 1 }],
      }),
    ).toBe("");
  });

  it("sorts tracks ascending by param code", () => {
    const block = encodeRampBlock({
      axis: "column",
      curve: "linear",
      tracks: [
        { param: "angle", from: 0, to: 90 },
        { param: "scaleX", from: 0, to: 1 },
      ],
    });
    expect(decodeRampBlock(block).tracks.map((t) => t.param)).toEqual(["scaleX", "angle"]);
  });

  it("rejects a duplicate param", () => {
    expect(() =>
      encodeRampBlock({
        axis: "column",
        curve: "linear",
        tracks: [
          { param: "scaleX", from: 0, to: 1 },
          { param: "scaleX", from: 1, to: 0 },
        ],
      }),
    ).toThrow(RampError);
  });

  it("rejects mixing scale with scaleX/scaleY", () => {
    expect(() =>
      encodeRampBlock({
        axis: "column",
        curve: "linear",
        tracks: [
          { param: "scale", from: 0, to: 1 },
          { param: "scaleX", from: 0, to: 1 },
        ],
      }),
    ).toThrow(RampError);
  });

  it("rejects a block whose checksum does not match", () => {
    const good = encodeRampBlock({
      axis: "column",
      curve: "linear",
      tracks: [{ param: "scaleX", from: 0, to: 1 }],
    });
    const corrupted = `${good.slice(0, -1)}${good.at(-1) === "0" ? "1" : "0"}`;
    expect(() => decodeRampBlock(corrupted)).toThrow(RampError);
  });

  it("rejects a block whose length does not match its track count", () => {
    expect(() => decodeRampBlock("0021050")).toThrow(RampError);
  });
});
