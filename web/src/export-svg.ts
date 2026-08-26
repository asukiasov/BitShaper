import { triggerDownload } from "./download.js";

/** Default filename used for a downloaded SVG export. */
const DEFAULT_FILENAME = "bitshaper-mark.svg";

/**
 * Triggers a browser download of `svgMarkup` as a `.svg` file. The
 * downloaded file's content is exactly `svgMarkup` — no re-serialization,
 * so it byte-matches whatever is currently shown in the preview.
 */
export function exportSvg(svgMarkup: string, filename: string = DEFAULT_FILENAME): void {
  const blob = new Blob([svgMarkup], { type: "image/svg+xml" });
  triggerDownload(blob, filename);
}
