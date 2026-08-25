import { describe, expect, it } from "vitest";
import { empty } from "../../../src/core/primitives/empty.js";

describe("empty", () => {
  it("produces no path segments regardless of rotation/invert", () => {
    expect(empty(100, 0, false)).toEqual([]);
    expect(empty(100, 90, true)).toEqual([]);
  });
});
