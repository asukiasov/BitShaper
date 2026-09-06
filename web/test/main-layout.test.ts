import { beforeEach, describe, expect, it, vi } from "vitest";
import { triggerDownload } from "../src/download.js";
import { buildLayout, initApp } from "../src/main.js";

vi.mock("../src/download.js", () => ({ triggerDownload: vi.fn() }));

describe("buildLayout — ID action buttons", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("puts Copy ID / SVG / PNG / → Poster in the shape-ID row, disabled until a shape loads", () => {
    const root = document.createElement("div");
    buildLayout(root);

    const buttons = [...root.querySelectorAll<HTMLButtonElement>(".shape-id-row .id-action")];
    expect(buttons.map((b) => b.textContent)).toEqual(["Copy ID", "SVG", "PNG", "→ Poster"]);
    expect(buttons.every((b) => b.disabled)).toBe(true);
  });

  it("→ Poster loads the shape into the poster tab and switches to it", () => {
    document.body.innerHTML = '<div id="app"></div>';
    window.history.replaceState({}, "", "?id=BS-2X2-8888W");
    initApp();

    document
      .querySelector<HTMLButtonElement>('.id-action[title="Use this shape in the Poster tab"]')
      ?.click();
    expect(window.location.hash).toBe("#poster");
    expect(document.querySelector<HTMLInputElement>(".poster-shape-input")?.value).toBe(
      "BS-2X2-8888W",
    );
  });

  it("wraps the preview and ID row in a sticky element", () => {
    const root = document.createElement("div");
    buildLayout(root);
    const sticky = root.querySelector(".preview-sticky");
    expect(sticky?.querySelector(".preview-container")).not.toBeNull();
    expect(sticky?.querySelector(".shape-id-row")).not.toBeNull();
  });

  it("splits the preview section into a main column (preview) and a side column (panels)", () => {
    const root = document.createElement("div");
    buildLayout(root);
    const layout = root.querySelector(".preview-section .preview-layout");
    expect(layout?.querySelector(".preview-col-main .preview-sticky")).not.toBeNull();
    expect(layout?.querySelector(".preview-col-side .composition-panel-container")).not.toBeNull();
    expect(layout?.querySelector(".preview-col-side .ramp-panel-container")).not.toBeNull();
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

describe("buildLayout — Composition panel is always visible", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("hosts the Composition panel inside .preview-section (outside the tab panels)", () => {
    const root = document.createElement("div");
    buildLayout(root);
    const host = root.querySelector(".preview-section .composition-panel-container");
    expect(host).not.toBeNull();
    expect(host?.closest(".tab-panel")).toBeNull();
  });

  it("renders the Composition panel and keeps it visible under the Trace tab", () => {
    document.body.innerHTML = '<div id="app"></div>';
    window.history.replaceState({}, "", "/#trace");
    initApp();
    expect(document.querySelector(".composition-panel")).not.toBeNull();
    expect(document.querySelector<HTMLElement>(".preview-section")?.hidden).toBeFalsy();
    expect(document.querySelector<HTMLElement>(".trace-section")?.hidden).toBe(false);
  });

  it("keeps the Composition panel visible under the Poster tab", () => {
    document.body.innerHTML = '<div id="app"></div>';
    window.history.replaceState({}, "", "/#poster");
    initApp();
    expect(document.querySelector(".composition-panel")).not.toBeNull();
    expect(document.querySelector<HTMLElement>(".poster-section")?.hidden).toBe(false);
  });

  it("has no separate Generate tab", () => {
    const root = document.createElement("div");
    buildLayout(root);
    expect(root.querySelector('.tab-button[data-tab="generate"]')).toBeNull();
    expect(root.querySelector(".generator-section")).toBeNull();
  });
});

describe("buildLayout — working-area tabs", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
  });

  it("shows only the Create panel by default and switches on click", () => {
    const root = document.createElement("div");
    const { selectTab } = buildLayout(root);

    const panel = (cls: string) => root.querySelector<HTMLElement>(`.${cls}`);
    expect(panel("catalog-section")?.hidden).toBe(false);
    expect(panel("trace-section")?.hidden).toBe(true);

    const traceTab = root.querySelector<HTMLButtonElement>('.tab-button[data-tab="trace"]');
    traceTab?.click();
    expect(panel("catalog-section")?.hidden).toBe(true);
    expect(panel("trace-section")?.hidden).toBe(false);
    expect(traceTab?.getAttribute("aria-selected")).toBe("true");
    expect(window.location.hash).toBe("#trace");

    selectTab("create");
    expect(panel("catalog-section")?.hidden).toBe(false);
    expect(window.location.hash).toBe("#create");
  });

  it("labels the three working-area tabs", () => {
    const root = document.createElement("div");
    buildLayout(root);
    const label = (id: string) =>
      root.querySelector<HTMLButtonElement>(`.tab-button[data-tab="${id}"]`)?.textContent;
    expect(label("create")).toBe("Create");
    expect(label("trace")).toBe("Trace an image");
    expect(label("poster")).toBe("Poster");
  });

  it("shows the Poster panel for the #poster hash and hides the others", () => {
    window.history.replaceState({}, "", "/#poster");
    const root = document.createElement("div");
    buildLayout(root);
    const panel = (cls: string) => root.querySelector<HTMLElement>(`.${cls}`);
    expect(panel("poster-section")?.hidden).toBe(false);
    expect(panel("catalog-section")?.hidden).toBe(true);
    expect(panel("trace-section")?.hidden).toBe(true);
    expect(panel("poster-section")?.closest(".tab-panel")).not.toBeNull();
  });

  it("restores the active tab from the URL hash", () => {
    window.history.replaceState({}, "", "/#trace");
    const root = document.createElement("div");
    buildLayout(root);
    expect(root.querySelector<HTMLElement>(".trace-section")?.hidden).toBe(false);
  });

  it("falls back to Create for an unknown hash", () => {
    window.history.replaceState({}, "", "/#examples");
    const root = document.createElement("div");
    buildLayout(root);
    expect(root.querySelector<HTMLElement>(".catalog-section")?.hidden).toBe(false);
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
