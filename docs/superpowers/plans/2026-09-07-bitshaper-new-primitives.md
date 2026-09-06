# New Primitives (Change C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four new grid-cell primitives (`diamond`, `parallelogram`, `bar`, `gable`) derived from `samples/new 4/`, and curate example shapes that use them into the library catalog.

**Architecture:** Each primitive is one pure function `(cellSize, rotation, invert) => PathSegment[]` in `src/core/primitives/<name>.ts`, building local `[0,cellSize]²` corner coordinates and mapping every segment through `transformPathSegment`. Primitives emit straight-line commands only (`M`/`L`/`Z`), never SVG `transform=`. They are appended (never inserted) to `PRIMITIVE_REGISTRY` — the array index is the permanent `CellDef.type` value. Catalog IDs are generated with a throwaway script against the built package.

**Tech Stack:** TypeScript, vitest (tests mirror `src/` under `test/`), biome, tsup, commander.

## Global Constraints

- `PRIMITIVE_REGISTRY` (`src/core/registry.ts`) and `src/core/primitives/index.ts` are APPEND-ONLY. New primitives go at the END. Never reorder or remove existing entries.
- New primitive registry indices: `diamond=14`, `parallelogram=15`, `bar=16`, `gable=17`.
- Per-cell flat index formula: `type * 8 + rotationCode * 2 + invert`, where `rotationCode = rotation / 90`, `invert` is `0|1`. ID format is v2 (`BS2-` prefix, 2 base62 chars/cell); ceiling is 3843, so appending is safe.
- Primitives build local corner coords then map each segment through `transformPathSegment(segment, cellSize, rotation, invert)` from `./transform.js`. Model file: `src/core/primitives/bulge.ts`.
- No SVG `transform=` emitted by primitives, ever.
- `test/` mirrors `src/` file-for-file (`src/core/primitives/diamond.ts` → `test/core/primitives/diamond.test.ts`).
- Every catalog id in `src/library/catalog.json` MUST satisfy `encodeShapeId(decodeShapeId(id)) === id` and render without throwing — enforced by `test/library/index.test.ts` ("catalog entries are all renderable").
- Verify before PR: `npm test` (all green), `npx biome check .` (clean), `npm run build` (ok).
- Design doc: `docs/superpowers/specs/2026-09-07-bitshaper-new-primitives-design.md`.

---

## File Structure

- Create: `src/core/primitives/diamond.ts` — `diamond` path builder (index 14).
- Create: `src/core/primitives/parallelogram.ts` — `parallelogram` path builder (index 15).
- Create: `src/core/primitives/bar.ts` — `bar` path builder (index 16).
- Create: `src/core/primitives/gable.ts` — `gable` path builder (index 17).
- Modify: `src/core/primitives/index.ts` — add four `export { … } from "./….js"` lines (alphabetical, matching existing style).
- Modify: `src/core/registry.ts` — add four imports + four `{ name, build }` entries appended to `PRIMITIVE_REGISTRY`.
- Modify: `test/core/registry.test.ts` — four new `pins <name> at index N` tests; extend the "contains exactly the … registered primitives" test name + array incrementally.
- Create: `test/core/primitives/{diamond,parallelogram,bar,gable}.test.ts` — one per primitive (mirror `wedge.test.ts` / `circle.test.ts`).
- Modify: `docs/architecture.md` — add the four files to the `primitives/` directory map.
- Modify: `docs/primitive-survey.md` — short addendum for the `samples/new 4/` pass.
- Create (throwaway, deleted before PR): `scripts/gen-catalog-ids.mjs` — builds ShapeDefs, prints IDs.
- Modify: `src/library/catalog.json` — 4–6 new curated entries using the new primitives.

---

## Task 1: `diamond` primitive (index 14)

**Files:**
- Create: `src/core/primitives/diamond.ts`
- Create: `test/core/primitives/diamond.test.ts`
- Modify: `src/core/primitives/index.ts`
- Modify: `src/core/registry.ts`
- Modify: `test/core/registry.test.ts`

**Interfaces:**
- Consumes: `PathSegment`, `PrimitivePathBuilder`, `transformPathSegment` from `src/core/primitives/transform.js`.
- Produces: `export const diamond: PrimitivePathBuilder`; `PRIMITIVE_REGISTRY[14] = { name: "diamond", build: diamond }`.

