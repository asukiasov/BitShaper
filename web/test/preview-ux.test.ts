import { describe, expect, it } from "vitest";
import { buildLayout } from "../src/main.js";

describe("buildLayout — history hint", () => {
  it("renders a .section-hint pointing at the browser Back button, after the Morph panel", () => {
    const root = document.createElement("div");
    buildLayout(root);

    const hints = [...root.querySelectorAll<HTMLElement>(".preview-section .section-hint")];
    const historyHint = hints.find((p) => p.textContent?.includes("Back button"));
    expect(historyHint?.textContent).toBe(
      "Randomized a few times? Use your browser's Back button to step through previous shapes.",
    );

    const ramp = root.querySelector(".ramp-panel-container");
    expect(historyHint && ramp && ramp.compareDocumentPosition(historyHint)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("puts the Composition panel between the sticky preview and the Morph panel", () => {
    const root = document.createElement("div");
    buildLayout(root);
    const composition = root.querySelector(".composition-panel-container");
    const sticky = root.querySelector(".preview-sticky");
    const ramp = root.querySelector(".ramp-panel-container");
    expect(sticky && composition && sticky.compareDocumentPosition(composition)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(composition && ramp && composition.compareDocumentPosition(ramp)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});
