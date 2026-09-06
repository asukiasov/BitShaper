# Poster Tab (Change D) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a self-contained `Poster` tab to the BitShaper web app that composes one picked shape into a modernist "grid of marks" poster with editable text, palette, and layout, shareable via URL and exportable as SVG + PNG.

**Architecture:** Three new pure/DOM modules under `web/src/` — `poster-templates.ts` (pure SVG string builder), `poster-state.ts` (pure URL read/write), `poster.ts` (vanilla-DOM tab UI) — plus a small non-square extension to `export-png.ts` and `TABS`/layout wiring in `main.ts`. Nothing in `src/core/` or `src/library/` changes.

**Tech Stack:** TypeScript, Vite, Vitest (jsdom), Biome. The `bitshaper` package (`renderShape`, `decodeShapeId`) and `bitshaper/library` (`listCatalog`) are workspace deps already used by `web/src/`.

## Global Constraints

- Work only under `web/` and `docs/`. Do not touch `src/`, `test/`, `openspec/` (Change C owns core).
- Vanilla DOM, explicit `document.createElement`. No new dependencies.
- ESM imports within `web/src` use the `.js` extension (e.g. `"./poster-state.js"`).
- Styles go in `web/src/style.css` using the existing `--bs-*` dark tokens.
- Tests live in `web/test/` mirroring `web/src/`; `environment: "jsdom"`, `globals: true`.
- Poster export aspect is 2:3 portrait — `viewBox="0 0 1000 1500"`, PNG 2000×3000.
- Run from `web/`: `npx vitest run`, `npx tsc --noEmit`, `npm run build`. From repo root: `npm test`, `npx biome check .`.
- Commit after every task with a `feat(web):` / `test(web):` / `chore(web):` prefix.

---

### Task 1: Non-square PNG export

**Files:**
- Modify: `web/src/export-png.ts`
- Test: `web/test/export-png.test.ts` (create)

**Interfaces:**
- Produces: `exportPng(svgMarkup: string, opts?: { size?: number; width?: number; height?: number; filename?: string }): Promise<void>` — `width`/`height` override the square `size` when present.

- [ ] **Step 1: Write the failing test**

```ts
// web/test/export-png.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { triggerDownload } from "../src/download.js";
import { exportPng } from "../src/export-png.js";

vi.mock("../src/download.js", () => ({ triggerDownload: vi.fn() }));

describe("exportPng canvas sizing", () => {
  let created: HTMLCanvasElement[];

  beforeEach(() => {
    created = [];
    vi.mocked(triggerDownload).mockClear();
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = realCreate(tag) as HTMLElement;
      if (tag === "canvas") {
        const canvas = el as HTMLCanvasElement;
        canvas.getContext = () => ({ drawImage: () => {} }) as unknown as CanvasRenderingContext2D;
        canvas.toBlob = (cb: BlobCallback) => cb(new Blob(["png"], { type: "image/png" }));
        created.push(canvas);
      }
      return el;
    });
    // Make the offscreen Image resolve synchronously.
    Object.defineProperty(globalThis, "Image", {
      configurable: true,
      value: class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_v: string) {
          queueMicrotask(() => this.onload?.());
        }
      },
    });
    vi.stubGlobal("URL", Object.assign(Object.create(URL), {
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sizes the canvas to width/height when given", async () => {
    await exportPng("<svg/>", { width: 2000, height: 3000, filename: "poster.png" });
    expect(created[0].width).toBe(2000);
    expect(created[0].height).toBe(3000);
    expect(triggerDownload).toHaveBeenCalledWith(expect.any(Blob), "poster.png");
  });

  it("still supports the square size shorthand", async () => {
    await exportPng("<svg/>", { size: 512 });
    expect(created[0].width).toBe(512);
    expect(created[0].height).toBe(512);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run test/export-png.test.ts`
Expected: FAIL — first test gets a 512-square canvas (width option ignored).

- [ ] **Step 3: Implement the extension**

Replace the body of `web/src/export-png.ts` with:

```ts
import { triggerDownload } from "./download.js";

/** Default filename used for a downloaded PNG export. */
const DEFAULT_FILENAME = "bitshaper-mark.png";

/** Default rasterized PNG width/height, in pixels, when no size is given. */
const DEFAULT_SIZE = 512;

/** Options accepted by {@link exportPng}. */
export interface ExportPngOptions {
  /** Square width/height in pixels. Defaults to 512. Ignored when `width`/`height` are set. */
  readonly size?: number;
  /** Explicit canvas width in pixels. Overrides `size`. */
  readonly width?: number;
  /** Explicit canvas height in pixels. Overrides `size`. */
  readonly height?: number;
  /** Filename used for the downloaded file. Defaults to `bitshaper-mark.png`. */
  readonly filename?: string;
}

/**
 * Rasterizes `svgMarkup` to PNG client-side (via an offscreen `<canvas>`)
 * and triggers a browser download of the result.
 */
export async function exportPng(svgMarkup: string, opts?: ExportPngOptions): Promise<void> {
  const square = opts?.size ?? DEFAULT_SIZE;
  const width = opts?.width ?? square;
  const height = opts?.height ?? square;
  const filename = opts?.filename ?? DEFAULT_FILENAME;
  const pngBlob = await rasterizeSvgToPng(svgMarkup, width, height);
  triggerDownload(pngBlob, filename);
}

/** Draws `svgMarkup` into an offscreen canvas and reads it back as a PNG blob. */
function rasterizeSvgToPng(svgMarkup: string, width: number, height: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const svgUrl = URL.createObjectURL(new Blob([svgMarkup], { type: "image/svg+xml" }));
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(svgUrl);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context is not available in this browser."));
        return;
      }

      ctx.drawImage(image, 0, 0, width, height);
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) {
          reject(new Error("Failed to rasterize the preview to PNG."));
          return;
        }
        resolve(pngBlob);
      }, "image/png");
    };

    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error("Failed to load the preview SVG for rasterization."));
    };

    image.src = svgUrl;
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run test/export-png.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/export-png.ts web/test/export-png.test.ts
git commit -m "feat(web): non-square canvas support in exportPng"
```

