import { decodeShapeId } from "bitshaper";
import { beforeEach, describe, expect, it } from "vitest";
import { renderPrimitiveUsage, summarizePrimitiveUsage } from "../src/primitive-usage.js";

// 2x2: fill, empty, empty, fill  -> flat indices 8, 0, 0, 8
const FILL_EMPTY_ID = "BS-2X2-8008G";

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement("div");
});

describe("summarizePrimitiveUsage", () => {
  it("counts distinct primitives, ordered by registry index", () => {
    const usage = summarizePrimitiveUsage(decodeShapeId(FILL_EMPTY_ID));
    expect(usage).toEqual([
      { index: 0, name: "empty", count: 2 },
      { index: 1, name: "fill", count: 2 },
    ]);
  });

  it("returns one entry per distinct type for a single-primitive shape", () => {
    const usage = summarizePrimitiveUsage(decodeShapeId("BS-2X2-8888W"));
    expect(usage).toEqual([{ index: 1, name: "fill", count: 4 }]);
  });
});

describe("renderPrimitiveUsage", () => {
  it("renders one chip per distinct primitive with an icon", () => {
    renderPrimitiveUsage(container, FILL_EMPTY_ID);
    const chips = container.querySelectorAll(".primitive-usage-chip");
    expect(chips.length).toBe(2);
    for (const chip of chips) {
      expect(chip.querySelector(".primitive-icon svg")).not.toBeNull();
    }
    expect(container.textContent).toContain("Primitives used");
  });

  it("shows a count only when a primitive is used by more than one cell", () => {
    renderPrimitiveUsage(container, FILL_EMPTY_ID);
    expect(container.textContent).toContain("fill ×2");
  });

  it("clears the container for an undecodable shape id instead of throwing", () => {
    renderPrimitiveUsage(container, FILL_EMPTY_ID);
    expect(() => renderPrimitiveUsage(container, "BS-2X2-ZZZZZ")).not.toThrow();
    expect(container.innerHTML).toBe("");
  });
});
