import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { triggerDownload } from "../src/download.js";
import { exportPng } from "../src/export-png.js";

vi.mock("../src/download.js", () => ({ triggerDownload: vi.fn() }));

describe("exportPng canvas sizing", () => {
  let created: HTMLCanvasElement[];

  beforeEach(() => {
    created = [];
    vi.mocked(triggerDownload).mockClear();
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = realCreate(tag) as HTMLElement;
      if (tag === "canvas") {
        const canvas = el as HTMLCanvasElement;
        canvas.getContext = () => ({ drawImage: () => {} }) as unknown as CanvasRenderingContext2D;
        canvas.toBlob = (cb: BlobCallback) => cb(new Blob(["png"], { type: "image/png" }));
        created.push(canvas);
      }
      return el;
    });
    // Make the offscreen Image resolve synchronously.
    Object.defineProperty(globalThis, "Image", {
      configurable: true,
      value: class {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_v: string) {
          queueMicrotask(() => this.onload?.());
        }
      },
    });
    vi.stubGlobal(
      "URL",
      Object.assign(Object.create(URL), {
        createObjectURL: vi.fn(() => "blob:mock"),
        revokeObjectURL: vi.fn(),
      }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sizes the canvas to width/height when given", async () => {
    await exportPng("<svg/>", { width: 2000, height: 3000, filename: "poster.png" });
    expect(created[0].width).toBe(2000);
    expect(created[0].height).toBe(3000);
    expect(triggerDownload).toHaveBeenCalledWith(expect.any(Blob), "poster.png");
  });

  it("still supports the square size shorthand", async () => {
    await exportPng("<svg/>", { size: 512 });
    expect(created[0].width).toBe(512);
    expect(created[0].height).toBe(512);
  });
});
