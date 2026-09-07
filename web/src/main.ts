import "./style.css";
import { type Ramp, decodeShapeId, isTileable, listPrimitives } from "bitshaper";
import { renderCatalogView } from "./catalog-view.js";
import { buildCellEditor } from "./cell-editor.js";
import { type CompositionPanelHandle, buildCompositionPanel } from "./composition-panel.js";
import { exportPng } from "./export-png.js";
import { exportSvg } from "./export-svg.js";
import { generateFilteredShapeId, invertShapeId, tryDecodeShapeId } from "./generate.js";
import { buildPosterTab } from "./poster.js";
import { renderPreview, showPreviewError } from "./preview.js";
import { buildRampPanel } from "./ramp-panel.js";
import {
  applyRampToShapeId,
  decodeShapeFromUrl,
  readShapeIdFromUrl,
  updateUrlForShape,
} from "./shape-state.js";
import { buildTraceSection } from "./trace-section.js";

/**
 * Copies `text` to the clipboard, preferring the async Clipboard API and
 * falling back to a hidden-textarea `execCommand` for browsers/contexts
 * without it. Resolves `true` on success, `false` if every approach fails.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to the execCommand fallback below
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  document.body.removeChild(textarea);
  return copied;
}

/** Root app container, created once and reused across (re)renders. */
function getAppRoot(): HTMLElement {
  const root = document.getElementById("app");
  if (!root) {
    throw new Error("Missing #app root element in index.html.");
  }
  return root;
}

