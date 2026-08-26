import { triggerDownload } from "./download.js";

/** Default filename used for a downloaded PNG export. */
const DEFAULT_FILENAME = "bitshaper-mark.png";

/** Default rasterized PNG width/height, in pixels, when `opts.size` is omitted. */
const DEFAULT_SIZE = 512;

/** Options accepted by {@link exportPng}. */
export interface ExportPngOptions {
  /** Rasterized PNG width/height, in pixels. Defaults to 512. */
  readonly size?: number;
  /** Filename used for the downloaded file. Defaults to `bitshaper-mark.png`. */
  readonly filename?: string;
}

/**
 * Rasterizes `svgMarkup` to PNG client-side (via an offscreen `<canvas>`)
 * and triggers a browser download of the result. No server-side rendering
 * is involved, matching the app's static-first requirement.
 */
export async function exportPng(svgMarkup: string, opts?: ExportPngOptions): Promise<void> {
  const size = opts?.size ?? DEFAULT_SIZE;
  const filename = opts?.filename ?? DEFAULT_FILENAME;
  const pngBlob = await rasterizeSvgToPng(svgMarkup, size);
  triggerDownload(pngBlob, filename);
}

/** Draws `svgMarkup` into an offscreen canvas and reads it back as a PNG blob. */
function rasterizeSvgToPng(svgMarkup: string, size: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const svgUrl = URL.createObjectURL(new Blob([svgMarkup], { type: "image/svg+xml" }));
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(svgUrl);

      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context is not available in this browser."));
        return;
      }

      ctx.drawImage(image, 0, 0, size, size);
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
