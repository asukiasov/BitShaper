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

  // Vertical bands: text occupies TEXT_BAND on its side; a caption footer only
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
