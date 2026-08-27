import { decodeShapeId, listPrimitives } from "bitshaper";
import { describe, expect, it, vi } from "vitest";
import {
  buildGeneratorForm,
  generateFilteredShapeId,
  setGridSize,
  setPrimitiveMix,
  submitGeneratorForm,
} from "../src/generator-form.js";

const ALL_PRIMITIVE_TYPES = listPrimitives().map((p) => p.index);

function submit(form: HTMLFormElement): void {
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

function setValue(form: HTMLFormElement, name: string, value: string): void {
  const input = form.elements.namedItem(name) as HTMLInputElement;
  input.value = value;
}

describe("generateFilteredShapeId", () => {
  it("produces the same shape id for the same seed, grid, and primitive mix", () => {
    const first = generateFilteredShapeId("acorn", { cols: 3, rows: 3 }, ALL_PRIMITIVE_TYPES);
    const second = generateFilteredShapeId("acorn", { cols: 3, rows: 3 }, ALL_PRIMITIVE_TYPES);
    expect(second).toBe(first);
  });

  it("produces a shape whose cols/rows match the requested grid size", () => {
    const shapeId = generateFilteredShapeId("acorn", { cols: 5, rows: 2 }, ALL_PRIMITIVE_TYPES);
    const shape = decodeShapeId(shapeId);
    expect(shape.cols).toBe(5);
    expect(shape.rows).toBe(2);
  });

  it("only uses primitive types from the allowed set", () => {
    const allowed = [0, 1];
    const shapeId = generateFilteredShapeId("acorn", { cols: 4, rows: 4 }, allowed);
    const shape = decodeShapeId(shapeId);
    for (const cell of shape.cells) {
      expect(allowed).toContain(cell.type);
    }
  });
});

describe("buildGeneratorForm primitive-mix icons", () => {
  it("renders one preview icon per primitive checkbox", () => {
    const container = document.createElement("div");
    const form = buildGeneratorForm(container, { onGenerate: vi.fn() });

    const checkboxes = form.querySelectorAll('input[name="primitive"]');
    const icons = form.querySelectorAll(".primitive-icon svg");
    expect(checkboxes.length).toBe(ALL_PRIMITIVE_TYPES.length);
    expect(icons.length).toBe(ALL_PRIMITIVE_TYPES.length);
  });
});

describe("buildGeneratorForm", () => {
  it("generates the same shape id for two submits with identical seed and grid", () => {
    const container = document.createElement("div");
    const onGenerate = vi.fn();
    const form = buildGeneratorForm(container, { onGenerate });

    setValue(form, "seed", "pinecone");
    setValue(form, "cols", "3");
    setValue(form, "rows", "3");

    submit(form);
    submit(form);

    expect(onGenerate).toHaveBeenCalledTimes(2);
    expect(onGenerate.mock.calls[0]?.[0]).toBe(onGenerate.mock.calls[1]?.[0]);
  });

  it("changes the generated shape's cols/rows when the grid size control changes", () => {
    const container = document.createElement("div");
    const onGenerate = vi.fn();
    const form = buildGeneratorForm(container, { onGenerate });

    setValue(form, "seed", "pinecone");
    setValue(form, "cols", "2");
    setValue(form, "rows", "2");
    submit(form);

    setValue(form, "cols", "6");
    setValue(form, "rows", "3");
    submit(form);

    const firstShape = decodeShapeId(onGenerate.mock.calls[0]?.[0]);
    const secondShape = decodeShapeId(onGenerate.mock.calls[1]?.[0]);
    expect(firstShape.cols).toBe(2);
    expect(firstShape.rows).toBe(2);
    expect(secondShape.cols).toBe(6);
    expect(secondShape.rows).toBe(3);
  });

  it("generates from Generate with a blank seed, auto-filling a random one", () => {
    const container = document.createElement("div");
    const onGenerate = vi.fn();
    const form = buildGeneratorForm(container, { onGenerate });
    const seedInput = form.elements.namedItem("seed") as HTMLInputElement;

    expect(seedInput.value).toBe("");
    submit(form);

    expect(seedInput.value.length).toBeGreaterThan(0);
    expect(onGenerate).toHaveBeenCalledOnce();
    expect(() => decodeShapeId(onGenerate.mock.calls[0]?.[0])).not.toThrow();
  });

  it("fills in a random seed and generates when the Randomize button is clicked", () => {
    const container = document.createElement("div");
    const onGenerate = vi.fn();
    const form = buildGeneratorForm(container, { onGenerate });
    const seedInput = form.elements.namedItem("seed") as HTMLInputElement;
    const randomizeButton = form.querySelector<HTMLButtonElement>(".randomize-button");

    expect(seedInput.value).toBe("");
    randomizeButton?.click();

    expect(seedInput.value.length).toBeGreaterThan(0);
    expect(onGenerate).toHaveBeenCalledOnce();
    expect(() => decodeShapeId(onGenerate.mock.calls[0]?.[0])).not.toThrow();
  });

  it("setPrimitiveMix / setGridSize / submitGeneratorForm drive the form to reuse an existing mark's palette", () => {
    const container = document.createElement("div");
    const onGenerate = vi.fn();
    const form = buildGeneratorForm(container, { onGenerate });

    setPrimitiveMix(form, [0, 5]);
    setGridSize(form, { cols: 3, rows: 2 });
    submitGeneratorForm(form);

    const checked = [...form.querySelectorAll<HTMLInputElement>('input[name="primitive"]')]
      .filter((c) => c.checked)
      .map((c) => Number(c.value))
      .sort((a, b) => a - b);
    expect(checked).toEqual([0, 5]);

    expect(onGenerate).toHaveBeenCalledOnce();
    const shape = decodeShapeId(onGenerate.mock.calls[0]?.[0]);
    expect(shape.cols).toBe(3);
    expect(shape.rows).toBe(2);
    for (const cell of shape.cells) {
      expect([0, 5]).toContain(cell.type);
    }
  });

  it("generates a different seed on repeated Randomize clicks", () => {
    const container = document.createElement("div");
    const onGenerate = vi.fn();
    const form = buildGeneratorForm(container, { onGenerate });
    const seedInput = form.elements.namedItem("seed") as HTMLInputElement;
    const randomizeButton = form.querySelector<HTMLButtonElement>(".randomize-button");

    randomizeButton?.click();
    const firstSeed = seedInput.value;
    randomizeButton?.click();
    const secondSeed = seedInput.value;

    expect(secondSeed).not.toBe(firstSeed);
  });
});
