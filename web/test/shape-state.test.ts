import { decodeShapeId } from "bitshaper";
import { beforeEach, describe, expect, it } from "vitest";
import {
  applyRampToShapeId,
  decodeShapeFromUrl,
  readShapeIdFromUrl,
  replaceCell,
  updateUrlForShape,
} from "../src/shape-state.js";

const VALID_ID = "BS-2X2-08GOm";
const INVALID_ID = "BS-2X2-ZZZZZ";

function setUrl(search: string): void {
  window.history.replaceState(null, "", `/${search}`);
}

beforeEach(() => {
  setUrl("");
});

describe("readShapeIdFromUrl", () => {
  it("returns null when no id parameter is present", () => {
    expect(readShapeIdFromUrl()).toBeNull();
  });

  it("returns the raw id parameter value", () => {
    setUrl(`?id=${VALID_ID}`);
    expect(readShapeIdFromUrl()).toBe(VALID_ID);
  });
});

describe("decodeShapeFromUrl", () => {
  it("returns kind 'empty' when no id parameter is present", () => {
    expect(decodeShapeFromUrl()).toEqual({ kind: "empty" });
  });

  it("decodes a valid id in the URL", () => {
    setUrl(`?id=${VALID_ID}`);
    const result = decodeShapeFromUrl();
    expect(result.kind).toBe("decoded");
    if (result.kind === "decoded") {
      expect(result.shapeId).toBe(VALID_ID);
      expect(result.shape).toEqual({
        cols: 2,
        rows: 2,
        cells: [
          { type: 0, rotation: 0, invert: false },
          { type: 1, rotation: 0, invert: false },
          { type: 2, rotation: 0, invert: false },
          { type: 3, rotation: 0, invert: false },
        ],
      });
    }
  });

  it("returns an error result, not a thrown exception, for an invalid id", () => {
    setUrl(`?id=${INVALID_ID}`);
    expect(() => decodeShapeFromUrl()).not.toThrow();
    const result = decodeShapeFromUrl();
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.shapeId).toBe(INVALID_ID);
      expect(result.message.length).toBeGreaterThan(0);
    }
  });
});

describe("updateUrlForShape", () => {
  it("writes the shape id into the ?id= query parameter", () => {
    updateUrlForShape(VALID_ID);
    expect(window.location.search).toBe(`?id=${VALID_ID}`);
  });

  it("uses replaceState by default (no new history entry)", () => {
    const before = window.history.length;
    updateUrlForShape(VALID_ID);
    expect(window.history.length).toBe(before);
  });

  it("uses pushState when push is true (adds a new history entry)", () => {
    const before = window.history.length;
    updateUrlForShape(VALID_ID, { push: true });
    expect(window.history.length).toBe(before + 1);
    expect(window.location.search).toBe(`?id=${VALID_ID}`);
  });
});

describe("applyRampToShapeId", () => {
  it("adds a ~ ramp block and keeps the base ID intact", () => {
    const withRamp = applyRampToShapeId(VALID_ID, {
      axis: "column",
      curve: "linear",
      tracks: [{ param: "scaleX", from: 0.2, to: 1 }],
    });
    expect(withRamp.startsWith("BS-2X2-")).toBe(true);
    expect(withRamp).toContain("~");
    expect(decodeShapeId(withRamp).ramp?.tracks[0]?.param).toBe("scaleX");
  });

  it("strips the ramp block when passed undefined", () => {
    const withRamp = applyRampToShapeId(VALID_ID, {
      axis: "row",
      curve: "linear",
      tracks: [{ param: "angle", from: 0, to: 60 }],
    });
    expect(applyRampToShapeId(withRamp, undefined)).toBe(VALID_ID);
  });

  it("returns the input unchanged when it cannot be decoded", () => {
    expect(applyRampToShapeId(INVALID_ID, undefined)).toBe(INVALID_ID);
  });
});

describe("replaceCell", () => {
  it("round-trips: replacing a cell yields an ID that decodes to the expected cells", () => {
    const next = replaceCell(VALID_ID, 1, { type: 3, rotation: 90, invert: true });
    const decoded = decodeShapeId(next);
    expect(decoded.cols).toBe(2);
    expect(decoded.rows).toBe(2);
    expect(decoded.cells).toEqual([
      { type: 0, rotation: 0, invert: false },
      { type: 3, rotation: 90, invert: true },
      { type: 2, rotation: 0, invert: false },
      { type: 3, rotation: 0, invert: false },
    ]);
  });

  it("preserves a ~ ramp block through the replace", () => {
    const ramped = applyRampToShapeId(VALID_ID, {
      axis: "column",
      curve: "linear",
      tracks: [{ param: "scaleX", from: 0.2, to: 1 }],
    });
    const next = replaceCell(ramped, 0, { type: 1, rotation: 0, invert: false });
    expect(next).toContain("~");
    expect(decodeShapeId(next).ramp?.tracks[0]?.param).toBe("scaleX");
    expect(decodeShapeId(next).cells[0]).toEqual({ type: 1, rotation: 0, invert: false });
  });

  it("throws RangeError when the index is out of range", () => {
    expect(() => replaceCell(VALID_ID, 4, { type: 1, rotation: 0, invert: false })).toThrow(
      RangeError,
    );
    expect(() => replaceCell(VALID_ID, -1, { type: 1, rotation: 0, invert: false })).toThrow(
      RangeError,
    );
  });

  it("returns the input unchanged when it cannot be decoded", () => {
    expect(replaceCell(INVALID_ID, 0, { type: 1, rotation: 0, invert: false })).toBe(INVALID_ID);
  });
});