---

### Task 2: `poster-templates.ts` — poster SVG renderer

**Files:**
- Create: `web/src/poster-templates.ts`
- Test: `web/test/poster-templates.test.ts`

**Interfaces:**
- Consumes: `renderShape`, `decodeShapeId` from `bitshaper`; `listCatalog` from `bitshaper/library`.
- Produces:
  - `type PaletteKey = "mono" | "ink" | "violet" | "forest" | "blueprint"`
  - `type TextPos = "top-left" | "top-split" | "bottom-left"`
  - `type Pattern = "checker" | "rows"`
  - `interface PosterState { shapeId; title; subtitle; caption; textPos; cols; rows; palette; pattern; seed }` (all readonly; `cols`/`rows` numbers, rest strings/unions)
  - `const POSTER_VIEWBOX = { w: 1000, h: 1500 } as const`
  - `const PALETTES: Record<PaletteKey, { readonly fg: string; readonly bg: string; readonly accent: string }>`
  - `const DEFAULT_POSTER_STATE: PosterState`
  - `function renderPosterSvg(state: PosterState): string`

- [ ] **Step 1: Write the failing test**

```ts
// web/test/poster-templates.test.ts
import { describe, expect, it } from "vitest";
import {
  DEFAULT_POSTER_STATE,
  PALETTES,
  type PosterState,
  renderPosterSvg,
} from "../src/poster-templates.js";

const base: PosterState = { ...DEFAULT_POSTER_STATE, title: "HELLO", cols: 3, rows: 4 };

describe("renderPosterSvg", () => {
  it("returns one 2:3 svg with the escaped title", () => {
    const svg = renderPosterSvg({ ...base, title: "A & B <x>" });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('viewBox="0 0 1000 1500"');
    expect(svg).toContain("A &amp; B &lt;x&gt;");
  });

  it("emits one <g> group per grid cell", () => {
    const svg = renderPosterSvg(base);
    expect((svg.match(/<g transform/g) ?? []).length).toBe(3 * 4);
  });

  it("paints the selected palette background", () => {
    const svg = renderPosterSvg({ ...base, palette: "violet" });
    expect(svg).toContain(`fill="${PALETTES.violet.bg}"`);
  });

  it("checker and rows patterns place the accent colour differently", () => {
    const checker = renderPosterSvg({ ...base, pattern: "checker", palette: "violet" });
    const rows = renderPosterSvg({ ...base, pattern: "rows", palette: "violet" });
    expect(checker).not.toEqual(rows);
    expect(checker).toContain(`fill="${PALETTES.violet.accent}"`);
  });

  it("does not throw on an undecodable shape id and shows a note", () => {
    const svg = renderPosterSvg({ ...base, shapeId: "not-a-real-id" });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("valid shape ID");
  });

  it("omits the footer caption element when caption is empty", () => {
    const withCap = renderPosterSvg({ ...base, textPos: "top-left", caption: " finis " });
    const noCap = renderPosterSvg({ ...base, textPos: "top-left", caption: "" });
    expect(withCap).toContain("finis");
    expect((noCap.match(/<text /g) ?? []).length).toBeLessThan((withCap.match(/<text /g) ?? []).length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run test/poster-templates.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `web/src/poster-templates.ts`**

```ts
import { decodeShapeId, renderShape } from "bitshaper";
import { listCatalog } from "bitshaper/library";

export type PaletteKey = "mono" | "ink" | "violet" | "forest" | "blueprint";
export type TextPos = "top-left" | "top-split" | "bottom-left";
export type Pattern = "checker" | "rows";

export interface PosterState {
  readonly shapeId: string;
  readonly title: string;
  readonly subtitle: string;
  readonly caption: string;
  readonly textPos: TextPos;
  readonly cols: number;
  readonly rows: number;
  readonly palette: PaletteKey;
  readonly pattern: Pattern;
  /** Drives the per-cell rotation-cycle offset; "" = no offset. */
  readonly seed: string;
}

export const POSTER_VIEWBOX = { w: 1000, h: 1500 } as const;

export const PALETTES: Record<
  PaletteKey,
  { readonly fg: string; readonly bg: string; readonly accent: string }
