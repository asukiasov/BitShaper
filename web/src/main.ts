import "./style.css";
import { renderCatalogView } from "./catalog-view.js";
import { exportPng } from "./export-png.js";
import { exportSvg } from "./export-svg.js";
import { buildGeneratorForm } from "./generator-form.js";
import { renderPreview, showPreviewError } from "./preview.js";
import { decodeShapeFromUrl, readShapeIdFromUrl, updateUrlForShape } from "./shape-state.js";

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
  readonly exportSvgButton: HTMLButtonElement;
  readonly exportPngButton: HTMLButtonElement;
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
  main.appendChild(generatorSection);

  const catalogSection = document.createElement("section");
  catalogSection.className = "catalog-section";
  const catalogHeading = document.createElement("h2");
  catalogHeading.textContent = "Browse the catalog";
  catalogSection.appendChild(catalogHeading);
  main.appendChild(catalogSection);

  return { catalogSection, generatorSection, previewContainer, exportSvgButton, exportPngButton };
}

/** Wires up the whole app: initial URL state, catalog, generator, preview, and export. */
function initApp(): void {
  const root = getAppRoot();
  const { catalogSection, generatorSection, previewContainer, exportSvgButton, exportPngButton } =
    buildLayout(root);

  let currentShapeId: string | null = null;

  function showShape(shapeId: string, opts?: { readonly push?: boolean }): void {
    currentShapeId = shapeId;
    renderPreview(previewContainer, shapeId);
    updateUrlForShape(shapeId, opts);
  }

  renderCatalogView(catalogSection, {
    onSelect: (shapeId) => showShape(shapeId, { push: true }),
  });

  buildGeneratorForm(generatorSection, {
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

  // Initial landing state: preview a valid shape ID already in the URL,
  // show its error state if the ID is invalid, or default to the catalog.
  const initialState = decodeShapeFromUrl();
  if (initialState.kind === "decoded") {
    currentShapeId = initialState.shapeId;
    renderPreview(previewContainer, initialState.shapeId);
  } else if (initialState.kind === "error") {
    showPreviewError(previewContainer, `Invalid shape ID in URL: ${initialState.message}`);
  } else {
    previewContainer.textContent = "Select a mark from the catalog below, or generate one.";
  }

  // Browser back/forward navigation between pushed shape IDs.
  window.addEventListener("popstate", () => {
    const shapeId = readShapeIdFromUrl();
    if (shapeId !== null && shapeId !== currentShapeId) {
      currentShapeId = shapeId;
      renderPreview(previewContainer, shapeId);
    }
  });
}

initApp();
