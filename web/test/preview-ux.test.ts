import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildLayout, initApp } from "../src/main.js";

describe("buildLayout — previous-marks history hint", () => {
  it("renders a .section-hint pointing at the browser Back button, before the ramp panel", () => {
    const root = document.createElement("div");
    buildLayout(root);

    const hints = [...root.querySelectorAll<HTMLElement>(".preview-section .section-hint")];
    const historyHint = hints.find((p) => p.textContent?.includes("Back button"));
    expect(historyHint).toBeDefined();
    expect(historyHint?.textContent).toBe(
      "Randomized a few times? Use your browser's Back button to step through previous marks.",
    );

    const ramp = root.querySelector(".ramp-panel-container");
    expect(historyHint && ramp && historyHint.compareDocumentPosition(ramp)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});

describe("reuse primitives — no scroll, no preview change", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    window.history.replaceState({}, "", "?id=BS-2X2-8888W");
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = () => {};
    }
  });

  it("activating the reuse control does not call scrollIntoView and keeps the shape ID", () => {
    const scrollSpy = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
    initApp();

    const shapeIdInput = document.querySelector<HTMLInputElement>(".shape-id-row input");
    const before = shapeIdInput?.value;
    expect(before).toBe("BS-2X2-8888W");

    const reuse = document.querySelector<HTMLButtonElement>(".reuse-primitives-button");
    expect(reuse).not.toBeNull();
    reuse?.click();

    expect(scrollSpy).not.toHaveBeenCalled();
    expect(shapeIdInput?.value).toBe(before);
    scrollSpy.mockRestore();
  });
});