> = {
  mono: { bg: "#f2efe9", fg: "#141414", accent: "#8a8a8a" },
  ink: { bg: "#efe7d6", fg: "#0c0c0c", accent: "#3a3a3a" },
  violet: { bg: "#ffffff", fg: "#111111", accent: "#7c5cff" },
  forest: { bg: "#d8cbb0", fg: "#1f3d2b", accent: "#3f6b4f" },
  blueprint: { bg: "#12233b", fg: "#eef2f7", accent: "#8fb3d9" },
};

/** First curated catalog shape — always valid + renderable. */
const DEFAULT_SHAPE_ID = listCatalog()[0]?.id ?? "BS-2X2-8888W";

export const DEFAULT_POSTER_STATE: PosterState = {
  shapeId: DEFAULT_SHAPE_ID,
  title: "GRAPHIQUE",
  subtitle: "modern series 01",
  caption: "BitShaper poster study",
  textPos: "top-left",
  cols: 4,
  rows: 5,
  palette: "mono",
  pattern: "checker",
  seed: "",
};

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MARGIN = 70;
const TEXT_BAND = 210;
const SHAPE_BOX = 256; // renderShape default coord box

const XML: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => XML[c] as string);
}
function fmt(n: number): string {
  return String(Math.round(n * 1000) / 1000);
}
function clampInt(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}
function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}
/** Pulls the `d` of the first <path> in renderShape() output ("" if none). */
function extractPathD(markup: string): string {
  const m = markup.match(/<path[^>]*\sd="([^"]*)"/);
  return m ? (m[1] as string) : "";
}

const ROTATIONS = [0, 90, 180, 270];

