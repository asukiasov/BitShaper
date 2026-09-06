import { beforeEach, describe, expect, it, vi } from "vitest";
import { triggerDownload } from "../src/download.js";
import { buildLayout, initApp } from "../src/main.js";

vi.mock("../src/download.js", () => ({ triggerDownload: vi.fn() }));

describe("buildLayout — ID action buttons", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("puts Copy ID / SVG / PNG in the shape-ID row, disabled until a shape loads", () => {
    const root = document.createElement("div");
    buildLayout(root);

    const buttons = [...root.querySelectorAll<HTMLButtonElement>(".shape-id-row .id-action")];
    expect(buttons.map((b) => b.textContent)).toEqual(["Copy ID", "SVG", "PNG"]);
    expect(buttons.every((b) => b.disabled)).toBe(true);
    expect(root.querySelector(".app-toolbar")).toBeNull();
    expect(root.querySelector(".export-controls")).toBeNull();
  });

  it("wraps the preview and ID row in a sticky element", () => {
    const root = document.createElement("div");
    buildLayout(root);
    const sticky = root.querySelector(".preview-sticky");
    expect(sticky?.querySelector(".preview-container")).not.toBeNull();
    expect(sticky?.querySelector(".shape-id-row")).not.toBeNull();
  });

  it("enables the action buttons once a shape is loaded from the URL", () => {
    document.body.innerHTML = '<div id="app"></div>';
    window.history.replaceState({}, "", "?id=BS-2X2-8888W");
    initApp();

    const buttons = [...document.querySelectorAll<HTMLButtonElement>(".id-action")];
    expect(buttons.every((b) => !b.disabled)).toBe(true);
  });

  it("names an SVG export after the shape ID", () => {
    document.body.innerHTML = '<div id="app"></div>';
    window.history.replaceState({}, "", "?id=BS-2X2-8888W");
    vi.mocked(triggerDownload).mockClear();
    initApp();

    document.querySelector<HTMLButtonElement>('.id-action[title="Export as SVG"]')?.click();
    expect(triggerDownload).toHaveBeenCalledWith(expect.any(Blob), "BS-2X2-8888W.svg");
  });
});

describe("buildLayout — working-area tabs", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("shows only the Generate panel by default and switches on click", () => {
    const root = document.createElement("div");
    const { selectTab } = buildLayout(root);

    const panel = (cls: string) => root.querySelector<HTMLElement>(`.${cls}`);
    expect(panel("generator-section")?.hidden).toBe(false);
    expect(panel("trace-section")?.hidden).toBe(true);
    expect(panel("catalog-section")?.hidden).toBe(true);

    const traceTab = root.querySelector<HTMLButtonElement>('.tab-button[data-tab="trace"]');
    traceTab?.click();
    expect(panel("generator-section")?.hidden).toBe(true);
    expect(panel("trace-section")?.hidden).toBe(false);
    expect(traceTab?.getAttribute("aria-selected")).toBe("true");
    expect(window.location.hash).toBe("#trace");

    selectTab("examples");
    expect(panel("catalog-section")?.hidden).toBe(false);
  });

  it("labels the third tab Examples and uses the #examples hash", () => {
    const root = document.createElement("div");
    buildLayout(root);
    const tab = root.querySelector<HTMLButtonElement>('.tab-button[data-tab="examples"]');
    expect(tab?.textContent).toBe("Examples");
    tab?.click();
    expect(window.location.hash).toBe("#examples");
  });

  it("restores the active tab from the URL hash", () => {
    window.history.replaceState({}, "", "/#trace");
    const root = document.createElement("div");
    buildLayout(root);
    expect(root.querySelector<HTMLElement>(".trace-section")?.hidden).toBe(false);
  });
});

describe("buildLayout — Pattern preview control", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("exposes a 1–10 number input defaulting to 1 (single shape)", () => {
    const root = document.createElement("div");
    buildLayout(root);
    const input = root.querySelector<HTMLInputElement>(".tile-repeat-input");
    expect(input?.min).toBe("1");
    expect(input?.max).toBe("10");
    expect(input?.value).toBe("1");
    expect(root.querySelector(".tile-repeat")?.textContent).toContain("Pattern");
  });

  it("renders a <pattern> tile only once the repeat count is raised above 1", () => {
    document.body.innerHTML = '<div id="app"></div>';
    window.history.replaceState({}, "", "?id=BS-2X2-8888W");
    initApp();

    const preview = document.querySelector<HTMLElement>(".preview-container");
    expect(preview?.innerHTML).not.toContain("<pattern");

    const input = document.querySelector<HTMLInputElement>(".tile-repeat-input");
    if (input) {
      input.value = "4";
      input.dispatchEvent(new Event("change"));
    }
    expect(preview?.innerHTML).toContain("<pattern");
  });
});
