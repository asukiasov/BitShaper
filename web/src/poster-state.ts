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