export function renderPosterSvg(state: PosterState): string {
  const { w, h } = POSTER_VIEWBOX;
  const pal = PALETTES[state.palette] ?? PALETTES.mono;
  const cols = clampInt(state.cols, 1, 8);
  const rows = clampInt(state.rows, 1, 12);
  const hasCaption = state.caption.trim().length > 0;
  const textAtTop = state.textPos !== "bottom-left";

  // Vertical bands: text occupies TEXT_BAND on its side; caption footer only
  // exists for the top-* layouts (bottom-left stacks the caption in-band).
  const footerH = textAtTop && hasCaption ? 80 : 0;
  const gridTop = textAtTop ? MARGIN + TEXT_BAND : MARGIN;
  const gridBottom = textAtTop ? h - MARGIN - footerH : h - MARGIN - TEXT_BAND;

  const areaW = w - MARGIN * 2;
  const areaH = Math.max(1, gridBottom - gridTop);
  const cell = Math.min(areaW / cols, areaH / rows);
  const gridX = MARGIN + (areaW - cell * cols) / 2;
  const gridY = gridTop + (areaH - cell * rows) / 2;

  let cellD = "";
  try {
    decodeShapeId(state.shapeId);
    cellD = extractPathD(renderShape(state.shapeId, { size: SHAPE_BOX }));
  } catch {
    cellD = "";
  }

  const seedOffset = state.seed ? hashSeed(state.seed) % 4 : 0;
  const scale = cell / SHAPE_BOX;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`,
    `<rect width="${w}" height="${h}" fill="${pal.bg}"/>`,
  ];

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const accent = state.pattern === "checker" ? (r + c) % 2 === 1 : r % 2 === 1;
      const fill = accent ? pal.accent : pal.fg;
      const x = gridX + c * cell;
      const y = gridY + r * cell;
      const deg = ROTATIONS[(c + r + seedOffset) % 4];
      const inner = cellD
        ? `<path d="${cellD}" fill="${fill}"/>`
        : `<rect width="${SHAPE_BOX}" height="${SHAPE_BOX}" fill="none" stroke="${fill}" stroke-width="4"/>`;
      parts.push(
        `<g transform="translate(${fmt(x)} ${fmt(y)}) scale(${fmt(scale)}) rotate(${deg} ${SHAPE_BOX / 2} ${SHAPE_BOX / 2})">${inner}</g>`,
      );
    }
  }

  const text = (
    x: number,
    y: number,
    size: number,
    weight: number,
    content: string,
    anchor: "start" | "end",
  ): string =>
    `<text x="${fmt(x)}" y="${fmt(y)}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${pal.fg}" text-anchor="${anchor}">${esc(content)}</text>`;

  const rule = (y: number): string =>
    `<line x1="${MARGIN}" y1="${fmt(y)}" x2="${w - MARGIN}" y2="${fmt(y)}" stroke="${pal.fg}" stroke-width="3"/>`;

  if (state.textPos === "top-left") {
    parts.push(text(MARGIN, MARGIN + 66, 66, 700, state.title, "start"));
    if (state.subtitle) parts.push(text(MARGIN, MARGIN + 104, 22, 400, state.subtitle, "start"));
    parts.push(rule(MARGIN + TEXT_BAND - 34));
    if (hasCaption) parts.push(text(MARGIN, h - MARGIN, 20, 400, state.caption, "start"));
  } else if (state.textPos === "top-split") {
    parts.push(text(MARGIN, MARGIN + 66, 66, 700, state.title, "start"));
    if (state.subtitle) parts.push(text(w - MARGIN, MARGIN + 60, 26, 700, state.subtitle, "end"));
    parts.push(rule(MARGIN + TEXT_BAND - 34));
    if (hasCaption) parts.push(text(MARGIN, h - MARGIN, 20, 400, state.caption, "start"));
  } else {
    const bandTop = h - MARGIN - TEXT_BAND;
    parts.push(rule(bandTop));
    parts.push(text(MARGIN, bandTop + 62, 66, 700, state.title, "start"));
    if (state.subtitle) parts.push(text(MARGIN, bandTop + 100, 22, 400, state.subtitle, "start"));
    if (hasCaption) parts.push(text(MARGIN, bandTop + 146, 20, 400, state.caption, "start"));
  }

  if (!cellD) {
    parts.push(
      `<text x="${MARGIN}" y="${h / 2}" font-family="${FONT}" font-size="22" fill="${pal.fg}">Enter a valid shape ID</text>`,
    );
  }

  parts.push("</svg>");
  return parts.join("");
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run test/poster-templates.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/poster-templates.ts web/test/poster-templates.test.ts
git commit -m "feat(web): poster SVG renderer (grid-of-marks template)"
```

---

### Task 3: `poster-state.ts` — URL read/write

**Files:**
- Create: `web/src/poster-state.ts`
- Test: `web/test/poster-state.test.ts`

**Interfaces:**
- Consumes: `DEFAULT_POSTER_STATE`, `PALETTES`, `PosterState`, `PaletteKey`, `Pattern`, `TextPos` from `./poster-templates.js`.
- Produces:
  - `function readPosterFromUrl(): PosterState` — always a complete state; unknown/out-of-range values fall back to defaults.
  - `function updatePosterUrl(state: PosterState, opts?: { readonly push?: boolean }): void` — writes only non-default params, leaves `?id=` and the hash untouched.

- [ ] **Step 1: Write the failing test**

```ts
// web/test/poster-state.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_POSTER_STATE, type PosterState } from "../src/poster-templates.js";
import { readPosterFromUrl, updatePosterUrl } from "../src/poster-state.js";

beforeEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("poster-state", () => {
  it("returns the default state when no params are present", () => {
    expect(readPosterFromUrl()).toEqual(DEFAULT_POSTER_STATE);
  });

  it("round-trips a non-default state through the URL", () => {
    const state: PosterState = {
      ...DEFAULT_POSTER_STATE,
      shapeId: "BS-2X2-8888W",
      title: "TRANSITION",
      subtitle: "009",
      caption: "vector / minimal",
      textPos: "top-split",
      cols: 6,
      rows: 8,
      palette: "violet",
      pattern: "rows",
      seed: "abc",
    };
    updatePosterUrl(state);
    expect(readPosterFromUrl()).toEqual(state);
  });

  it("clamps out-of-range columns and rows", () => {
    window.history.replaceState({}, "", "/?pc=99&pr=0");
    const s = readPosterFromUrl();
    expect(s.cols).toBe(8);
    expect(s.rows).toBe(1);
  });

  it("falls back on unknown palette / position", () => {
    window.history.replaceState({}, "", "/?ppal=chartreuse&ppos=sideways");
    const s = readPosterFromUrl();
    expect(s.palette).toBe(DEFAULT_POSTER_STATE.palette);
    expect(s.textPos).toBe(DEFAULT_POSTER_STATE.textPos);
  });

  it("leaves an existing ?id= untouched and omits default params", () => {
    window.history.replaceState({}, "", "/?id=BS-2X2-8888W#poster");
    updatePosterUrl({ ...DEFAULT_POSTER_STATE, title: "X" });
    expect(window.location.search).toContain("id=BS-2X2-8888W");
    expect(window.location.search).toContain("pt=X");
    expect(window.location.search).not.toContain("ppal=");
    expect(window.location.hash).toBe("#poster");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run test/poster-state.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `web/src/poster-state.ts`**

```ts
import {
  DEFAULT_POSTER_STATE,
  PALETTES,
  type PaletteKey,
  type Pattern,
  type PosterState,
  type TextPos,
} from "./poster-templates.js";

/** URL param names, namespaced with `p` so they never collide with `?id=`. */
const P = {
  id: "pid",
  title: "pt",
  sub: "psub",
  cap: "pcap",
  pos: "ppos",
  cols: "pc",
  rows: "pr",
  pal: "ppal",
  pat: "ppat",
  seed: "pseed",
} as const;

const TEXT_POS: readonly TextPos[] = ["top-left", "top-split", "bottom-left"];
const PATTERNS: readonly Pattern[] = ["checker", "rows"];

function clampInt(raw: string | null, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(raw));
  return raw !== null && Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export function readPosterFromUrl(): PosterState {
  const q = new URLSearchParams(window.location.search);
  const d = DEFAULT_POSTER_STATE;
  const pos = q.get(P.pos);
  const pal = q.get(P.pal);
  const pat = q.get(P.pat);
  return {
    shapeId: q.get(P.id) || d.shapeId,
    title: q.get(P.title) ?? d.title,
    subtitle: q.get(P.sub) ?? d.subtitle,
    caption: q.get(P.cap) ?? d.caption,
    textPos: pos && TEXT_POS.includes(pos as TextPos) ? (pos as TextPos) : d.textPos,
    cols: clampInt(q.get(P.cols), 1, 8, d.cols),
    rows: clampInt(q.get(P.rows), 1, 12, d.rows),
    palette: pal && pal in PALETTES ? (pal as PaletteKey) : d.palette,
    pattern: pat && PATTERNS.includes(pat as Pattern) ? (pat as Pattern) : d.pattern,
    seed: q.get(P.seed) ?? d.seed,
  };
}

export function updatePosterUrl(state: PosterState, opts?: { readonly push?: boolean }): void {
  const url = new URL(window.location.href);
  const q = url.searchParams;
  const d = DEFAULT_POSTER_STATE;
  const set = (key: string, value: string, def: string): void => {
    if (value === def) q.delete(key);
    else q.set(key, value);
  };
  set(P.id, state.shapeId, d.shapeId);
  set(P.title, state.title, d.title);
  set(P.sub, state.subtitle, d.subtitle);
  set(P.cap, state.caption, d.caption);
  set(P.pos, state.textPos, d.textPos);
  set(P.cols, String(state.cols), String(d.cols));
  set(P.rows, String(state.rows), String(d.rows));
  set(P.pal, state.palette, d.palette);
  set(P.pat, state.pattern, d.pattern);
  set(P.seed, state.seed, d.seed);
  if (opts?.push) window.history.pushState(window.history.state, "", url);
  else window.history.replaceState(window.history.state, "", url);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd web && npx vitest run test/poster-state.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add web/src/poster-state.ts web/test/poster-state.test.ts
git commit -m "feat(web): poster state URL read/write"
```

---

### Task 4: `poster.ts` — the tab UI

**Files:**
- Create: `web/src/poster.ts`
- Test: `web/test/poster.test.ts`

**Interfaces:**
- Consumes: `renderPosterSvg`, `PALETTES`, `DEFAULT_POSTER_STATE`, `PosterState`, `PaletteKey`, `Pattern`, `TextPos`, `POSTER_VIEWBOX` from `./poster-templates.js`; `readPosterFromUrl`, `updatePosterUrl` from `./poster-state.js`; `tryDecodeShapeId`, `generateFilteredShapeId`, `randomSeed` from `./generate.js`; `listPrimitives` from `bitshaper`; `exportSvg` from `./export-svg.js`; `exportPng` from `./export-png.js`.
- Produces:
  - `interface PosterTabOptions { readonly getCurrentShapeId: () => string | null }`
  - `interface PosterTabHandle { readonly element: HTMLElement }`
  - `function buildPosterTab(container: HTMLElement, opts: PosterTabOptions): PosterTabHandle`

- [ ] **Step 1: Write the failing test**

```ts
// web/test/poster.test.ts
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
    expect(triggerDownload).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/^poster-.*\.svg$/));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && npx vitest run test/poster.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `web/src/poster.ts`**

