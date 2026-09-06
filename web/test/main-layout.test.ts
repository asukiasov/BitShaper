import { beforeEach, describe, expect, it } from "vitest";
import { buildLayout, initApp } from "../src/main.js";

describe("buildLayout — toolbar", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("puts Copy ID / SVG / PNG in the header toolbar, disabled until a shape loads", () => {
    const root = document.createElement("div");
    buildLayout(root);

    const buttons = [
      ...root.querySelectorAll<HTMLButtonElement>(".app-header .app-toolbar button"),
    ];
    expect(buttons.map((b) => b.textContent)).toEqual(["Copy ID", "SVG", "PNG"]);
    expect(buttons.every((b) => b.disabled)).toBe(true);
    expect(root.querySelector(".export-controls")).toBeNull();
  });

  it("enables the toolbar buttons once a shape is loaded from the URL", () => {
    document.body.innerHTML = '<div id="app"></div>';
    window.history.replaceState({}, "", "?id=BS-2X2-8888W");
    initApp();

    const buttons = [...document.querySelectorAll<HTMLButtonElement>(".app-toolbar button")];
    expect(buttons.every((b) => !b.disabled)).toBe(true);
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

    selectTab("marks");
    expect(panel("catalog-section")?.hidden).toBe(false);
  });

  it("restores the active tab from the URL hash", () => {
    window.history.replaceState({}, "", "/#trace");
    const root = document.createElement("div");
    buildLayout(root);
    expect(root.querySelector<HTMLElement>(".trace-section")?.hidden).toBe(false);
  });
});

describe("buildLayout — repeat-count preview control", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("exposes a 1–10 number input defaulting to 1 (single mark)", () => {
    const root = document.createElement("div");
    buildLayout(root);
    const input = root.querySelector<HTMLInputElement>(".tile-repeat-input");
    expect(input?.min).toBe("1");
    expect(input?.max).toBe("10");
    expect(input?.value).toBe("1");
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
