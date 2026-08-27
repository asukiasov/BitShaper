import { describe, expect, it } from "vitest";
import { decodeShapeId, encodeShapeId, renderShape } from "../../src/core/index.js";
import { getCatalogEntry, listCatalog } from "../../src/library/index.js";

describe("listCatalog", () => {
  it("returns every curated entry", () => {
    expect(listCatalog().length).toBeGreaterThanOrEqual(5);
  });

  it("returns a copy that callers cannot use to mutate the internal catalog", () => {
    const first = listCatalog();
    first.push({ id: "BS-1X1-00", name: "Injected", tags: [] });

    expect(listCatalog().length).not.toEqual(first.length);
  });
});

describe("getCatalogEntry", () => {
  it("returns the matching entry for a known id", () => {
    const [entry] = listCatalog();
    expect(entry).toBeDefined();

    const found = getCatalogEntry((entry as { id: string }).id);
    expect(found).toEqual(entry);
  });

  it("returns undefined for an id not in the catalog", () => {
    expect(getCatalogEntry("BS-2X2-0000")).toBeUndefined();
  });
});

describe("catalog entries are all renderable", () => {
  for (const entry of listCatalog()) {
    it(`"${entry.name}" (${entry.id}) decodes, renders, and is canonical`, () => {
      expect(() => decodeShapeId(entry.id)).not.toThrow();
      expect(() => renderShape(entry.id)).not.toThrow();
      expect(encodeShapeId(decodeShapeId(entry.id))).toBe(entry.id);
    });
  }
});