```ts
import { listPrimitives } from "bitshaper";
import { exportPng } from "./export-png.js";
import { exportSvg } from "./export-svg.js";
import { generateFilteredShapeId, randomSeed, tryDecodeShapeId } from "./generate.js";
import {
  DEFAULT_POSTER_STATE,
  PALETTES,
  type PaletteKey,
  type Pattern,
  type PosterState,
  type TextPos,
  renderPosterSvg,
} from "./poster-templates.js";
import { readPosterFromUrl, updatePosterUrl } from "./poster-state.js";

export interface PosterTabOptions {
  /** Current always-visible preview shape ID, or null. Backs "Use preview shape". */
  readonly getCurrentShapeId: () => string | null;
}

export interface PosterTabHandle {
  readonly element: HTMLElement;
}

const POSITION_LABELS: Record<TextPos, string> = {
  "top-left": "Top left",
  "top-split": "Top split",
  "bottom-left": "Bottom left",
};
const PATTERN_LABELS: Record<Pattern, string> = {
  checker: "Checkerboard",
  rows: "Per row",
};
const PALETTE_LABELS: Record<PaletteKey, string> = {
  mono: "Mono",
  ink: "Ink on cream",
  violet: "Violet",
  forest: "Forest",
  blueprint: "Blueprint",
};

function labelled(text: string, control: HTMLElement): HTMLLabelElement {
  const label = document.createElement("label");
  label.className = "poster-field";
  label.append(text);
  label.appendChild(control);
  return label;
}

function textInput(name: string, value: string): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "text";
  input.name = name;
  input.value = value;
  return input;
}

function numberInput(name: string, value: number, min: number, max: number): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "number";
  input.name = name;
  input.min = String(min);
  input.max = String(max);
  input.value = String(value);
  return input;
}

function select<T extends string>(
  name: string,
  options: readonly T[],
  labels: Record<T, string>,
  value: T,
): HTMLSelectElement {
  const el = document.createElement("select");
  el.name = name;
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = labels[opt];
    el.appendChild(o);
  }
  el.value = value;
  return el;
}

export function buildPosterTab(
  container: HTMLElement,
  opts: PosterTabOptions,
): PosterTabHandle {
  let state: PosterState = readPosterFromUrl();

  const root = document.createElement("div");
  root.className = "poster-tab";

  // --- Shape row ---
  const shapeRow = document.createElement("div");
  shapeRow.className = "poster-shape-row";
  const shapeInput = document.createElement("input");
  shapeInput.type = "text";
  shapeInput.className = "poster-shape-input";
  shapeInput.value = state.shapeId;
  shapeInput.setAttribute("aria-label", "Poster shape ID");
  const shapeNote = document.createElement("span");
  shapeNote.className = "poster-shape-note";
  const usePreviewBtn = document.createElement("button");
  usePreviewBtn.type = "button";
  usePreviewBtn.className = "poster-use-preview";
  usePreviewBtn.textContent = "Use preview shape";
  const randomizeBtn = document.createElement("button");
  randomizeBtn.type = "button";
  randomizeBtn.className = "poster-randomize";
  randomizeBtn.textContent = "Randomize";
  shapeRow.append(shapeInput, usePreviewBtn, randomizeBtn, shapeNote);

  // --- Fields ---
  const fields = document.createElement("div");
  fields.className = "poster-fields";
  const titleI = textInput("title", state.title);
  const subI = textInput("subtitle", state.subtitle);
  const capI = textInput("caption", state.caption);
  const posS = select<TextPos>("textPos", ["top-left", "top-split", "bottom-left"], POSITION_LABELS, state.textPos);
  const colsI = numberInput("cols", state.cols, 1, 8);
  const rowsI = numberInput("rows", state.rows, 1, 12);
  const palS = select<PaletteKey>(
    "palette",
    ["mono", "ink", "violet", "forest", "blueprint"],
    PALETTE_LABELS,
    state.palette,
  );
  const patS = select<Pattern>("pattern", ["checker", "rows"], PATTERN_LABELS, state.pattern);
  const seedI = textInput("seed", state.seed);
  seedI.placeholder = "optional";
  fields.append(
    labelled("Title", titleI),
    labelled("Subtitle", subI),
    labelled("Caption", capI),
    labelled("Position", posS),
    labelled("Columns", colsI),
    labelled("Rows", rowsI),
    labelled("Palette", palS),
    labelled("Pattern", patS),
    labelled("Variation seed", seedI),
  );

  // --- Preview + export ---
  const preview = document.createElement("div");
  preview.className = "poster-preview";
  const exportRow = document.createElement("div");
  exportRow.className = "poster-export";
  const exportSvgBtn = document.createElement("button");
  exportSvgBtn.type = "button";
  exportSvgBtn.className = "poster-export-svg";
  exportSvgBtn.textContent = "Export SVG";
  const exportPngBtn = document.createElement("button");
  exportPngBtn.type = "button";
  exportPngBtn.className = "poster-export-png";
  exportPngBtn.textContent = "Export PNG";
  exportRow.append(exportSvgBtn, exportPngBtn);

  root.append(shapeRow, fields, preview, exportRow);
  container.appendChild(root);

  function currentSvg(): string {
    return renderPosterSvg(state);
  }

  function paint(): void {
    preview.innerHTML = currentSvg();
  }

  function syncUsePreview(): void {
    usePreviewBtn.disabled = opts.getCurrentShapeId() === null;
  }

  function commit(next: PosterState): void {
    state = next;
    paint();
    updatePosterUrl(state);
  }

  function readFields(): PosterState {
    return {
      ...state,
      title: titleI.value,
      subtitle: subI.value,
      caption: capI.value,
      textPos: posS.value as TextPos,
      cols: clampField(colsI, 1, 8),
      rows: clampField(rowsI, 1, 12),
      palette: palS.value as PaletteKey,
      pattern: patS.value as Pattern,
      seed: seedI.value.trim(),
    };
  }

  function clampField(input: HTMLInputElement, min: number, max: number): number {
    const n = Math.round(Number(input.value));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
  }

  for (const el of [titleI, subI, capI, seedI]) {
    el.addEventListener("input", () => commit(readFields()));
  }
  for (const el of [posS, palS, patS, colsI, rowsI]) {
    el.addEventListener("change", () => commit(readFields()));
  }

  function applyShapeId(raw: string): void {
    const trimmed = raw.trim();
    shapeInput.value = trimmed;
    if (tryDecodeShapeId(trimmed)) {
      shapeInput.classList.remove("is-invalid");
      shapeNote.textContent = "";
      commit({ ...state, shapeId: trimmed });
    } else {
      shapeInput.classList.add("is-invalid");
      shapeNote.textContent = "Not a valid BitShaper ID — keeping the last one.";
    }
  }

  shapeInput.addEventListener("change", () => applyShapeId(shapeInput.value));

  usePreviewBtn.addEventListener("click", () => {
    const id = opts.getCurrentShapeId();
    if (id) applyShapeId(id);
  });

  randomizeBtn.addEventListener("click", () => {
    const allTypes = listPrimitives().map((_, i) => i);
    const id = generateFilteredShapeId(randomSeed(), { cols: 3, rows: 3 }, allTypes);
    applyShapeId(id);
  });

  exportSvgBtn.addEventListener("click", () => {
    exportSvg(currentSvg(), `poster-${state.shapeId}.svg`);
  });
  exportPngBtn.addEventListener("click", () => {
    void exportPng(currentSvg(), {
      width: 2000,
      height: 3000,
      filename: `poster-${state.shapeId}.png`,
    });
  });

  syncUsePreview();
  // Keep the "Use preview shape" button in step with the shared preview.
  window.addEventListener("hashchange", syncUsePreview);
  document.addEventListener("bitshaper:shape-changed", syncUsePreview);

  paint();
  return { element: root };
}
```

