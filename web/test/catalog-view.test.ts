import { listCatalog } from "bitshaper/library";
import { describe, expect, it, vi } from "vitest";
import { renderCatalogView } from "../src/catalog-view.js";

describe("renderCatalogView", () => {
  it("renders one preview per listCatalog() entry", () => {
    const container = document.createElement("div");
    renderCatalogView(container, { onSelect: () => {} });

    const entries = container.querySelectorAll(".catalog-entry");
    expect(entries.length).toBe(listCatalog().length);
    for (const entry of entries) {
      const preview = entry.querySelector(".catalog-entry-preview");
      expect(preview).not.toBeNull();
      expect(preview?.innerHTML.length).toBeGreaterThan(0);
    }
  });

  it("invokes onSelect with the clicked entry's shape id", () => {
    const container = document.createElement("div");
    const onSelect = vi.fn();
    renderCatalogView(container, { onSelect });

    const firstEntry = container.querySelector<HTMLButtonElement>(".catalog-entry");
    expect(firstEntry).not.toBeNull();
    firstEntry?.click();

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(listCatalog()[0]?.id);
  });
});