- [ ] **Step 1: Write the failing test**

Create `test/core/primitives/diamond.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { diamond } from "../../../src/core/primitives/diamond.js";

describe("diamond", () => {
  it("is a square on its point, vertices at the edge midpoints, at rotation 0", () => {
    expect(diamond(100, 0, false)).toEqual([
      { command: "M", x: 50, y: 0 },
      { command: "L", x: 100, y: 50 },
      { command: "L", x: 50, y: 100 },
      { command: "L", x: 0, y: 50 },
      { command: "Z" },
    ]);
  });

  it("closes the path", () => {
    expect(diamond(100, 0, false).at(-1)).toEqual({ command: "Z" });
  });

  it("uses no arc segments", () => {
    expect(diamond(100, 0, false).some((s) => s.command === "A")).toBe(false);
  });

  it("maps onto itself under 90 degree rotation (vertices are the same set)", () => {
    const rotated = diamond(100, 90, false).filter((s) => s.command !== "Z");
    const points = rotated.map((s) => `${(s as { x: number }).x},${(s as { y: number }).y}`).sort();
    expect(points).toEqual(["0,50", "100,50", "50,0", "50,100"].sort());
  });

  it("is unchanged by invert (symmetric about the vertical axis)", () => {
    expect(diamond(100, 0, true)).toEqual(diamond(100, 0, false));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ../BitShaper-core-new-primitives && npx vitest run test/core/primitives/diamond.test.ts`
Expected: FAIL — cannot resolve `../../../src/core/primitives/diamond.js`.

- [ ] **Step 3: Write minimal implementation**

Create `src/core/primitives/diamond.ts`:

```ts
import { type PathSegment, type PrimitivePathBuilder, transformPathSegment } from "./transform.js";

/**
 * The diamond primitive: a square rotated 45 degrees, its four vertices at
 * the midpoints of the cell's four edges. Centrally symmetric — rotation in
 * 90-degree steps and horizontal invert both map the shape onto itself, but
 * the coordinates are still passed through {@link transformPathSegment} for
 * API consistency with every other primitive. Two {@link gable} triangles
 * base-to-base form this same shape. Derived from `samples/new 4/` (the
 * 45-degree checkerboard, and the centre of the lobed emblem).
 */
export const diamond: PrimitivePathBuilder = (cellSize, rotation, invert) => {
  const mid = cellSize / 2;
  const local: PathSegment[] = [
    { command: "M", x: mid, y: 0 },
    { command: "L", x: cellSize, y: mid },
    { command: "L", x: mid, y: cellSize },
    { command: "L", x: 0, y: mid },
    { command: "Z" },
  ];
  return local.map((segment) => transformPathSegment(segment, cellSize, rotation, invert));
};
```

Add to `src/core/primitives/index.ts` (alphabetical position — after `diagonalBand`, before `empty`):

```ts
export { diamond } from "./diamond.js";
```

In `src/core/registry.ts`: add `diamond` to the import list from `./primitives/index.js` (alphabetical), and append to `PRIMITIVE_REGISTRY` after the `leaf` entry:

```ts
  { name: "leaf", build: leaf },
  { name: "diamond", build: diamond },
];
```

- [ ] **Step 4: Add the registry tests**

In `test/core/registry.test.ts`, add after the `pins leaf at index 13` test:

```ts
  it("pins diamond at index 14", () => {
    expect(PRIMITIVE_REGISTRY[14]?.name).toBe("diamond");
  });
```

