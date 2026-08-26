import { describe, expect, it } from "vitest";
import {
  PRIMITIVE_REGISTRY,
  getPrimitiveByIndex,
  getPrimitiveIndexByName,
  listPrimitives,
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

  it("pins circle at index 4", () => {
    expect(PRIMITIVE_REGISTRY[4]?.name).toBe("circle");
  });

  it("pins wedge at index 5", () => {
    expect(PRIMITIVE_REGISTRY[5]?.name).toBe("wedge");
  });

  it("pins cap at index 6", () => {
    expect(PRIMITIVE_REGISTRY[6]?.name).toBe("cap");
  });

  it("pins pinwheel-arc at index 7", () => {
    expect(PRIMITIVE_REGISTRY[7]?.name).toBe("pinwheel-arc");
  });

  it("pins step at index 8", () => {
    expect(PRIMITIVE_REGISTRY[8]?.name).toBe("step");
  });

  it("pins ogee at index 9", () => {
    expect(PRIMITIVE_REGISTRY[9]?.name).toBe("ogee");
  });

  it("contains exactly the ten registered primitives", () => {
    expect(PRIMITIVE_REGISTRY.map((p) => p.name)).toEqual([
      "empty",
      "fill",
      "fillet",
      "bulge",
      "circle",
      "wedge",
      "cap",
      "pinwheel-arc",
      "step",
      "ogee",
    ]);
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

describe("listPrimitives", () => {
  it("returns every registered primitive's name paired with its index, in registration order", () => {
    expect(listPrimitives()).toEqual(
      PRIMITIVE_REGISTRY.map((primitive, index) => ({ name: primitive.name, index })),
    );
  });
});
