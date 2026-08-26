import { renderShape } from "bitshaper";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exportSvg } from "../src/export-svg.js";

function readBlobAsText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

let capturedBlobs: Blob[];

beforeEach(() => {
  capturedBlobs = [];
  vi.stubGlobal(
    "URL",
    Object.assign(Object.create(URL), {
      createObjectURL: vi.fn((blob: Blob) => {
        capturedBlobs.push(blob);
        return "blob:mock-url";
      }),
      revokeObjectURL: vi.fn(),
    }),
  );
  // jsdom attempts real navigation on an anchor click, which it doesn't
  // implement and logs noisily; the download itself is a browser-native
  // side effect this test doesn't need jsdom to actually perform.
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("exportSvg", () => {
  it("downloads content that byte-matches the given SVG markup", async () => {
    const svgMarkup = renderShape("BS-2X2-08GOm");

    exportSvg(svgMarkup);

    expect(capturedBlobs).toHaveLength(1);
    // jsdom's Blob has no text()/arrayBuffer(); read it back via FileReader,
    // which jsdom does implement.
    const downloadedText = await readBlobAsText(capturedBlobs[0] as Blob);
    expect(downloadedText).toBe(svgMarkup);
  });
});