Update the "contains exactly the fourteen registered primitives" test: rename to `fifteen` and append `"diamond"` to the end of the expected array.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd ../BitShaper-core-new-primitives && npx vitest run test/core/primitives/diamond.test.ts test/core/registry.test.ts`
Expected: PASS (all).

- [ ] **Step 6: Run biome**

Run: `npx biome check .`
Expected: clean (no diagnostics). If import ordering is flagged, run `npx biome check --write .` and re-run.

- [ ] **Step 7: Commit**

```bash
git add src/core/primitives/diamond.ts src/core/primitives/index.ts src/core/registry.ts test/core/primitives/diamond.test.ts test/core/registry.test.ts
git commit -m "feat(core): add diamond primitive (index 14)"
```

---

## Task 2: `parallelogram` primitive (index 15)

**Files:**
- Create: `src/core/primitives/parallelogram.ts`
- Create: `test/core/primitives/parallelogram.test.ts`
- Modify: `src/core/primitives/index.ts`, `src/core/registry.ts`, `test/core/registry.test.ts`

**Interfaces:**
- Consumes: same `transform.js` exports as Task 1.
- Produces: `export const parallelogram: PrimitivePathBuilder`; `PRIMITIVE_REGISTRY[15] = { name: "parallelogram", build: parallelogram }`.

- [ ] **Step 1: Write the failing test**

Create `test/core/primitives/parallelogram.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parallelogram } from "../../../src/core/primitives/parallelogram.js";

