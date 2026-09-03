import { renderShape } from "bitshaper";
import {
  type Mask,
  binarize,
  contentBounds,
  cropAndSquare,
  guessSwapForeground,
  otsuThreshold,
  toLuminance,
} from "./trace/mask.js";
import { reconstruct } from "./trace/pipeline.js";
import { candidateMasks, imageFileToRgba } from "./trace/rasterize.js";

/** Side length (px) the dropped image is rasterized to before binarizing. */
export const WORK_SIZE = 256;
/** Side length each grid cell is downsampled to before candidate matching. */
export const SUB_RES = 16;
/** Grid cells per side selected in a freshly built trace section. */
export const DEFAULT_N = 4;
/** Debounce window (ms) applied to slider-driven recomputes. */
export const DEBOUNCE_MS = 80;

/** Options accepted by {@link buildTraceSection}. */
export interface TraceSectionOptions {
  /** Called with the reconstructed shape ID when the user presses "Use this mark". */
  readonly onAccept: (shapeId: string) => void;
}

/** Raw RGBA bytes of the most recently loaded image. */
interface Rgba {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
}

/** Wraps `fn` so rapid successive calls collapse into one trailing call after `ms`. */
function debounce(fn: () => void, ms: number): () => void {
  let handle: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (handle !== undefined) {
      clearTimeout(handle);
    }
    handle = setTimeout(fn, ms);
  };
}

/** Applies a foreground/background swap to `mask`, returning a new mask. */
function swapMask(mask: Mask): Mask {
  const data = new Uint8Array(mask.data.length);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (mask.data[i] as number) === 0 ? 1 : 0;
  }
  return { width: mask.width, height: mask.height, data };
}

/** Paints a binary {@link Mask} into `canvas` as opaque ink on a transparent ground. */
function paintMask(canvas: HTMLCanvasElement, mask: Mask): void {
  canvas.width = mask.width;
  canvas.height = mask.height;
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    ctx = canvas.getContext("2d");
  } catch {
    ctx = null;
  }
  if (!ctx) {
    return;
  }
  const image = ctx.createImageData(mask.width, mask.height);
  for (let i = 0; i < mask.data.length; i += 1) {
    const ink = (mask.data[i] as number) === 1;
    image.data[i * 4] = ink ? 17 : 255;
    image.data[i * 4 + 1] = ink ? 24 : 255;
    image.data[i * 4 + 2] = ink ? 32 : 255;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}

/**
 * Builds the "trace an image to a mark" section into `container`: a drop
 * zone, threshold / swap / grid controls, a source-vs-result compare view,
 * and a "Use this mark" button. Structured like `web/src/generator-form.ts`
 * — vanilla DOM, explicit element creation.
 *
 * The reconstructed ID is never written to the URL or history here; only
 * `opts.onAccept` (wired in `main.ts`) does that.
 */
