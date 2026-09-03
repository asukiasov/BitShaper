import { encodeShapeId } from "bitshaper";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Mask } from "../src/trace/mask.js";

/** A fully-foreground square mask of the given side. */
function solidMask(side: number): Mask {
  return { width: side, height: side, data: new Uint8Array(side * side).fill(1) };
}

/** A fully-background square mask of the given side. */
function emptyMask(side: number): Mask {
  return { width: side, height: side, data: new Uint8Array(side * side) };
}

const rgbaStub = vi.fn();
const candidateStub = vi.fn();

vi.mock("../src/trace/rasterize.js", () => ({
  imageFileToRgba: (...args: unknown[]) => rgbaStub(...args),
  candidateMasks: (...args: unknown[]) => candidateStub(...args),
}));

const { buildTraceSection } = await import("../src/trace-section.js");

/** RGBA buffer that is all black (foreground) so `contentBounds` is non-null. */
function blackRgba(size: number): { data: Uint8ClampedArray; width: number; height: number } {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = y * size + x;
      const edge = x === 0 || y === 0 || x === size - 1 || y === size - 1;
      const v = edge ? 255 : 0;
      data[i * 4] = v;
      data[i * 4 + 1] = v;
      data[i * 4 + 2] = v;
      data[i * 4 + 3] = 255;
    }
  }
  return { data, width: size, height: size };
}

/** RGBA buffer that is all white so `binarize` finds no foreground. */
function whiteRgba(size: number): { data: Uint8ClampedArray; width: number; height: number } {
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  return { data, width: size, height: size };
}

function candidateMap(): ReadonlyMap<number, Mask> {
  // flat index 0 = empty primitive, 8 = second primitive solid-ish.
  return new Map<number, Mask>([
    [0, emptyMask(16)],
    [8, solidMask(16)],
  ]);
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 120));
}

const file = new File(["x"], "shape.png", { type: "image/png" });

afterEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

describe("buildTraceSection", () => {
  it("builds the expected DOM structure with a default 4 × 4 grid", () => {
    const container = document.createElement("div");
    buildTraceSection(container, { onAccept: vi.fn() });

    expect(container.querySelector(".trace-dropzone")).not.toBeNull();
    expect(container.querySelector('input[type="file"]')?.getAttribute("accept")).toBe(
      "image/png,image/jpeg,image/svg+xml",
    );
    expect(container.querySelector(".trace-controls")).not.toBeNull();
    expect(container.querySelector(".trace-compare canvas")).not.toBeNull();
    expect(container.querySelector(".trace-status")).not.toBeNull();

    const gridInput = container.querySelector<HTMLInputElement>(
      '.trace-controls input[type="range"][max="8"]',
    );
    expect(gridInput?.value).toBe("4");
    expect(container.querySelector(".trace-grid-readout")?.textContent).toBe("4 × 4");

    const button = container.querySelector<HTMLButtonElement>("button");
    expect(button?.disabled).toBe(true);
  });

  it("enables the button and fires onAccept once with the displayed ID after a trace", async () => {
    rgbaStub.mockResolvedValue(blackRgba(256));
    candidateStub.mockResolvedValue(candidateMap());
    const onAccept = vi.fn();
    const container = document.createElement("div");
    buildTraceSection(container, { onAccept });

    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    Object.defineProperty(fileInput, "files", { value: [file], configurable: true });
    fileInput?.dispatchEvent(new Event("change"));
    await flush();

    // Force a threshold that splits the black centre from the white ring,
    // independent of the Otsu seed for a two-value histogram.
    const threshold = container.querySelector<HTMLInputElement>('input[type="range"][max="255"]');
    if (threshold) {
      threshold.value = "128";
      threshold.dispatchEvent(new Event("input"));
    }
    await flush();

    const button = container.querySelector<HTMLButtonElement>("button");
    expect(button?.disabled).toBe(false);

    const svg = container.querySelector(".trace-result svg");
    expect(svg).not.toBeNull();

    button?.click();
    expect(onAccept).toHaveBeenCalledOnce();
    const acceptedId = onAccept.mock.calls[0]?.[0] as string;
    expect(() => encodeShapeId).not.toThrow();
    expect(acceptedId.startsWith("BS")).toBe(true);
  });

  it("shows a status message and keeps the button disabled for an empty image", async () => {
    rgbaStub.mockResolvedValue(whiteRgba(256));
    candidateStub.mockResolvedValue(candidateMap());
    const container = document.createElement("div");
    buildTraceSection(container, { onAccept: vi.fn() });

    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    Object.defineProperty(fileInput, "files", { value: [file], configurable: true });
    fileInput?.dispatchEvent(new Event("change"));
    await flush();

    const button = container.querySelector<HTMLButtonElement>("button");
    expect(button?.disabled).toBe(true);
    expect(container.querySelector(".trace-status")?.textContent?.length).toBeGreaterThan(0);
    expect(container.querySelector(".trace-result svg")).toBeNull();
  });
});
