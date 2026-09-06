import { beforeEach, describe, expect, it, vi } from "vitest";
import { triggerDownload } from "../src/download.js";
import { buildPosterTab } from "../src/poster.js";

vi.mock("../src/download.js", () => ({ triggerDownload: vi.fn() }));

function build(getCurrentShapeId: () => string | null = () => null) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  return { container, handle: buildPosterTab(container, { getCurrentShapeId }) };
}

beforeEach(() => {
  window.history.replaceState({}, "", "/");
  document.body.innerHTML = "";
  vi.mocked(triggerDownload).mockClear();
});

describe("buildPosterTab", () => {
  it("renders a poster svg into .poster-preview on build", () => {
    const { container } = build();
    expect(container.querySelector(".poster-preview svg")).not.toBeNull();
  });

  it("disables 'Use preview shape' when there is no current shape", () => {
    const { container } = build(() => null);
    const btn = container.querySelector<HTMLButtonElement>(".poster-use-preview");
    expect(btn?.disabled).toBe(true);
  });

  it("fills the shape field from the preview shape and re-renders", () => {
    const { container } = build(() => "BS-2X2-8888W");
    const btn = container.querySelector<HTMLButtonElement>(".poster-use-preview");
    expect(btn?.disabled).toBe(false);
    btn?.click();
    const input = container.querySelector<HTMLInputElement>(".poster-shape-input");
    expect(input?.value).toBe("BS-2X2-8888W");
  });

  it("has no poster-local Randomize button", () => {
    const { container } = build();
    expect(container.querySelector(".poster-randomize")).toBeNull();
  });

  it("setShapeId on the handle loads a shape into the field and preview", () => {
    const { container, handle } = build();
    handle.setShapeId("BS-2X2-8888W");
    expect(container.querySelector<HTMLInputElement>(".poster-shape-input")?.value).toBe(
      "BS-2X2-8888W",
    );
    expect(container.querySelector(".poster-preview svg")).not.toBeNull();
  });

  it("editing the title re-renders the preview and writes the URL", () => {
    const { container } = build();
    const title = container.querySelector<HTMLInputElement>('input[name="title"]');
    if (title) {
      title.value = "NEWTITLE";
      title.dispatchEvent(new Event("input"));
    }
    expect(container.querySelector(".poster-preview svg")?.innerHTML).toContain("NEWTITLE");
    expect(window.location.search).toContain("pt=NEWTITLE");
  });

  it("marks an invalid shape id without wiping the preview", () => {
    const { container } = build();
    const input = container.querySelector<HTMLInputElement>(".poster-shape-input");
    if (input) {
      input.value = "garbage";
      input.dispatchEvent(new Event("change"));
    }
    expect(input?.classList.contains("is-invalid")).toBe(true);
    expect(container.querySelector(".poster-preview svg")).not.toBeNull();
  });

  it("exports the poster SVG with a poster- filename", () => {
    const { container } = build();
    container.querySelector<HTMLButtonElement>(".poster-export-svg")?.click();
    expect(triggerDownload).toHaveBeenCalledWith(
      expect.any(Blob),
      expect.stringMatching(/^poster-.*\.svg$/),
    );
  });
});
