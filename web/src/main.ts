import "./style.css";
import { type Ramp, decodeShapeId, isTileable } from "bitshaper";
import { renderCatalogView } from "./catalog-view.js";
import { buildCellEditor } from "./cell-editor.js";
import { exportPng } from "./export-png.js";
import { exportSvg } from "./export-svg.js";
import { buildGeneratorForm, setGridSize, setPrimitiveMix } from "./generator-form.js";
import { renderPreview, showPreviewError } from "./preview.js";
import { clearPrimitiveUsage, renderPrimitiveUsage } from "./primitive-usage.js";
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
  { id: "generate", label: "Generate" },
  { id: "trace", label: "Trace an image" },
  { id: "examples", label: "Examples" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** Reads the active tab from `location.hash`, defaulting to the first tab. */
function readTabFromHash(): TabId {
  const hash = window.location.hash.replace(/^#/, "");
  return TABS.some((t) => t.id === hash) ? (hash as TabId) : TABS[0].id;
}

/** Builds the static page layout once: toolbar, preview, and the tabbed working area. */
export function buildLayout(root: HTMLElement): {
  readonly catalogSection: HTMLElement;
  readonly generatorSection: HTMLElement;
  readonly traceSection: HTMLElement;
  readonly previewSection: HTMLElement;
  readonly previewContainer: HTMLElement;
  readonly rampPanelContainer: HTMLElement;
  readonly primitiveUsageContainer: HTMLElement;
  readonly exportSvgButton: HTMLButtonElement;
  readonly exportPngButton: HTMLButtonElement;
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
  for (const b of [copyIdButton, exportSvgButton, exportPngButton]) {
    b.disabled = true;
    shapeIdRow.appendChild(b);
  }
  previewSticky.appendChild(shapeIdRow);
  previewSection.appendChild(previewSticky);

  const historyHint = document.createElement("p");
  historyHint.className = "section-hint";
  historyHint.textContent =
    "Randomized a few times? Use your browser's Back button to step through previous marks.";
  previewSection.appendChild(historyHint);

  const rampPanelContainer = document.createElement("div");
  rampPanelContainer.className = "ramp-panel-container";
  previewSection.appendChild(rampPanelContainer);

  const primitiveUsageContainer = document.createElement("div");
  primitiveUsageContainer.className = "primitive-usage";
  previewSection.appendChild(primitiveUsageContainer);

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
  previewSection.appendChild(tileRepeatLabel);
  previewSection.appendChild(tileRepeatHint);

  main.appendChild(previewSection);

  // Tabbed working area: one panel visible at a time.
  const tablist = document.createElement("div");
  tablist.className = "tab-bar";
  tablist.setAttribute("role", "tablist");
  main.appendChild(tablist);

  const generatorSection = document.createElement("section");
  generatorSection.className = "generator-section tab-panel";
  const generatorHint = document.createElement("p");
  generatorHint.className = "section-hint";
  generatorHint.textContent =
    "Click Randomize for an instant mark, or type a seed to get a reproducible one. " +
    "The checkboxes below are the individual building blocks (primitives) a mark can be made of — " +
    "uncheck any you don't want used.";
  generatorSection.appendChild(generatorHint);

  const traceSection = document.createElement("section");
  traceSection.className = "trace-section tab-panel";
  const traceHint = document.createElement("p");
  traceHint.className = "section-hint";
  traceHint.textContent =
    "Drop a PNG, JPG, or SVG of a shape to get the closest BitShaper mark — " +
    "a starting sketch you then tune, not an exact copy.";
  traceSection.appendChild(traceHint);
  const traceSectionBody = document.createElement("div");
  traceSection.appendChild(traceSectionBody);

  const catalogSection = document.createElement("section");
  catalogSection.className = "catalog-section tab-panel";
  const catalogHint = document.createElement("p");
  catalogHint.className = "section-hint";
  catalogHint.textContent =
    "Finished shapes built by combining primitives, with descriptive names — click one to load it above.";
  catalogSection.appendChild(catalogHint);
  const catalogList = document.createElement("div");
  catalogSection.appendChild(catalogList);

  const panels: Record<TabId, HTMLElement> = {
    generate: generatorSection,
    trace: traceSection,
    examples: catalogSection,
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
    generatorSection,
    traceSection: traceSectionBody,
    previewSection,
    previewContainer,
    rampPanelContainer,
    primitiveUsageContainer,
    exportSvgButton,
    exportPngButton,
    shapeIdInput,
    copyIdButton,
    tileRepeatInput,
    tileSeamStatus,
    selectTab,
  };
}

/** Wires up the whole app: initial URL state, catalog, generator, preview, and export. */
export function initApp(): void {
  const root = getAppRoot();
  const {
    catalogSection,
    generatorSection,
    traceSection,
    previewSection,
    previewContainer,
    rampPanelContainer,
    primitiveUsageContainer,
    exportSvgButton,
    exportPngButton,
    shapeIdInput,
    copyIdButton,
    tileRepeatInput,
    tileSeamStatus,
    selectTab,
  } = buildLayout(root);

  /** Current repeat count (1 = single mark, 2–10 = N×N tile preview). */
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
   * The per-cell edit overlay only makes sense over a single 1:1 mark, so it is
   * suppressed while the repeating-tile preview is on (the overlay's hit boxes
   * assume the default top-left, `size / maxAxis` layout). Setting the repeat
   * back to 1 rebuilds it.
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

  const cellEditor = buildCellEditor(previewContainer, {
    // Each cell edit emits a base ID; re-layer the Morph panel's current ramp.
    onEdit: (baseId) =>
      showShape(applyRampToShapeId(baseId, rampPanel.currentRamp()), { push: true }),
  });

  /** Points the Morph panel at whatever ramp `shapeId` carries (if any). */
  function syncRampPanel(shapeId: string): void {
    try {
      rampPanel.setFromShape(decodeShapeId(shapeId));
    } catch {
      // Invalid ID — leave the panel as-is; renderPreview surfaces the error.
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

  /**
   * Sets the generator form's primitive mix and grid to an existing mark's and
   * clears the seed. Does not regenerate and does not move the scroll position:
   * the preview, shape ID, and URL are left untouched until the user hits
   * Randomize. Backs the preview's "Use these primitives" button.
   */
  function reusePrimitives(
    allowedTypes: number[],
    grid: { readonly cols: number; readonly rows: number },
  ): void {
    setPrimitiveMix(generatorForm, allowedTypes);
    setGridSize(generatorForm, grid);
    (generatorForm.elements.namedItem("seed") as HTMLInputElement).value = "";
  }

  function setActionsEnabled(): void {
    const enabled = currentShapeId !== null;
    copyIdButton.disabled = !enabled;
    exportSvgButton.disabled = !enabled;
    exportPngButton.disabled = !enabled;
  }

  function showShape(shapeId: string, opts?: { readonly push?: boolean }): void {
    currentShapeId = shapeId;
    paintPreview(shapeId);
    renderPrimitiveUsage(primitiveUsageContainer, shapeId, { onReuse: reusePrimitives });
    refreshCellEditor(shapeId);
    updateUrlForShape(shapeId, opts);
    shapeIdInput.value = shapeId;
    setActionsEnabled();
    if (!applyingRamp) {
      syncRampPanel(shapeId);
    }
  }

  renderCatalogView(catalogSection, {
    onSelect: (shapeId) => showShape(shapeId, { push: true }),
  });

  const generatorForm = buildGeneratorForm(generatorSection, {
    // Keep the Morph panel's ramp applied across a re-roll.
    onGenerate: (shapeId) =>
      showShape(applyRampToShapeId(shapeId, rampPanel.currentRamp()), { push: true }),
  });

  buildTraceSection(traceSection, {
    onAccept: (id) => {
      showShape(applyRampToShapeId(id, rampPanel.currentRamp()), { push: true });
      previewSection.scrollIntoView({ behavior: "smooth" });
    },
  });

  /** Filename base for exports: the shape ID, so a download is self-identifying. */
  function exportBasename(): string {
    return currentShapeId ?? "bitshaper-mark";
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
  // show its error state if the ID is invalid, or default to the catalog.
  const initialState = decodeShapeFromUrl();
  if (initialState.kind === "decoded") {
    currentShapeId = initialState.shapeId;
    paintPreview(initialState.shapeId);
    renderPrimitiveUsage(primitiveUsageContainer, initialState.shapeId, {
      onReuse: reusePrimitives,
    });
    refreshCellEditor(initialState.shapeId);
    shapeIdInput.value = initialState.shapeId;
    setActionsEnabled();
    rampPanel.setFromShape(initialState.shape);
  } else if (initialState.kind === "error") {
    showPreviewError(previewContainer, `Invalid shape ID in URL: ${initialState.message}`);
    clearPrimitiveUsage(primitiveUsageContainer);
  } else {
    previewContainer.textContent = "Generate a shape, or pick one from Examples.";
    selectTab("generate");
  }

  // Browser back/forward navigation between pushed shape IDs.
  window.addEventListener("popstate", () => {
    const shapeId = readShapeIdFromUrl();
    if (shapeId !== null && shapeId !== currentShapeId) {
      currentShapeId = shapeId;
      paintPreview(shapeId);
      renderPrimitiveUsage(primitiveUsageContainer, shapeId, { onReuse: reusePrimitives });
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
