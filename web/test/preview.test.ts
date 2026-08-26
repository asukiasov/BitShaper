import { beforeEach, describe, expect, it } from "vitest";
import { renderPreview } from "../src/preview.js";

const VALID_ID = "BS-2X2-08GOm";
const INVALID_ID = "BS-2X2-ZZZZZ";

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement("div");
});

describe("renderPreview", () => {
  it("injects the rendered SVG markup for a valid shape id", () => {
    renderPreview(container, VALID_ID);
    expect(container.querySelector("svg")).not.toBeNull();
    expect(container.classList.contains("preview-error")).toBe(false);
  });

  it("replaces prior content when a new shape id is rendered", () => {
    renderPreview(container, VALID_ID);
    const firstMarkup = container.innerHTML;
    renderPreview(container, "BS-2X2-GIMKE");
    expect(container.innerHTML).not.toBe(firstMarkup);
  });

  it("shows a visible error state for an invalid shape id instead of throwing or leaving stale content", () => {
    renderPreview(container, VALID_ID);
    expect(() => renderPreview(container, INVALID_ID)).not.toThrow();
    expect(container.classList.contains("preview-error")).toBe(true);
    expect(container.querySelector("svg")).toBeNull();
    expect(container.textContent?.length).toBeGreaterThan(0);
  });
});