Note: the `bitshaper:shape-changed` listener is defensive; if `main.ts` never
dispatches it, `syncUsePreview` still runs on build and on hashchange. Do **not**
add a dispatch to `main.ts` unless Task 5 shows it is trivial — the build-time
check covers the common "open Poster tab after picking a shape" flow because the
tab is rebuilt? It is NOT rebuilt. Therefore Task 5 MUST call `syncUsePreview`
via a returned hook OR dispatch the event. See Task 5 Step 3.

- [ ] **Step 4: Add the `PALETTES` import guard**

Confirm `web/src/poster.ts` imports `PALETTES` only if used; if `tsc` flags it
as unused, remove it from the import list. Run:

Run: `cd web && npx tsc --noEmit`
Expected: no errors (remove any unused import it reports).

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd web && npx vitest run test/poster.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add web/src/poster.ts web/test/poster.test.ts
git commit -m "feat(web): Poster tab UI"
```

---

### Task 5: Wire the Poster tab into `main.ts` + layout tests

**Files:**
- Modify: `web/src/main.ts` (`TABS`, `buildLayout` body + return type, `initApp`)
- Modify: `web/test/main-layout.test.ts`

**Interfaces:**
- Consumes: `buildPosterTab` from `./poster.js`; `PosterTabHandle`.
- Produces: `buildLayout` return object gains `readonly posterSection: HTMLElement` (the tab's body element that `buildPosterTab` fills).

- [ ] **Step 1: Update the failing layout tests**

In `web/test/main-layout.test.ts`, make these edits:

Replace the `"labels the first tab Create"` test with an added assertion block:

```ts
  it("labels the three working-area tabs", () => {
    const root = document.createElement("div");
    buildLayout(root);
    const label = (id: string) =>
      root.querySelector<HTMLButtonElement>(`.tab-button[data-tab="${id}"]`)?.textContent;
    expect(label("create")).toBe("Create");
    expect(label("trace")).toBe("Trace an image");
    expect(label("poster")).toBe("Poster");
  });
