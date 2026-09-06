import { listPrimitives } from "bitshaper";
import { exportPng } from "./export-png.js";
import { exportSvg } from "./export-svg.js";
import { generateFilteredShapeId, randomSeed, tryDecodeShapeId } from "./generate.js";
import { readPosterFromUrl, updatePosterUrl } from "./poster-state.js";
import {
  type PaletteKey,
  type Pattern,
  type PosterState,
  type TextPos,
  renderPosterSvg,
} from "./poster-templates.js";

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

function clampField(input: HTMLInputElement, min: number, max: number): number {
  const n = Math.round(Number(input.value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
}

export function buildPosterTab(container: HTMLElement, opts: PosterTabOptions): PosterTabHandle {
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
  const posS = select<TextPos>(
    "textPos",
    ["top-left", "top-split", "bottom-left"],
    POSITION_LABELS,
    state.textPos,
  );
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
  // Keep the "Use preview shape" button in step with the shared preview shape.
  window.addEventListener("hashchange", syncUsePreview);
  document.addEventListener("bitshaper:shape-changed", syncUsePreview);

  paint();
  return { element: root };
}
