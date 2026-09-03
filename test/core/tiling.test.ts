import { describe, expect, it } from "vitest";
import { generateShapeId } from "../../src/core/generate.js";
import { encodeShapeId } from "../../src/core/id.js";
import { decodeShapeId } from "../../src/core/id.js";
import { getPrimitiveIndexByName } from "../../src/core/registry.js";
import { renderShape } from "../../src/core/render.js";
import {
  classifyEdgeProfile,
  edgeProfile,
  edgesCompatible,
  generateTileableShapeDef,
  generateTileableShapeId,
  isTileable,
} from "../../src/core/tiling.js";
import type { CellDef, ShapeDef } from "../../src/core/types.js";

const type = (name: string) => getPrimitiveIndexByName(name);

function uniform(cols: number, rows: number, cell: CellDef): ShapeDef {
  return { cols, rows, cells: Array.from({ length: cols * rows }, () => cell) };
}

describe("edgeProfile / classifyEdgeProfile", () => {
  it("classifies fill as FULL on all four edges", () => {
    for (const edge of ["north", "east", "south", "west"] as const) {
      expect(classifyEdgeProfile(edgeProfile(type("fill"), 0, false, edge))).toBe("FULL");
    }
  });

  it("classifies empty as EMPTY on all four edges", () => {
    for (const edge of ["north", "east", "south", "west"] as const) {
      expect(classifyEdgeProfile(edgeProfile(type("empty"), 0, false, edge))).toBe("EMPTY");
    }
  });

  it("gives fillet@0 empty north/west and full east/south", () => {
    expect(classifyEdgeProfile(edgeProfile(type("fillet"), 0, false, "north"))).toBe("EMPTY");
    expect(classifyEdgeProfile(edgeProfile(type("fillet"), 0, false, "west"))).toBe("EMPTY");
    expect(classifyEdgeProfile(edgeProfile(type("fillet"), 0, false, "east"))).toBe("FULL");
    expect(classifyEdgeProfile(edgeProfile(type("fillet"), 0, false, "south"))).toBe("FULL");
  });

  it("makes fillet@0 and bulge@0 edge-complements (north)", () => {
    const filletN = edgeProfile(type("fillet"), 0, false, "north");
    const bulgeN = edgeProfile(type("bulge"), 0, false, "north");
    expect(classifyEdgeProfile(filletN)).toBe("EMPTY");
    expect(classifyEdgeProfile(bulgeN)).toBe("FULL");
  });
});

describe("edgesCompatible", () => {
  it("matches equal profiles and rejects unequal ones", () => {
    const full = edgeProfile(type("fill"), 0, false, "east");
    const emptyEdge = edgeProfile(type("empty"), 0, false, "west");
    expect(edgesCompatible(full, edgeProfile(type("fill"), 0, false, "west"))).toBe(true);
    expect(edgesCompatible(full, emptyEdge)).toBe(false);
  });
});

describe("isTileable", () => {
  it("accepts a uniform fill grid", () => {
    expect(isTileable(uniform(3, 3, { type: type("fill"), rotation: 0, invert: false }))).toBe(
      true,
    );
  });

  it("accepts a uniform empty grid", () => {
    expect(isTileable(uniform(2, 4, { type: type("empty"), rotation: 0, invert: false }))).toBe(
      true,
    );
  });

  it("accepts a uniform circle grid (dots — edges are empty)", () => {
    expect(isTileable(uniform(4, 4, { type: type("circle"), rotation: 0, invert: false }))).toBe(
      true,
    );
  });

  it("rejects a uniform wedge grid under strict coverage-match (east FULL vs west EMPTY)", () => {
    // The diagonal cut lines up corner-to-corner, but edge *coverage* does not:
    // wedge@0 fills its whole east edge and none of its west edge. A finding, not a bug —
    // C1 is stricter than 'looks continuous'. C2/constructive generation is the follow-up.
    expect(isTileable(uniform(4, 4, { type: type("wedge"), rotation: 0, invert: false }))).toBe(
      false,
    );
  });

  it("rejects a grid whose wrap seam does not match", () => {
    const fillCell: CellDef = { type: type("fill"), rotation: 0, invert: false };
    const filletCell: CellDef = { type: type("fillet"), rotation: 0, invert: false };
    // Row: [fill, fillet] — interior seam fill.east(FULL) vs fillet.west(EMPTY) already fails,
    // and so does the wrap seam fillet.east(FULL) vs fill.west(FULL) is fine but interior isn't.
    const shape: ShapeDef = { cols: 2, rows: 1, cells: [fillCell, filletCell] };
    expect(isTileable(shape)).toBe(false);
  });

  it("rejects any ramped shape", () => {
    const shape: ShapeDef = {
      ...uniform(2, 2, { type: type("fill"), rotation: 0, invert: false }),
      ramp: { axis: "column", curve: "linear", tracks: [{ param: "scale", from: 0.5, to: 1 }] },
    };
    expect(isTileable(shape)).toBe(false);
  });
});

describe("generateTileableShapeId", () => {
  it("is deterministic and always produces a tileable shape", () => {
    for (const seed of ["alpha", "bravo", "charlie", 42]) {
      const a = generateTileableShapeId(seed, { cols: 3, rows: 3 });
      const b = generateTileableShapeId(seed, { cols: 3, rows: 3 });
      expect(a).toBe(b);
      expect(isTileable(decodeShapeId(a))).toBe(true);
      expect(() => renderShape(a, { tile: true })).not.toThrow();
    }
  });

  it("produces non-uniform grids (constructive solver, not just a uniform fill)", () => {
    let sawNonUniform = false;
    for (const seed of ["p1", "p2", "p3", "p4", "p5", "p6"]) {
      const shape = generateTileableShapeDef(seed, { cols: 4, rows: 4 });
      expect(isTileable(shape)).toBe(true);
      const first = JSON.stringify(shape.cells[0]);
      if (shape.cells.some((c) => JSON.stringify(c) !== first)) sawNonUniform = true;
    }
    expect(sawNonUniform).toBe(true);
  });

  it("stays tileable across a range of grid sizes", () => {
    for (const [cols, rows] of [
      [2, 2],
      [3, 5],
      [5, 3],
      [6, 6],
    ] as const) {
      expect(isTileable(generateTileableShapeDef("grid", { cols, rows }))).toBe(true);
    }
  });
});

describe("renderShape tile option", () => {
  const id = generateShapeId("pattern-seed", { cols: 2, rows: 2 });

  it("emits exactly one <pattern> and a filled rect when tile:true", () => {
    const svg = renderShape(id, { tile: true });
    expect(svg.match(/<pattern /g)).toHaveLength(1);
    expect(svg).toContain('fill="url(#bs-tile)"');
    expect(svg).toMatch(/^<svg[^>]*>[\s\S]*<\/svg>$/);
  });

  it("is byte-identical to the default render when tile is absent", () => {
    expect(renderShape(id)).toBe(renderShape(id, {}));
    expect(renderShape(id)).not.toContain("<pattern");
  });

  it("honours tileSize", () => {
    const svg = renderShape(id, { tile: true, tileSize: 99 });
    expect(svg).toContain('width="99"');
    expect(svg).toContain('height="99"');
  });
});
