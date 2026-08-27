import "./style.css";
import { renderCatalogView } from "./catalog-view.js";
import { exportPng } from "./export-png.js";
import { exportSvg } from "./export-svg.js";
import {
  buildGeneratorForm,
  setGridSize,
  setPrimitiveMix,
  submitGeneratorForm,
} from "./generator-form.js";
import { renderPreview, showPreviewError } from "./preview.js";
import { clearPrimitiveUsage, renderPrimitiveUsage } from "./primitive-usage.js";
import { decodeShapeFromUrl, readShapeIdFromUrl, updateUrlForShape } from "./shape-state.js";

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

/** Builds the static page layout once: catalog, generator form, preview, and export controls. */
function buildLayout(root: HTMLElement): {
  readonly catalogSection: HTMLElement;
  readonly generatorSection: HTMLElement;
  readonly previewContainer: HTMLElement;
  readonly primitiveUsageContainer: HTMLElement;
  readonly exportSvgButton: HTMLButtonElement;
  readonly exportPngButton: HTMLButtonElement;
  readonly shapeIdInput: HTMLInputElement;
  readonly copyIdButton: HTMLButtonElement;
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
  const previewContainer = document.createElement("div");
  previewContainer.className = "preview-container";
  previewSection.appendChild(previewContainer);

  const shapeIdRow = document.createElement("div");
  shapeIdRow.className = "shape-id-row";
  const shapeIdInput = document.createElement("input");
  shapeIdInput.type = "text";
  shapeIdInput.className = "shape-id-input";
  shapeIdInput.readOnly = true;
  shapeIdInput.placeholder = "Shape ID appears here";
  shapeIdInput.setAttribute("aria-label", "Current shape ID");
  const copyIdButton = document.createElement("button");
  copyIdButton.type = "button";
  copyIdButton.textContent = "Copy ID";
  shapeIdRow.appendChild(shapeIdInput);
  shapeIdRow.appendChild(copyIdButton);
  previewSection.appendChild(shapeIdRow);

  const primitiveUsageContainer = document.createElement("div");
  primitiveUsageContainer.className = "primitive-usage";
  previewSection.appendChild(primitiveUsageContainer);

  const exportControls = document.createElement("div");
  exportControls.className = "export-controls";
  const exportSvgButton = document.createElement("button");
  exportSvgButton.type = "button";
  exportSvgButton.textContent = "Export SVG";
  const exportPngButton = document.createElement("button");
  exportPngButton.type = "button";
  exportPngButton.textContent = "Export PNG";
  exportControls.appendChild(exportSvgButton);
  exportControls.appendChild(exportPngButton);
  previewSection.appendChild(exportControls);
  main.appendChild(previewSection);

  const generatorSection = document.createElement("section");
  generatorSection.className = "generator-section";
  const generatorHeading = document.createElement("h2");
  generatorHeading.textContent = "Generate a mark";
  generatorSection.appendChild(generatorHeading);
  const generatorHint = document.createElement("p");
  generatorHint.className = "section-hint";
  generatorHint.textContent =
    "Click Randomize for an instant mark, or type a seed to get a reproducible one. " +
    "The checkboxes below are the individual building blocks (primitives) a mark can be made of — " +
    "uncheck any you don't want used.";
  generatorSection.appendChild(generatorHint);
  main.appendChild(generatorSection);

  const catalogSection = document.createElement("section");
  catalogSection.className = "catalog-section";
  const catalogHeading = document.createElement("h2");
  catalogHeading.textContent = "Curated marks";
  catalogSection.appendChild(catalogHeading);
  const catalogHint = document.createElement("p");
  catalogHint.className = "section-hint";
  catalogHint.textContent =
    "Finished marks built by combining primitives, with descriptive names — click one to load it above.";
  catalogSection.appendChild(catalogHint);
  const catalogList = document.createElement("div");
  catalogSection.appendChild(catalogList);
  main.appendChild(catalogSection);

  return {
    catalogSection: catalogList,
    generatorSection,
    previewContainer,
    primitiveUsageContainer,
    exportSvgButton,
    exportPngButton,
    shapeIdInput,
    copyIdButton,
  };
}

/** Wires up the whole app: initial URL state, catalog, generator, preview, and export. */
function initApp(): void {
  const root = getAppRoot();
  const {
    catalogSection,
    generatorSection,
    previewContainer,
    primitiveUsageContainer,
    exportSvgButton,
    exportPngButton,
    shapeIdInput,
    copyIdButton,
  } = buildLayout(root);

  let currentShapeId: string | null = null;

  /**
   * Sets the generator form's primitive mix and grid to an existing mark's,
   * then generates a fresh mark from that same palette (blank seed → random).
   * Backs the preview's "Reuse primitives" button.
   */
  function reusePrimitives(
    allowedTypes: number[],
    grid: { readonly cols: number; readonly rows: number },
  ): void {
    setPrimitiveMix(generatorForm, allowedTypes);
    setGridSize(generatorForm, grid);
    (generatorForm.elements.namedItem("seed") as HTMLInputElement).value = "";
    submitGeneratorForm(generatorForm);
    generatorSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showShape(shapeId: string, opts?: { readonly push?: boolean }): void {
    currentShapeId = shapeId;
    renderPreview(previewContainer, shapeId);
    renderPrimitiveUsage(primitiveUsageContainer, shapeId, { onReuse: reusePrimitives });
    updateUrlForShape(shapeId, opts);
    shapeIdInput.value = shapeId;
  }

  renderCatalogView(catalogSection, {
    onSelect: (shapeId) => showShape(shapeId, { push: true }),
  });

  const generatorForm = buildGeneratorForm(generatorSection, {
    onGenerate: (shapeId) => showShape(shapeId, { push: true }),
  });

  exportSvgButton.addEventListener("click", () => {
    const svg = previewContainer.querySelector("svg");
    if (svg) {
      exportSvg(svg.outerHTML);
    }
  });

  exportPngButton.addEventListener("click", () => {
    const svg = previewContainer.querySelector("svg");
    if (svg) {
      void exportPng(svg.outerHTML);
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
    renderPreview(previewContainer, initialState.shapeId);
    renderPrimitiveUsage(primitiveUsageContainer, initialState.shapeId, {
      onReuse: reusePrimitives,
    });
    shapeIdInput.value = initialState.shapeId;
  } else if (initialState.kind === "error") {
    showPreviewError(previewContainer, `Invalid shape ID in URL: ${initialState.message}`);
    clearPrimitiveUsage(primitiveUsageContainer);
  } else {
    previewContainer.textContent = "Select a mark from the catalog below, or generate one.";
  }

  // Browser back/forward navigation between pushed shape IDs.
  window.addEventListener("popstate", () => {
    const shapeId = readShapeIdFromUrl();
    if (shapeId !== null && shapeId !== currentShapeId) {
      currentShapeId = shapeId;
      renderPreview(previewContainer, shapeId);
      renderPrimitiveUsage(primitiveUsageContainer, shapeId, { onReuse: reusePrimitives });
      shapeIdInput.value = shapeId;
    }
  });
}

initApp();