export function buildTraceSection(container: HTMLElement, opts: TraceSectionOptions): HTMLElement {
  const root = document.createElement("div");
  root.className = "trace-section-body";

  // --- Drop zone + file input -------------------------------------------------
  const dropzone = document.createElement("div");
  dropzone.className = "trace-dropzone";
  const dropLabel = document.createElement("p");
  dropLabel.textContent = "Drop a PNG, JPG, or SVG here, or choose a file.";
  dropzone.appendChild(dropLabel);
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/png,image/jpeg,image/svg+xml";
  dropzone.appendChild(fileInput);
  root.appendChild(dropzone);

  // --- Controls -------------------------------------------------------------
  const controls = document.createElement("div");
  controls.className = "trace-controls";

  const thresholdLabel = document.createElement("label");
  thresholdLabel.append("Threshold");
  const thresholdInput = document.createElement("input");
  thresholdInput.type = "range";
  thresholdInput.min = "0";
  thresholdInput.max = "255";
  thresholdInput.step = "1";
  thresholdInput.value = "128";
  thresholdLabel.appendChild(thresholdInput);
  controls.appendChild(thresholdLabel);

  const swapLabel = document.createElement("label");
  const swapInput = document.createElement("input");
  swapInput.type = "checkbox";
  swapLabel.appendChild(swapInput);
  swapLabel.append(" Swap foreground / background");
  controls.appendChild(swapLabel);

  const gridLabel = document.createElement("label");
  gridLabel.append("Grid");
  const gridInput = document.createElement("input");
  gridInput.type = "range";
  gridInput.min = "1";
  gridInput.max = "8";
  gridInput.step = "1";
  gridInput.value = String(DEFAULT_N);
  gridLabel.appendChild(gridInput);
  const gridReadout = document.createElement("span");
  gridReadout.className = "trace-grid-readout";
  gridReadout.textContent = `${DEFAULT_N} × ${DEFAULT_N}`;
  gridLabel.appendChild(gridReadout);
  controls.appendChild(gridLabel);

  root.appendChild(controls);

  // --- Compare view -------------------------------------------------------
  const compare = document.createElement("div");
  compare.className = "trace-compare";

  const sourcePanel = document.createElement("div");
  sourcePanel.className = "trace-panel";
  const sourceCaption = document.createElement("p");
  sourceCaption.className = "trace-caption";
  sourceCaption.textContent = "Source";
  sourcePanel.appendChild(sourceCaption);
  const sourceCanvas = document.createElement("canvas");
  sourcePanel.appendChild(sourceCanvas);
  compare.appendChild(sourcePanel);

  const resultPanel = document.createElement("div");
  resultPanel.className = "trace-panel";
  const resultCaption = document.createElement("p");
  resultCaption.className = "trace-caption";
  resultCaption.textContent = "Result";
  resultPanel.appendChild(resultCaption);
  const resultView = document.createElement("div");
  resultView.className = "trace-result";
  resultPanel.appendChild(resultView);
  compare.appendChild(resultPanel);

  root.appendChild(compare);

  const status = document.createElement("p");
  status.className = "trace-status";
  root.appendChild(status);

  const useButton = document.createElement("button");
  useButton.type = "button";
  useButton.textContent = "Use this mark";
  useButton.disabled = true;
  root.appendChild(useButton);

  // --- State -------------------------------------------------------------
  let rgba: Rgba | null = null;
  let squaredMask: Mask | null = null;
  let currentShapeId: string | null = null;
  let candidates: Promise<ReadonlyMap<number, Mask>> | null = null;

  /** Clears the result view and disables acceptance. */
  function clearResult(): void {
    resultView.innerHTML = "";
    currentShapeId = null;
    useButton.disabled = true;
  }

  /** Re-matches the stored squared mask against the candidate primitives. */
  async function runReconstruction(): Promise<void> {
    if (!squaredMask || !candidates) {
      return;
    }
    const gridN = Number(gridInput.value);
    const resolved = await candidates;
    const { shapeId } = reconstruct({
      squaredMask,
      gridN,
      candidates: resolved,
      subRes: SUB_RES,
    });
    paintMask(sourceCanvas, squaredMask);
    resultView.innerHTML = renderShape(shapeId);
    currentShapeId = shapeId;
    useButton.disabled = false;
    status.textContent = "";
  }

  /** Re-binarizes the loaded image with the current threshold / swap. */
  function runBinarize(): void {
    if (!rgba) {
      return;
    }
    const luminance = toLuminance(rgba.data, rgba.width, rgba.height);
    let mask = binarize(luminance, rgba.width, rgba.height, Number(thresholdInput.value));
    if (swapInput.checked) {
      mask = swapMask(mask);
    }
    const bounds = contentBounds(mask);
    if (!bounds) {
      squaredMask = null;
      clearResult();
      status.textContent =
        "No shape found at this threshold — adjust the threshold or swap toggle.";
      return;
    }
    squaredMask = cropAndSquare(mask, bounds);
    void runReconstruction();
  }

  const recomputeFromBinarize = debounce(runBinarize, DEBOUNCE_MS);
  const recomputeReconstruction = debounce(() => {
    void runReconstruction();
  }, DEBOUNCE_MS);

  /** Loads a dropped/selected file and seeds the threshold + swap controls. */
  async function loadFile(file: File): Promise<void> {
    status.textContent = "Reading image…";
    if (!candidates) {
      candidates = candidateMasks(SUB_RES);
    }
    try {
      rgba = await imageFileToRgba(file, WORK_SIZE);
    } catch (error) {
      rgba = null;
      squaredMask = null;
      clearResult();
      status.textContent = error instanceof Error ? error.message : "Failed to read the image.";
      return;
    }
    const luminance = toLuminance(rgba.data, rgba.width, rgba.height);
    const seededThreshold = otsuThreshold(luminance);
    thresholdInput.value = String(seededThreshold);
    const seedMask = binarize(luminance, rgba.width, rgba.height, seededThreshold);
    swapInput.checked = guessSwapForeground(seedMask);
    status.textContent = "";
    runBinarize();
  }

  // --- Events -------------------------------------------------------------
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) {
      void loadFile(file);
    }
  });

  dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("is-dragover");
  });
  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("is-dragover");
  });
  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("is-dragover");
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      void loadFile(file);
    }
  });

  thresholdInput.addEventListener("input", recomputeFromBinarize);
  swapInput.addEventListener("input", recomputeFromBinarize);
  gridInput.addEventListener("input", () => {
    const n = Number(gridInput.value);
    gridReadout.textContent = `${n} × ${n}`;
    recomputeReconstruction();
  });

  useButton.addEventListener("click", () => {
    if (currentShapeId) {
      opts.onAccept(currentShapeId);
    }
  });

  container.appendChild(root);
  return root;
}