/** The working-area tabs, in display order. `id` doubles as the URL hash. */
const TABS = [
  { id: "create", label: "Create" },
  { id: "trace", label: "Trace an image" },
  { id: "poster", label: "Poster" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** Reads the active tab from `location.hash`, defaulting to the first tab. */
function readTabFromHash(): TabId {
  const hash = window.location.hash.replace(/^#/, "");
  return TABS.some((t) => t.id === hash) ? (hash as TabId) : TABS[0].id;
}

/** Builds the static page layout once: preview, composition + morph panels, tabs. */
export function buildLayout(root: HTMLElement): {
  readonly catalogSection: HTMLElement;
  readonly traceSection: HTMLElement;
  readonly posterSection: HTMLElement;
  readonly previewSection: HTMLElement;
  readonly previewContainer: HTMLElement;
  readonly compositionPanelContainer: HTMLElement;
  readonly rampPanelContainer: HTMLElement;
  readonly exportSvgButton: HTMLButtonElement;
  readonly exportPngButton: HTMLButtonElement;
  readonly invertButton: HTMLButtonElement;
  readonly sendToPosterButton: HTMLButtonElement;
  readonly shapeIdInput: HTMLInputElement;
  readonly copyIdButton: HTMLButtonElement;
  readonly tileRepeatInput: HTMLInputElement;
  readonly tileSeamStatus: HTMLElement;
  readonly selectTab: (id: TabId) => void;
} {
  root.innerHTML = "";

  const header = document.createElement("header");
  header.className = "app-header";
  const title = document.createElement("h1");
  title.textContent = "BitShaper";
  header.appendChild(title);
  root.appendChild(header);

  const main = document.createElement("main");
  main.className = "app-main";
  root.appendChild(main);

  const previewSection = document.createElement("section");
  previewSection.className = "preview-section";

  // The preview and its ID/action row stick to the top of the viewport, so a
  // Randomize or example click always changes something on screen while the
  // user is scrolled down among the controls.
  const previewSticky = document.createElement("div");
  previewSticky.className = "preview-sticky";
  const previewContainer = document.createElement("div");
  previewContainer.className = "preview-container";
  previewSticky.appendChild(previewContainer);

  const shapeIdRow = document.createElement("div");
  shapeIdRow.className = "shape-id-row";
  const shapeIdInput = document.createElement("input");
  shapeIdInput.type = "text";
  shapeIdInput.className = "shape-id-input";
  shapeIdInput.readOnly = true;
  shapeIdInput.placeholder = "Shape ID appears here";
  shapeIdInput.setAttribute("aria-label", "Current shape ID");
  shapeIdRow.appendChild(shapeIdInput);

  const copyIdButton = document.createElement("button");
  copyIdButton.type = "button";
  copyIdButton.className = "id-action";
  copyIdButton.textContent = "Copy ID";
  const exportSvgButton = document.createElement("button");
  exportSvgButton.type = "button";
  exportSvgButton.className = "id-action";
  exportSvgButton.textContent = "SVG";
  exportSvgButton.title = "Export as SVG";
  const exportPngButton = document.createElement("button");
  exportPngButton.type = "button";
  exportPngButton.className = "id-action";
  exportPngButton.textContent = "PNG";
  exportPngButton.title = "Export as PNG";
  const invertButton = document.createElement("button");
  invertButton.type = "button";
  invertButton.className = "id-action";
  invertButton.textContent = "Invert";
  invertButton.title = "Flip this shape to its negative (every cell inverted)";
  const sendToPosterButton = document.createElement("button");
  sendToPosterButton.type = "button";
  sendToPosterButton.className = "id-action";
  sendToPosterButton.textContent = "→ Poster";
  sendToPosterButton.title = "Use this shape in the Poster tab";
  for (const b of [
    copyIdButton,
    exportSvgButton,
    exportPngButton,
    invertButton,
    sendToPosterButton,
  ]) {
    b.disabled = true;
    shapeIdRow.appendChild(b);
  }
  previewSticky.appendChild(shapeIdRow);

  // On wide screens the preview sits left, the settings panels right; on narrow
  // screens they stack (preview on top). Both live in .preview-section so they
  // stay visible on every tab.
  const previewLayout = document.createElement("div");
  previewLayout.className = "preview-layout";
  const previewColMain = document.createElement("div");
  previewColMain.className = "preview-col-main";
  previewColMain.appendChild(previewSticky);
  const previewColSide = document.createElement("div");
  previewColSide.className = "preview-col-side";
  previewLayout.append(previewColMain, previewColSide);
  previewSection.appendChild(previewLayout);

  const compositionPanelContainer = document.createElement("div");
  compositionPanelContainer.className = "composition-panel-container";
  previewColSide.appendChild(compositionPanelContainer);

  const rampPanelContainer = document.createElement("div");
  rampPanelContainer.className = "ramp-panel-container";
  previewColSide.appendChild(rampPanelContainer);

  const tileRepeatLabel = document.createElement("label");
  tileRepeatLabel.className = "tile-repeat";
  tileRepeatLabel.append("Pattern ");
  const tileRepeatInput = document.createElement("input");
  tileRepeatInput.type = "number";
  tileRepeatInput.className = "tile-repeat-input";
  tileRepeatInput.min = "1";
  tileRepeatInput.max = "10";
  tileRepeatInput.value = "1";
  tileRepeatInput.title =
    "Repeat this shape 1–10× to preview it as a tiling pattern (1 = single shape)";
  tileRepeatLabel.appendChild(tileRepeatInput);
  const tileSeamStatus = document.createElement("span");
  tileSeamStatus.className = "tile-seam-status";
  tileRepeatLabel.appendChild(tileSeamStatus);
  const tileRepeatHint = document.createElement("span");
  tileRepeatHint.className = "section-hint tile-repeat-hint";
  tileRepeatHint.textContent = "Repeat this shape to preview it as a tiling pattern.";
  previewColSide.appendChild(tileRepeatLabel);
  previewColSide.appendChild(tileRepeatHint);

  const historyHint = document.createElement("p");
  historyHint.className = "section-hint";
  historyHint.textContent =
    "Randomized a few times? Use your browser's Back button to step through previous shapes.";
  previewColSide.appendChild(historyHint);

  main.appendChild(previewSection);

  // Tabbed working area: one panel visible at a time.
  const tablist = document.createElement("div");
  tablist.className = "tab-bar";
  tablist.setAttribute("role", "tablist");
  main.appendChild(tablist);

  const traceSection = document.createElement("section");
  traceSection.className = "trace-section tab-panel";
  const traceHint = document.createElement("p");
  traceHint.className = "section-hint";
  traceHint.textContent =
    "Drop a PNG, JPG, or SVG of a shape to get the closest BitShaper shape — " +
    "a starting sketch you then tune, not an exact copy.";
  traceSection.appendChild(traceHint);
  const traceSectionBody = document.createElement("div");
  traceSection.appendChild(traceSectionBody);

  const catalogSection = document.createElement("section");
  catalogSection.className = "catalog-section tab-panel";
  const catalogHint = document.createElement("p");
  catalogHint.className = "section-hint";
  catalogHint.textContent =
    "Finished shapes built by combining primitives — click one to load it above, then tune it with the panels.";
  catalogSection.appendChild(catalogHint);
  const catalogList = document.createElement("div");
  catalogSection.appendChild(catalogList);

  const posterSection = document.createElement("section");
  posterSection.className = "poster-section tab-panel";
  const posterHint = document.createElement("p");
  posterHint.className = "section-hint";
  posterHint.textContent =
    "Compose one shape into a modernist poster — pick a shape, set the title and grid, then export.";
  posterSection.appendChild(posterHint);
  const posterSectionBody = document.createElement("div");
  posterSection.appendChild(posterSectionBody);

  const panels: Record<TabId, HTMLElement> = {
    create: catalogSection,
    trace: traceSection,
    poster: posterSection,
  };
  const tabButtons = new Map<TabId, HTMLButtonElement>();

  function selectTab(id: TabId): void {
    for (const tab of TABS) {
      const active = tab.id === id;
      tabButtons.get(tab.id)?.setAttribute("aria-selected", String(active));
      tabButtons.get(tab.id)?.setAttribute("tabindex", active ? "0" : "-1");
      panels[tab.id].hidden = !active;
    }
    const url = new URL(window.location.href);
    url.hash = id;
    window.history.replaceState(window.history.state, "", url);
  }

  for (const tab of TABS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tab-button";
    button.textContent = tab.label;
    button.setAttribute("role", "tab");
    button.dataset.tab = tab.id;
    button.addEventListener("click", () => selectTab(tab.id));
    tablist.appendChild(button);
    tabButtons.set(tab.id, button);
    main.appendChild(panels[tab.id]);
  }

  selectTab(readTabFromHash());

  return {
    catalogSection: catalogList,
    traceSection: traceSectionBody,
    posterSection: posterSectionBody,
    previewSection,
    previewContainer,
    compositionPanelContainer,
    rampPanelContainer,
    exportSvgButton,
    exportPngButton,
    invertButton,
    sendToPosterButton,
    shapeIdInput,
    copyIdButton,
    tileRepeatInput,
    tileSeamStatus,
    selectTab,
  };
}

/** Wires up the whole app: initial URL state, composition, catalog, preview, export. */
export function initApp(): void {
  const root = getAppRoot();
  const {
    catalogSection,
    traceSection,
    posterSection,
    previewSection,
    previewContainer,
    compositionPanelContainer,
    rampPanelContainer,
    exportSvgButton,
    exportPngButton,
    invertButton,
    sendToPosterButton,
    shapeIdInput,
    copyIdButton,
    tileRepeatInput,
    tileSeamStatus,
    selectTab,
  } = buildLayout(root);

  /** Current repeat count (1 = single shape, 2–10 = N×N pattern preview). */
  function tileRepeat(): number {
    const n = Math.round(Number(tileRepeatInput.value));
    return Number.isFinite(n) ? Math.min(10, Math.max(1, n)) : 1;
  }

  /**
   * Renders `shapeId` into the preview, honouring the Pattern repeat count, and
   * updates the seam-status note. The note is a property of the loaded shape:
   * when it is tiled, do its opposite edges line up so the repeat reads as
   * continuous?
   */
  function paintPreview(shapeId: string): void {
    const repeat = tileRepeat();
    renderPreview(previewContainer, shapeId, { tile: repeat > 1, tileRepeat: repeat });
    if (repeat <= 1) {
      tileSeamStatus.textContent = "";
      delete tileSeamStatus.dataset.seamless;
      return;
    }
    try {
      const seamless = isTileable(decodeShapeId(shapeId));
      tileSeamStatus.textContent = seamless ? "— edges line up ✓" : "— edges don't line up";
      tileSeamStatus.dataset.seamless = String(seamless);
    } catch {
      tileSeamStatus.textContent = "";
    }
  }

  /**
   * The per-cell edit overlay only makes sense over a single 1:1 shape, so it is
   * suppressed while the pattern preview is on (the overlay's hit boxes assume
   * the default top-left, `size / maxAxis` layout). Setting the repeat back to 1
   * rebuilds it.
   */
  function refreshCellEditor(shapeId: string): void {
    if (tileRepeat() > 1) {
      cellEditor.element.replaceChildren();
    } else {
      cellEditor.render(shapeId);
    }
  }

  let currentShapeId: string | null = null;
  // Guards against `showShape` re-populating the Morph panel from an ID the
  // panel itself just produced (which would tear down a slider mid-drag).
  let applyingRamp = false;

  const rampPanel = buildRampPanel(rampPanelContainer, { onChange: applyRamp });

  const ALL_PRIMITIVE_TYPES = listPrimitives().map((p) => p.index);

  /** Generates a shape from the current seed/grid restricted to `types` and shows it. */
  function randomizeFrom(types: number[]): void {
    const id = generateFilteredShapeId(
      composition.seedValue(),
      composition.gridSize(),
      types.length > 0 ? types : ALL_PRIMITIVE_TYPES,
    );
    showShape(applyRampToShapeId(id, rampPanel.currentRamp()), { push: true });
  }

  const composition: CompositionPanelHandle = buildCompositionPanel(compositionPanelContainer, {
    // Randomize uses the checked primitives (which default to the loaded shape's
    // palette); Surprise me ignores them and draws from everything.
    onRandomize: () => randomizeFrom(composition.checkedTypes()),
    onSurprise: () => randomizeFrom(ALL_PRIMITIVE_TYPES),
  });

  const cellEditor = buildCellEditor(previewContainer, {
    // Each cell edit emits a base ID; re-layer the Morph panel's current ramp.
    onEdit: (baseId) =>
      showShape(applyRampToShapeId(baseId, rampPanel.currentRamp()), { push: true }),
  });

  /** Points the Morph panel at whatever ramp `shapeId` carries (if any). */
  function syncRampPanel(shapeId: string): void {
    const shape = tryDecodeShapeId(shapeId);
    if (shape) {
      rampPanel.setFromShape(shape);
    }
  }

  /** Re-encodes the current shape with the Morph panel's ramp and shows it. */
  function applyRamp(ramp: Ramp | undefined): void {
    if (currentShapeId === null) {
      return;
    }
    applyingRamp = true;
    showShape(applyRampToShapeId(currentShapeId, ramp));
    applyingRamp = false;
  }

  /** Points the composition panel's grid + primitive checks at `shapeId`. */
  function syncComposition(shapeId: string): void {
    const shape = tryDecodeShapeId(shapeId);
    if (shape) {
      composition.reflectShape(shape);
      composition.syncGrid(shape);
    } else {
      composition.clearBadges();
    }
  }

  function setActionsEnabled(): void {
    const enabled = currentShapeId !== null;
    copyIdButton.disabled = !enabled;
    exportSvgButton.disabled = !enabled;
    exportPngButton.disabled = !enabled;
    invertButton.disabled = !enabled;
    sendToPosterButton.disabled = !enabled;
  }

  function showShape(shapeId: string, opts?: { readonly push?: boolean }): void {
    currentShapeId = shapeId;
    paintPreview(shapeId);
    syncComposition(shapeId);
    refreshCellEditor(shapeId);
    updateUrlForShape(shapeId, opts);
    shapeIdInput.value = shapeId;
    setActionsEnabled();
    document.dispatchEvent(new CustomEvent("bitshaper:shape-changed"));
    if (!applyingRamp) {
      syncRampPanel(shapeId);
    }
  }

  renderCatalogView(catalogSection, {
    onSelect: (shapeId) => showShape(shapeId, { push: true }),
  });

  buildTraceSection(traceSection, {
    onAccept: (id) => {
      showShape(applyRampToShapeId(id, rampPanel.currentRamp()), { push: true });
      previewSection.scrollIntoView({ behavior: "smooth" });
    },
  });

  const poster = buildPosterTab(posterSection, { getCurrentShapeId: () => currentShapeId });

  sendToPosterButton.addEventListener("click", () => {
    if (currentShapeId) {
      poster.setShapeId(currentShapeId);
      selectTab("poster");
    }
  });

  invertButton.addEventListener("click", () => {
    if (currentShapeId) {
      showShape(invertShapeId(currentShapeId), { push: true });
    }
  });

  /** Filename base for exports: the shape ID, so a download is self-identifying. */
  function exportBasename(): string {
    return currentShapeId ?? "bitshaper-shape";
  }

  exportSvgButton.addEventListener("click", () => {
    const svg = previewContainer.querySelector("svg");
    if (svg) {
      exportSvg(svg.outerHTML, `${exportBasename()}.svg`);
    }
  });

  exportPngButton.addEventListener("click", () => {
    const svg = previewContainer.querySelector("svg");
    if (svg) {
      void exportPng(svg.outerHTML, { filename: `${exportBasename()}.png` });
    }
  });

  tileRepeatInput.addEventListener("change", () => {
    if (currentShapeId) {
      paintPreview(currentShapeId);
      refreshCellEditor(currentShapeId);
    }
  });

  copyIdButton.addEventListener("click", () => {
    if (!currentShapeId) {
      return;
    }
    void copyToClipboard(currentShapeId).then((copied) => {
      const originalLabel = copyIdButton.textContent;
      copyIdButton.textContent = copied ? "Copied!" : "Copy failed";
      setTimeout(() => {
        copyIdButton.textContent = originalLabel;
      }, 1200);
    });
  });

  // Initial landing state: preview a valid shape ID already in the URL,
  // show its error state if the ID is invalid, or default to the Create tab.
  const initialState = decodeShapeFromUrl();
  if (initialState.kind === "decoded") {
    currentShapeId = initialState.shapeId;
    paintPreview(initialState.shapeId);
    syncComposition(initialState.shapeId);
    refreshCellEditor(initialState.shapeId);
    shapeIdInput.value = initialState.shapeId;
    setActionsEnabled();
    rampPanel.setFromShape(initialState.shape);
  } else if (initialState.kind === "error") {
    showPreviewError(previewContainer, `Invalid shape ID in URL: ${initialState.message}`);
    composition.clearBadges();
  } else {
    previewContainer.textContent = "Randomize a shape, or pick one from Create.";
  }

  // Browser back/forward navigation between pushed shape IDs.
  window.addEventListener("popstate", () => {
    const shapeId = readShapeIdFromUrl();
    if (shapeId !== null && shapeId !== currentShapeId) {
      currentShapeId = shapeId;
      paintPreview(shapeId);
      syncComposition(shapeId);
      refreshCellEditor(shapeId);
      shapeIdInput.value = shapeId;
      setActionsEnabled();
      syncRampPanel(shapeId);
    }
  });
}

if (document.getElementById("app")) {
  initApp();
}