```

Add a new test in the `"buildLayout — working-area tabs"` describe block:

```ts
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
```

Add to the `"buildLayout — Composition panel is always visible"` describe block:

```ts
  it("keeps the Composition panel visible under the Poster tab", () => {
    document.body.innerHTML = '<div id="app"></div>';
    window.history.replaceState({}, "", "/#poster");
    initApp();
    expect(document.querySelector(".composition-panel")).not.toBeNull();
    expect(document.querySelector<HTMLElement>(".poster-section")?.hidden).toBe(false);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && npx vitest run test/main-layout.test.ts`
Expected: FAIL — no `poster` tab / `.poster-section`.

- [ ] **Step 3: Edit `web/src/main.ts`**

1. Add the import near the other tab-module imports:

```ts
import { buildPosterTab } from "./poster.js";
```

2. Extend `TABS`:

```ts
const TABS = [
  { id: "create", label: "Create" },
  { id: "trace", label: "Trace an image" },
  { id: "poster", label: "Poster" },
] as const;
```

3. In `buildLayout`, after the `catalogSection` block and before `const panels`,
   add:

```ts
  const posterSection = document.createElement("section");
  posterSection.className = "poster-section tab-panel";
  const posterHint = document.createElement("p");
  posterHint.className = "section-hint";
  posterHint.textContent =
    "Compose one shape into a modernist poster — pick a shape, set the title and grid, then export.";
  posterSection.appendChild(posterHint);
  const posterSectionBody = document.createElement("div");
  posterSection.appendChild(posterSectionBody);
```

4. Extend `panels`:

```ts
  const panels: Record<TabId, HTMLElement> = {
    create: catalogSection,
    trace: traceSection,
    poster: posterSection,
  };
```

5. Add `posterSection: posterSectionBody` to the return object, and
   `readonly posterSection: HTMLElement;` to `buildLayout`'s return type.

6. In `initApp`, destructure `posterSection` from `buildLayout(root)` and, after
   the `buildTraceSection(...)` call, add:

```ts
  buildPosterTab(posterSection, { getCurrentShapeId: () => currentShapeId });
```

7. In `showShape`, after `setActionsEnabled();`, dispatch the event the Poster
   tab listens for so its "Use preview shape" button enables as soon as a shape
   exists:

```ts
    document.dispatchEvent(new CustomEvent("bitshaper:shape-changed"));
```

- [ ] **Step 4: Run the full web suite + typecheck**

Run: `cd web && npx vitest run && npx tsc --noEmit`
Expected: all green, no type errors.

- [ ] **Step 5: Commit**

```bash
git add web/src/main.ts web/test/main-layout.test.ts
git commit -m "feat(web): wire Poster as the third working-area tab"
```

---

### Task 6: Styles + full verification

**Files:**
- Modify: `web/src/style.css`
- Test: none new (visual); run every gate.

- [ ] **Step 1: Append the Poster styles to `web/src/style.css`**

```css
/* --- Poster tab --- */
.poster-tab {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.poster-shape-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.poster-shape-input {
  flex: 1 1 16rem;
  min-width: 0;
  padding: 0.4rem 0.5rem;
  background: var(--bs-surface);
  border: 1px solid var(--bs-border);
  border-radius: 4px;
  color: var(--bs-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.poster-shape-input.is-invalid {
  border-color: var(--bs-error);
}

.poster-shape-note {
  flex-basis: 100%;
  color: var(--bs-error);
  font-size: 0.85rem;
  min-height: 1rem;
}

.poster-fields {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
  gap: 0.75rem;
}

.poster-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.85rem;
  color: var(--bs-text-muted);
}

.poster-field input,
.poster-field select {
  padding: 0.4rem 0.5rem;
  background: var(--bs-surface);
  border: 1px solid var(--bs-border);
  border-radius: 4px;
  color: var(--bs-text);
}

.poster-preview {
  display: flex;
  justify-content: center;
  padding: 1rem;
  border: 1px solid var(--bs-border);
  border-radius: 6px;
  background:
    repeating-conic-gradient(#20242c 0% 25%, #171a20 0% 50%) 50% / 24px 24px;
}

.poster-preview svg {
  width: auto;
  max-width: 100%;
  max-height: 70vh;
  height: auto;
  box-shadow: 0 4px 24px rgb(0 0 0 / 40%);
}

.poster-export {
  display: flex;
  gap: 0.5rem;
}
```

- [ ] **Step 2: Build the web app**

Run: `cd web && npm run build`
Expected: build completes, no errors.

- [ ] **Step 3: Full verification (all gates)**

Run each; every one must pass:

```bash
cd web && npx vitest run          # all web tests green
cd web && npx tsc --noEmit        # no type errors
cd web && npm run build           # ok
cd .. && npm test                 # root suite green
npx biome check .                 # clean (run from repo root)
```

If `biome check` reports formatting, run `npx biome check --write .` and
re-review the diff before committing.

- [ ] **Step 4: Commit**

```bash
git add web/src/style.css
git commit -m "feat(web): Poster tab styles"
```

- [ ] **Step 5: Manual smoke (optional but recommended)**

`cd web && npm run dev`, open the app, click the **Poster** tab: a poster
renders; editing Title updates it live; Columns/Rows/Palette/Pattern/Position
all change the poster; **Use preview shape** is enabled after a Randomize in the
Composition panel; **Export SVG** / **Export PNG** download files named
`poster-<id>.svg` / `.png`; reloading the page keeps the poster (URL params).

---

### Task 7: Open the PR

- [ ] **Step 1: Push the branch**

```bash
git push -u origin web-poster-tab
```

- [ ] **Step 2: Open the PR (do NOT merge)**

```bash
gh pr create --title "Change D: Poster tab" --body "$(cat <<'EOF'
## Summary
- Adds a third working-area tab, **Poster**, composing one BitShaper shape into a modernist "grid of marks" poster.
- Editable: shape (ID field / use-preview / randomize), title / subtitle / caption, text position (3 presets), columns × rows, palette (5 presets), colour pattern (checkerboard / per row), variation seed.
- Poster state is namespaced into the URL (`p*` params) — shareable and restored on load.
- Export: 2:3 portrait SVG + PNG (2000×3000). `exportPng` gained optional `width`/`height`.

## New modules (web/ only)
- `web/src/poster-templates.ts` — pure `renderPosterSvg(state)` + palettes + defaults
- `web/src/poster-state.ts` — pure URL read/write
- `web/src/poster.ts` — vanilla-DOM tab UI

## Not touched
- `src/core/`, `src/library/` (Change C owns those), Composition/Morph/Trace/catalog behaviour.

## Verification
- `cd web && npx vitest run` — green
- `npm test` (root) — green
- `npx biome check .` — clean
- `cd web && npm run build` — ok

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- Third tab `Create / Trace an image / Poster` → Task 5. ✓
- Self-contained shape + "Use preview shape" bridge → Task 4 (`getCurrentShapeId`, `usePreviewBtn`), Task 5 step 3.7 (event). ✓
- One "grid of marks" template, per-cell rotation cycle, checker/rows 2-colour → Task 2. ✓
- Editable text / position (3 presets) / count / palette → Task 4 fields. ✓
- URL state → Task 3. ✓
- 2:3, SVG + PNG 2000×3000 → Task 1 (PNG sizing), Task 2 (`POSTER_VIEWBOX`), Task 4 (export wiring). ✓
- Styles in `style.css` with `--bs-*` → Task 6. ✓
- Tests mirroring `web/src/`, `#poster` hash + keep `#create`/`#trace` → Tasks 2–5. ✓
- No deps, vanilla DOM, `.js` imports → all tasks follow. ✓

**Placeholder scan:** No "TBD"/"handle edge cases"/bare "write tests". The Task 4
note about `syncUsePreview` is resolved concretely in Task 5 step 3.7 (dispatch
`bitshaper:shape-changed`).

**Type consistency:** `PosterState` shape identical across Tasks 2/3/4;
`renderPosterSvg`, `readPosterFromUrl`, `updatePosterUrl`, `buildPosterTab`
signatures match between their defining task and their callers;
`exportPng` option object matches Task 1 definition and Task 4 call site;
`buildLayout` return gains `posterSection` (Task 5) consumed only in `initApp`.
