import { type Ramp, type ShapeDef, decodeShapeId, encodeShapeId } from "bitshaper";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildRampPanel } from "../src/ramp-panel.js";

function container(): HTMLElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return el;
}

const baseShape = (ramp?: Ramp): ShapeDef => ({
  cols: 4,
  rows: 4,
  cells: Array.from({ length: 16 }, () => ({ type: 4, rotation: 0 as const, invert: false })),
  ...(ramp ? { ramp } : {}),
});

/** Drags every range input in `root` to the given base62 index. */
function setSliders(root: HTMLElement, fromIndex: number, toIndex: number): void {
  const inputs = root.querySelectorAll<HTMLInputElement>('input[type="range"]');
  const set = (input: HTMLInputElement, value: number): void => {
    input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  };
  set(inputs[0] as HTMLInputElement, fromIndex);
  set(inputs[1] as HTMLInputElement, toIndex);
}

function addTrack(root: HTMLElement, param: string): void {
  const add = root.querySelector<HTMLSelectElement>(".morph-add") as HTMLSelectElement;
  add.value = param;
  add.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("buildRampPanel", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("reports undefined while it has no tracks", () => {
    const onChange = vi.fn();
    const panel = buildRampPanel(container(), { onChange });
    expect(panel.currentRamp()).toBeUndefined();
  });

  it("emits a ramp that round-trips through the shape ID once a track is dragged", () => {
    const onChange = vi.fn();
    const root = container();
    const panel = buildRampPanel(root, { onChange });

    addTrack(root, "scaleX");
    setSliders(root, 5, 61); // ~0.16 -> ~1.97

    const ramp = panel.currentRamp();
    expect(ramp).toBeDefined();
    expect(onChange).toHaveBeenLastCalledWith(ramp);

    const id = encodeShapeId(baseShape(ramp));
    expect(id).toContain("~");
    const decoded = decodeShapeId(id).ramp;
    expect(decoded?.axis).toBe("column");
    expect(decoded?.tracks[0]?.param).toBe("scaleX");
    expect(decoded?.tracks).toHaveLength(1);
  });

  it("populates its controls from a ramped shape", () => {
    const root = container();
    const panel = buildRampPanel(root, { onChange: vi.fn() });
    panel.setFromShape(
      baseShape({
        axis: "row",
        curve: "easeIn",
        tracks: [{ param: "angle", from: 0, to: 90 }],
      }),
    );

    const selects = root.querySelectorAll<HTMLSelectElement>(".morph-select select");
    expect((selects[0] as HTMLSelectElement).value).toBe("row");
    expect((selects[1] as HTMLSelectElement).value).toBe("easeIn");
    expect(root.querySelectorAll(".morph-track")).toHaveLength(1);
    expect(root.querySelector<HTMLDetailsElement>(".morph-panel")?.open).toBe(true);
  });

  it("omits scale from the add menu once scaleX is in use", () => {
    const root = container();
    buildRampPanel(root, { onChange: vi.fn() });
    addTrack(root, "scaleX");
    const options = [...root.querySelectorAll<HTMLOptionElement>(".morph-add option")].map(
      (o) => o.value,
    );
    expect(options).not.toContain("scale");
    expect(options).toContain("scaleY");
    expect(options).toContain("angle");
  });

  it("clears the ramp on 'remove morph'", () => {
    const onChange = vi.fn();
    const root = container();
    const panel = buildRampPanel(root, { onChange });
    addTrack(root, "scale");
    setSliders(root, 0, 61);
    expect(panel.currentRamp()).toBeDefined();

    (root.querySelector(".morph-remove") as HTMLButtonElement).click();
    expect(panel.currentRamp()).toBeUndefined();
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });
});