describe("parallelogram", () => {
  it("is a full-height quad with the top edge sheared right by cellSize/2, at rotation 0", () => {
    expect(parallelogram(100, 0, false)).toEqual([
      { command: "M", x: 50, y: 0 },
      { command: "L", x: 100, y: 0 },
      { command: "L", x: 50, y: 100 },
      { command: "L", x: 0, y: 100 },
      { command: "Z" },
    ]);
  });

  it("closes the path and uses no arcs", () => {
    const segs = parallelogram(100, 0, false);
    expect(segs.at(-1)).toEqual({ command: "Z" });
    expect(segs.some((s) => s.command === "A")).toBe(false);
  });

  it("mirrors to a backslash slant when inverted (top edge sheared left)", () => {
    expect(parallelogram(100, 0, true)).toEqual([
      { command: "M", x: 50, y: 0 },
      { command: "L", x: 0, y: 0 },
      { command: "L", x: 50, y: 100 },
      { command: "L", x: 100, y: 100 },
      { command: "Z" },
    ]);
  });

  it("rotates 90 degrees clockwise: local (50,0) about centre (50,50) -> (100,50)", () => {
    expect(parallelogram(100, 90, false)[0]).toEqual({ command: "M", x: 100, y: 50 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ../BitShaper-core-new-primitives && npx vitest run test/core/primitives/parallelogram.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/core/primitives/parallelogram.ts`:

```ts
import { type PathSegment, type PrimitivePathBuilder, transformPathSegment } from "./transform.js";

/**
 * The parallelogram primitive: a full-cell-height quadrilateral whose top
 * edge is sheared right by `cellSize / 2` relative to its bottom edge. At
 * rotation 0 / invert false it slants like a forward slash; invert mirrors
 * it to a backslash; rotation 90 swings the shear axis. Two adjacent cells
 * at complementary rotations read as a cube corner. Derived from
 * `samples/new 4/` (the isometric-cube mark and the slanted bar rows).
 */
export const parallelogram: PrimitivePathBuilder = (cellSize, rotation, invert) => {
  const mid = cellSize / 2;
  const local: PathSegment[] = [
    { command: "M", x: mid, y: 0 },
    { command: "L", x: cellSize, y: 0 },
    { command: "L", x: mid, y: cellSize },
    { command: "L", x: 0, y: cellSize },
    { command: "Z" },
  ];
  return local.map((segment) => transformPathSegment(segment, cellSize, rotation, invert));
};
```

Add `export { parallelogram } from "./parallelogram.js";` to `src/core/primitives/index.ts` (alphabetical — after `pinwheelArc`... actually after `ogee`, before `pinwheelArc`: `p-a-r` < `p-i-n`, so before `pinwheelArc`). Match the existing alphabetical ordering exactly; if unsure, run `npx biome check --write .` which enforces it.

In `src/core/registry.ts`: add `parallelogram` to the import list, append after the `diamond` entry:

```ts
  { name: "diamond", build: diamond },
  { name: "parallelogram", build: parallelogram },
];
```

- [ ] **Step 4: Add the registry tests**

In `test/core/registry.test.ts`, add after `pins diamond at index 14`:

```ts
  it("pins parallelogram at index 15", () => {
    expect(PRIMITIVE_REGISTRY[15]?.name).toBe("parallelogram");
  });
```

Update the "contains exactly the fifteen…" test → `sixteen`, append `"parallelogram"` to the array.

- [ ] **Step 5: Run tests**

Run: `cd ../BitShaper-core-new-primitives && npx vitest run test/core/primitives/parallelogram.test.ts test/core/registry.test.ts`
Expected: PASS.

- [ ] **Step 6: Run biome**

Run: `npx biome check --write . && npx biome check .`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/core/primitives/parallelogram.ts src/core/primitives/index.ts src/core/registry.ts test/core/primitives/parallelogram.test.ts test/core/registry.test.ts
git commit -m "feat(core): add parallelogram primitive (index 15)"
```

---

## Task 3: `bar` primitive (index 16)

**Files:**
- Create: `src/core/primitives/bar.ts`
- Create: `test/core/primitives/bar.test.ts`
- Modify: `src/core/primitives/index.ts`, `src/core/registry.ts`, `test/core/registry.test.ts`

**Interfaces:**
- Produces: `export const bar: PrimitivePathBuilder`; `PRIMITIVE_REGISTRY[16] = { name: "bar", build: bar }`.

- [ ] **Step 1: Write the failing test**

Create `test/core/primitives/bar.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { bar } from "../../../src/core/primitives/bar.js";

describe("bar", () => {
  it("is a centred horizontal band of full width and half-cell thickness, at rotation 0", () => {
    expect(bar(100, 0, false)).toEqual([
      { command: "M", x: 0, y: 25 },
      { command: "L", x: 100, y: 25 },
      { command: "L", x: 100, y: 75 },
      { command: "L", x: 0, y: 75 },
      { command: "Z" },
    ]);
  });

  it("closes the path and uses no arcs", () => {
    const segs = bar(100, 0, false);
    expect(segs.at(-1)).toEqual({ command: "Z" });
    expect(segs.some((s) => s.command === "A")).toBe(false);
  });

  it("becomes a vertical band under 90 degree rotation", () => {
    // local (0,25) about centre (50,50) rotated 90deg clockwise -> (75,0)
    expect(bar(100, 90, false)[0]).toEqual({ command: "M", x: 75, y: 0 });
  });

  it("is unchanged by invert (symmetric about the vertical axis)", () => {
    expect(bar(100, 0, true)).toEqual(bar(100, 0, false));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ../BitShaper-core-new-primitives && npx vitest run test/core/primitives/bar.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/core/primitives/bar.ts`:

```ts
import { type PathSegment, type PrimitivePathBuilder, transformPathSegment } from "./transform.js";

/**
 * The bar primitive: a centred, axis-aligned band spanning the full cell
 * width, with a thickness of `cellSize / 2` (band edges at the cell's
 * vertical quarter points). The axis-aligned sibling of {@link diagonalBand}
 * (which is sheared) — stacked bars read as stripes, crossed bars as plaid.
 * Symmetric about the vertical axis, so invert is a visual no-op. Derived
 * from `samples/new 4/` (the offset horizontal stripes).
 */
export const bar: PrimitivePathBuilder = (cellSize, rotation, invert) => {
  const quarter = cellSize / 4;
  const local: PathSegment[] = [
    { command: "M", x: 0, y: quarter },
    { command: "L", x: cellSize, y: quarter },
    { command: "L", x: cellSize, y: cellSize - quarter },
    { command: "L", x: 0, y: cellSize - quarter },
    { command: "Z" },
  ];
  return local.map((segment) => transformPathSegment(segment, cellSize, rotation, invert));
};
```

Add `export { bar } from "./bar.js";` to `src/core/primitives/index.ts` (alphabetical — first, before `arcBand`: `bar` > `arcBand`, so after `arcBand`, before `bulge`). Run `npx biome check --write .` to fix ordering.

In `src/core/registry.ts`: add `bar` to imports, append after `parallelogram`:

```ts
  { name: "parallelogram", build: parallelogram },
  { name: "bar", build: bar },
];
```

- [ ] **Step 4: Add the registry tests**

Add after `pins parallelogram at index 15`:

```ts
  it("pins bar at index 16", () => {
    expect(PRIMITIVE_REGISTRY[16]?.name).toBe("bar");
  });
```

Update "contains exactly the sixteen…" → `seventeen`, append `"bar"`.

- [ ] **Step 5: Run tests**

Run: `cd ../BitShaper-core-new-primitives && npx vitest run test/core/primitives/bar.test.ts test/core/registry.test.ts`
Expected: PASS.

- [ ] **Step 6: Run biome**

Run: `npx biome check --write . && npx biome check .`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/core/primitives/bar.ts src/core/primitives/index.ts src/core/registry.ts test/core/primitives/bar.test.ts test/core/registry.test.ts
git commit -m "feat(core): add bar primitive (index 16)"
```

---

## Task 4: `gable` primitive (index 17)

**Files:**
- Create: `src/core/primitives/gable.ts`
- Create: `test/core/primitives/gable.test.ts`
- Modify: `src/core/primitives/index.ts`, `src/core/registry.ts`, `test/core/registry.test.ts`

**Interfaces:**
- Produces: `export const gable: PrimitivePathBuilder`; `PRIMITIVE_REGISTRY[17] = { name: "gable", build: gable }`.

- [ ] **Step 1: Write the failing test**

Create `test/core/primitives/gable.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { gable } from "../../../src/core/primitives/gable.js";

describe("gable", () => {
  it("is a triangle with its base on the bottom edge and apex at the top-edge midpoint, at rotation 0", () => {
    expect(gable(100, 0, false)).toEqual([
      { command: "M", x: 0, y: 100 },
      { command: "L", x: 100, y: 100 },
      { command: "L", x: 50, y: 0 },
      { command: "Z" },
    ]);
  });

  it("closes the path and uses no arcs", () => {
    const segs = gable(100, 0, false);
    expect(segs.at(-1)).toEqual({ command: "Z" });
    expect(segs.some((s) => s.command === "A")).toBe(false);
  });

  it("points its apex the other way under 180 degree rotation", () => {
    // local apex (50,0) about centre (50,50) rotated 180 -> (50,100)
    const apex = gable(100, 180, false).find((s) => s.command === "L" && s.y === 100 && s.x === 50);
    expect(apex).toEqual({ command: "L", x: 50, y: 100 });
  });

  it("is unchanged by invert (symmetric about the vertical axis)", () => {
    expect(gable(100, 0, true)).toEqual(gable(100, 0, false));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd ../BitShaper-core-new-primitives && npx vitest run test/core/primitives/gable.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/core/primitives/gable.ts`:

```ts
import { type PathSegment, type PrimitivePathBuilder, transformPathSegment } from "./transform.js";

/**
 * The gable primitive: an isosceles triangle with its base on the cell's
 * bottom edge and its apex at the midpoint of the top edge (points up at
 * rotation 0). The straight-line sibling of {@link cap} (a semicircle over a
 * full edge); two gables base-to-base tile a {@link diamond}. Symmetric
 * about the vertical axis, so invert is a visual no-op. A faceted companion
 * motif for the `samples/new 4/` marks.
 */
export const gable: PrimitivePathBuilder = (cellSize, rotation, invert) => {
  const local: PathSegment[] = [
    { command: "M", x: 0, y: cellSize },
    { command: "L", x: cellSize, y: cellSize },
    { command: "L", x: cellSize / 2, y: 0 },
    { command: "Z" },
  ];
  return local.map((segment) => transformPathSegment(segment, cellSize, rotation, invert));
};
```

Add `export { gable } from "./gable.js";` to `src/core/primitives/index.ts` (alphabetical — after `fillet`, before `leaf`). Run `npx biome check --write .`.

In `src/core/registry.ts`: add `gable` to imports, append after `bar`:

```ts
  { name: "bar", build: bar },
  { name: "gable", build: gable },
];
```

- [ ] **Step 4: Add the registry tests**

Add after `pins bar at index 16`:

```ts
  it("pins gable at index 17", () => {
    expect(PRIMITIVE_REGISTRY[17]?.name).toBe("gable");
  });
```

Update "contains exactly the seventeen…" → `eighteen`, append `"gable"`. The final array must be:

```ts
[
  "empty", "fill", "fillet", "bulge", "circle", "wedge", "cap", "pinwheel-arc",
  "step", "ogee", "round-corner", "arc-band", "diagonal-band", "leaf",
  "diamond", "parallelogram", "bar", "gable",
]
```

- [ ] **Step 5: Run the full core test suite**

Run: `cd ../BitShaper-core-new-primitives && npx vitest run test/core`
Expected: PASS (all).

- [ ] **Step 6: Run biome**

Run: `npx biome check --write . && npx biome check .`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/core/primitives/gable.ts src/core/primitives/index.ts src/core/registry.ts test/core/primitives/gable.test.ts test/core/registry.test.ts
git commit -m "feat(core): add gable primitive (index 17)"
```

---

## Task 5: Update architecture + survey docs

**Files:**
- Modify: `docs/architecture.md`
- Modify: `docs/primitive-survey.md`

- [ ] **Step 1: Update `docs/architecture.md`**

In the `primitives/` block of the directory map, the comment lists a few example primitive files. Add the four new files to that listing so it reads (keeping the existing `# …` comments):

```
│   │   └── primitives/
│   │       ├── empty.ts       # one pure function per primitive
│   │       ├── fill.ts
│   │       ├── fillet.ts
│   │       ├── bulge.ts
│   │       ├── …               # circle, wedge, cap, pinwheel-arc, step, ogee,
│   │       │                   # round-corner, arc-band, diagonal-band, leaf
│   │       ├── diamond.ts      # square-on-point, vertices at edge midpoints
│   │       ├── parallelogram.ts # full-height sheared quad
│   │       ├── bar.ts          # centred axis-aligned band, half-cell thick
│   │       ├── gable.ts        # triangle, apex at opposite-edge midpoint
│   │       └── index.ts        # exports primitives in stable registration order
```

If the existing map already enumerates every primitive file individually, instead insert the four new lines in the same style at the end (before `index.ts`), matching registry order.

- [ ] **Step 2: Update `docs/primitive-survey.md`**

Append a new section at the end:

```markdown
## Addendum (2026-09-07): `samples/new 4/` pass (Change C)

Surveyed the five screenshots in `samples/new 4/` against the 14 existing
primitives. Four additions (registry indices 14–17):

- **`diamond`** (14) — square on its point, vertices at the edge midpoints.
  Sample 1 (45-degree checkerboard) and the centre of sample 5.
- **`parallelogram`** (15) — full-height quad, top edge sheared right by
  `cellSize / 2`. Samples 3 (isometric-cube mark) and 4 (slanted bar rows);
  the cube is an evocation, not a pixel match (true isometric is off-grid).
- **`bar`** (16) — centred axis-aligned band, full width, half-cell thick.
  Sample 2 (offset horizontal stripes). Distinct from `diagonal-band`
  (sheared) and from edge-flush `fill` at a finer grid.
- **`gable`** (17) — triangle, base on one edge, apex at the opposite edge
  midpoint. Weakly evidenced in the samples; kept as a faceted companion to
  `diamond`/`cap` (two gables base-to-base form a `diamond`).

See `docs/superpowers/specs/2026-09-07-bitshaper-new-primitives-design.md`
for the full analysis and the edge-signature adjacency table.
```

- [ ] **Step 3: Verify docs build / no broken references**

Run: `cd ../BitShaper-core-new-primitives && npx biome check docs/ 2>/dev/null || true`
Expected: biome does not lint markdown; this is a no-op sanity check. Visually confirm both files read correctly.

- [ ] **Step 4: Commit**

```bash
git add docs/architecture.md docs/primitive-survey.md
git commit -m "docs: list Change C primitives in architecture + survey"
```

---

## Task 6: Curated catalog entries

**Files:**
- Create (throwaway): `scripts/gen-catalog-ids.mjs`
- Modify: `src/library/catalog.json`

**Interfaces:**
- Consumes: `generateShapeDef` is NOT used here (it randomizes types); instead build `ShapeDef` literals and call `encodeShapeId`. `ShapeDef` = `{ cols: number, rows: number, cells: CellDef[] }` (row-major, `cells.length === cols * rows`); `CellDef` = `{ type: number, rotation: 0|90|180|270, invert: boolean }` (verified against `src/core/types.ts`).

- [ ] **Step 1: Build the package**

Run: `cd ../BitShaper-core-new-primitives && npm run build`
Expected: builds to `dist/` with no errors.

- [ ] **Step 2: Write the throwaway ID-generator script**

Create `scripts/gen-catalog-ids.mjs`. Read `src/core/types.ts` first to confirm `ShapeDef`/`CellDef` field names, then:

```js
import { encodeShapeId, decodeShapeId, renderShape } from "../dist/index.js";

// type indices: empty=0 fill=1 fillet=2 bulge=3 circle=4 wedge=5 cap=6
// pinwheel-arc=7 step=8 ogee=9 round-corner=10 arc-band=11 diagonal-band=12
// leaf=13 diamond=14 parallelogram=15 bar=16 gable=17
const R0 = { rotation: 0, invert: false };
const cell = (type, rotation = 0, invert = false) => ({ type, rotation, invert });

const shapes = [
  {
    name: "Diamond Lattice",
    tags: ["geometric", "symmetric", "from-sample"],
    def: { cols: 3, rows: 3, cells: Array.from({ length: 9 }, () => cell(14)) },
  },
  {
    name: "Cube Corner",
    tags: ["geometric", "asymmetric", "from-sample"],
    def: {
      cols: 2, rows: 2,
      cells: [cell(15, 0, false), cell(15, 0, true), cell(15, 0, true), cell(15, 0, false)],
    },
  },
  {
    name: "Ribbon Rows",
    tags: ["geometric", "rotational", "from-sample"],
    def: {
      cols: 2, rows: 2,
      cells: [cell(15), cell(15), cell(15), cell(15)],
    },
  },
  {
    name: "Bar Plaid",
    tags: ["geometric", "symmetric", "from-sample"],
    def: {
      cols: 2, rows: 2,
      cells: [cell(16, 0), cell(16, 90), cell(16, 90), cell(16, 0)],
    },
  },
  {
    name: "Faceted Bloom",
    tags: ["geometric", "rotational", "from-sample"],
    def: {
      cols: 2, rows: 2,
      cells: [cell(17, 90), cell(17, 180), cell(17, 0), cell(17, 270)],
    },
  },
  {
    name: "Lobed Emblem",
    tags: ["organic", "symmetric", "from-sample"],
    def: {
      cols: 2, rows: 2,
      cells: [cell(6, 180), cell(6, 90), cell(6, 270), cell(6, 0)],
    },
  },
];

for (const s of shapes) {
  const id = encodeShapeId(s.def);
  // round-trip + render must both succeed, mirroring test/library/index.test.ts
  if (encodeShapeId(decodeShapeId(id)) !== id) throw new Error(`not canonical: ${s.name} ${id}`);
  renderShape(id);
  console.log(JSON.stringify({ id, name: s.name, tags: s.tags }, null, 2) + ",");
}
```

Notes for the implementer:
- "Lobed Emblem" uses only `cap` (existing) — it echoes sample 5's outer lobes; adjust one cell to `cell(14)` (diamond) at a 3×3 grid centre if you want a new primitive in it. At minimum, 4 of the 6 entries must use a new primitive (indices 14–17). "Lobed Emblem" is optional — drop it if it doesn't use a new primitive.
- If `encodeShapeId` throws `invalid-shape-def`, the `ShapeDef` field names are wrong — re-check `src/core/types.ts` (`grid` may be `{ cols, rows }` or a tuple; cells may need to exactly equal `cols * rows`).
- Rotations that make a symmetric primitive (14, 16, 17) visually identical are fine for ID generation but pick rotations that produce a visually interesting shape.

- [ ] **Step 3: Run the script**

Run: `cd ../BitShaper-core-new-primitives && node scripts/gen-catalog-ids.mjs`
Expected: prints 5–6 JSON objects, each with a `BS2-…` id, no thrown errors.

- [ ] **Step 4: Add entries to `src/library/catalog.json`**

Paste the printed objects into the top-level array in `src/library/catalog.json` (after the existing entries, before the closing `]`; remove the trailing comma after the last one). Keep the existing formatting style (2-space indent, `id`/`name`/`tags` key order).

- [ ] **Step 5: Run the catalog test**

Run: `cd ../BitShaper-core-new-primitives && npx vitest run test/library/index.test.ts`
Expected: PASS — every new `"<name>" (<id>) decodes, renders, and is canonical` test green.

- [ ] **Step 6: Delete the throwaway script**

```bash
rm scripts/gen-catalog-ids.mjs
rmdir scripts 2>/dev/null || true
```

- [ ] **Step 7: Run biome + commit**

Run: `npx biome check --write . && npx biome check .`
Expected: clean.

```bash
git add src/library/catalog.json
git commit -m "feat(library): curate example shapes using the Change C primitives"
```

---

## Task 7: Full verification + PR

**Files:** none (verification only).

- [ ] **Step 1: Full test suite**

Run: `cd ../BitShaper-core-new-primitives && npm test`
Expected: all suites PASS. If any registry count test still says `fourteen`/`fifteen`/etc., fix to `eighteen` and the full 18-name array, then re-run.

- [ ] **Step 2: Biome**

Run: `npx biome check .`
Expected: clean, zero diagnostics.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: ESM + CJS output, no type errors.

- [ ] **Step 4: Confirm no stray files**

Run: `git status`
Expected: clean tree, no `scripts/`, no `dist/` staged (dist is gitignored — confirm).

- [ ] **Step 5: Push and open PR**

```bash
git push -u origin core-new-primitives
gh pr create --title "Change C: new primitives + curated examples" --body "$(cat <<'EOF'
## Summary

Adds four grid-cell primitives derived from `samples/new 4/`, appended to the registry at indices 14–17:

- **`diamond`** (14) — square on its point, vertices at the edge midpoints (sample 1; centre of sample 5).
- **`parallelogram`** (15) — full-height quad, top edge sheared right by `cellSize/2`; invert → backslash slant (samples 3–4).
- **`bar`** (16) — centred axis-aligned band, full width, half-cell thick; the axis-aligned sibling of `diagonal-band` (sample 2).
- **`gable`** (17) — triangle, base on one edge, apex at the opposite edge midpoint; straight sibling of `cap`, two form a `diamond`.

Each primitive: one pure `(cellSize, rotation, invert) => PathSegment[]` builder, straight-line segments only, no SVG `transform=`, coordinates mapped through `transformPathSegment`. Registry + `primitives/index.ts` are append-only; pinned-index tests added for all four.

Also:
- 5–6 curated catalog entries in `src/library/catalog.json` using the new primitives (every id round-trips and renders — enforced by `test/library/index.test.ts`).
- `docs/architecture.md` and `docs/primitive-survey.md` updated.
- Design doc: `docs/superpowers/specs/2026-09-07-bitshaper-new-primitives-design.md`.

## Verification

- `npm test` — all green
- `npx biome check .` — clean
- `npm run build` — ok

Do not merge — leaving for review.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 6: Report the PR URL to the user. Do NOT merge.**

---

## Self-Review

**Spec coverage:**
- diamond / parallelogram / bar / gable geometry → Tasks 1–4 (exact segment tests match the design doc's canonical path data).
- Append-only registry + pinned-index tests → Tasks 1–4 Step 4.
- "contains exactly N" test updated incrementally → Tasks 1–4 (fifteen → sixteen → seventeen → eighteen).
- Per-primitive tests (segment output, closed path, no arcs, rotation, invert) → Tasks 1–4 Step 1.
- Adjacency table → documented in the design doc; not code, no task needed.
- Catalog additions using new primitives + renderable test → Task 6.
- `docs/architecture.md` + `docs/primitive-survey.md` → Task 5.
- Verification (`npm test`, `biome`, `build`) + PR, no merge → Task 7.
- Not touching `web/` → no task references `web/`; sibling agent owns Change D.

**Placeholder scan:** No TBD/TODO. Every code step has complete code. Task 6 Step 2 flags the one genuine unknown (`ShapeDef` field names) with an explicit "read `src/core/types.ts` to confirm" instruction and a fallback if `encodeShapeId` throws.

**Type consistency:** `PrimitivePathBuilder` signature identical across Tasks 1–4. Registry entry shape `{ name, build }` matches existing `registry.ts`. `cell(type, rotation, invert)` helper in Task 6 matches `CellDef` from `types.ts`. Flat-index formula stated once in Global Constraints, not re-derived per task.
