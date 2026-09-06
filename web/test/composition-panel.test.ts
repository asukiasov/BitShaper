import { decodeShapeId, listPrimitives } from "bitshaper";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCompositionPanel } from "../src/composition-panel.js";
import { generateFilteredShapeId } from "../src/generate.js";

const PRIMITIVE_COUNT = listPrimitives().length;

function build(onRandomize: () => void = vi.fn()) {
  const container = document.createElement("div");
  const handle = buildCompositionPanel(container, { onRandomize });
  return { container, handle, onRandomize };
}

describe("buildCompositionPanel — primitive toggles", () => {
  it("renders one toggle per registered primitive, all pressed", () => {
    const { container, handle } = build();
    const toggles = container.querySelectorAll(".primitive-toggle");
    expect(toggles.length).toBe(PRIMITIVE_COUNT);
    expect(handle.allowedTypes().length).toBe(PRIMITIVE_COUNT);
  });

  it("drops a primitive from allowedTypes when its toggle is clicked off", () => {
    const { container, handle } = build();
    const first = container.querySelector<HTMLButtonElement>('.primitive-toggle[data-type="1"]');
    first?.click();
    expect(first?.getAttribute("aria-pressed")).toBe("false");
    expect(handle.allowedTypes()).not.toContain(1);
  });
});

describe("buildCompositionPanel — Randomize", () => {
  it("rolls a fresh seed and calls onRandomize on every click", () => {
    const onRandomize = vi.fn();
    const { container, handle } = build(onRandomize);
    const button = container.querySelector<HTMLButtonElement>(".randomize-button");

    button?.click();
    const first = handle.seedValue();
    expect(first.length).toBeGreaterThan(0);

    button?.click();
    const second = handle.seedValue();

    expect(second).not.toBe(first);
    expect(onRandomize).toHaveBeenCalledTimes(2);
  });

  it("re-runs a typed seed on Enter without overwriting it", () => {
    const onRandomize = vi.fn();
    const { container } = build(onRandomize);
    const seed = container.querySelector<HTMLInputElement>('input[name="seed"]');
    if (seed) {
      seed.value = "pinecone";
      seed.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    }
    expect(seed?.value).toBe("pinecone");
    expect(onRandomize).toHaveBeenCalledOnce();
  });

  it("feeds a decodable, deterministic id for a fixed seed (Enter re-run)", () => {
    const ids: string[] = [];
    const { container, handle } = build(() => {
      ids.push(
        generateFilteredShapeId(handle.seedValue(), handle.gridSize(), handle.allowedTypes()),
      );
    });
    const seed = container.querySelector<HTMLInputElement>('input[name="seed"]');
    if (seed) {
      seed.value = "wallpaper";
      seed.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      seed.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    }
    expect(ids[0]).toBe(ids[1]);
    expect(() => decodeShapeId(ids[0] as string)).not.toThrow();
  });
});

describe("buildCompositionPanel — shape-driven state", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("syncGrid writes the shape's grid into the inputs", () => {
    const { container, handle } = build();
    handle.syncGrid({ cols: 6, rows: 3, cells: [] });
    expect((container.querySelector('input[name="cols"]') as HTMLInputElement).value).toBe("6");
    expect((container.querySelector('input[name="rows"]') as HTMLInputElement).value).toBe("3");
    expect(handle.gridSize()).toEqual({ cols: 6, rows: 3 });
  });

  it("showUsage badges only the used primitives and never presses a toggle", () => {
    const { container, handle } = build();
    handle.showUsage({
      cols: 2,
      rows: 1,
      cells: [
        { type: 1, rotation: 0, invert: false },
        { type: 1, rotation: 0, invert: false },
      ],
    });
    const used = container.querySelector<HTMLButtonElement>('.primitive-toggle[data-type="1"]');
    const unused = container.querySelector<HTMLButtonElement>('.primitive-toggle[data-type="0"]');
    expect(used?.querySelector(".primitive-toggle-badge")?.textContent).toBe("×2");
    expect(used?.dataset.used).toBe("true");
    expect(unused?.dataset.used).toBeUndefined();
    expect(
      [...container.querySelectorAll(".primitive-toggle")].every(
        (t) => t.getAttribute("aria-pressed") === "true",
      ),
    ).toBe(true);

    handle.clearUsage();
    expect(used?.dataset.used).toBeUndefined();
    expect(used?.querySelector(".primitive-toggle-badge")?.textContent).toBe("");
  });

  it("copies the current seed via the Copy button", () => {
    const { container } = build();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    (container.querySelector('input[name="seed"]') as HTMLInputElement).value = "pinecone";
    container.querySelector<HTMLButtonElement>(".copy-seed-button")?.click();
    expect(writeText).toHaveBeenCalledWith("pinecone");
    vi.unstubAllGlobals();
  });
});
