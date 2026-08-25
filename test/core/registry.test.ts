import { describe, expect, it } from "vitest";
import {
  PRIMITIVE_REGISTRY,
  getPrimitiveByIndex,
  getPrimitiveIndexByName,
} from "../../src/core/registry.js";

describe("PRIMITIVE_REGISTRY", () => {
  // Pinned indices: a primitive's array index is baked into every shape ID
  // ever issued referencing it (type * 8 + rotation * 2 + invert). Never
  // reorder this list — always append new primitives to the end.
  it("pins empty at index 0", () => {
    expect(PRIMITIVE_REGISTRY[0]?.name).toBe("empty");
  });

  it("pins fill at index 1", () => {
    expect(PRIMITIVE_REGISTRY[1]?.name).toBe("fill");
  });

  it("pins fillet at index 2", () => {
    expect(PRIMITIVE_REGISTRY[2]?.name).toBe("fillet");
  });

  it("pins bulge at index 3", () => {
    expect(PRIMITIVE_REGISTRY[3]?.name).toBe("bulge");
  });

  it("contains exactly the four starter primitives", () => {
    expect(PRIMITIVE_REGISTRY.map((p) => p.name)).toEqual(["empty", "fill", "fillet", "bulge"]);
  });

  it("pairs every entry with a callable path-builder", () => {
    for (const entry of PRIMITIVE_REGISTRY) {
      expect(typeof entry.build).toBe("function");
    }
  });
});

describe("getPrimitiveByIndex", () => {
  it("returns the primitive definition at a valid index", () => {
    expect(getPrimitiveByIndex(2)?.name).toBe("fillet");
  });

  it("returns undefined for an out-of-range index", () => {
    expect(getPrimitiveByIndex(99)).toBeUndefined();
  });
});

describe("getPrimitiveIndexByName", () => {
  it("returns the registry index for a known primitive name", () => {
    expect(getPrimitiveIndexByName("bulge")).toBe(3);
  });

  it("returns -1 for an unknown primitive name", () => {
    expect(getPrimitiveIndexByName("nonexistent")).toBe(-1);
  });
});
