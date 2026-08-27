import { type ShapeDef, decodeShapeId, encodeShapeId } from "bitshaper";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCellEditor } from "../src/cell-editor.js";

function container(): HTMLElement {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return el;
}

const SHAPE_2X3: ShapeDef = {
  cols: 2,
  rows: 3,
  cells: Array.from({ length: 6 }, () => ({ type: 1, rotation: 0 as const, invert: false })),
};
const ID_2X3 = encodeShapeId(SHAPE_2X3);
const RAMPED_ID = encodeShapeId({
  ...SHAPE_2X3,
  ramp: { axis: "column", curve: "linear", tracks: [{ param: "scaleX", from: 0.2, to: 1 }] },
});

function hits(root: HTMLElement): HTMLButtonElement[] {
  return [...root.querySelectorAll<HTMLButtonElement>(".cell-hit")];
}

describe("buildCellEditor", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders one .cell-hit per cell with sequential data-index", () => {
    const root = container();
    const editor = buildCellEditor(root, { onEdit: vi.fn() });
    editor.render(ID_2X3);
    const buttons = hits(root);
    expect(buttons).toHaveLength(6);
    expect(buttons.map((b) => b.dataset.index)).toEqual(["0", "1", "2", "3", "4", "5"]);
  });

  it("clears the overlay for an undecodable ID without throwing", () => {
    const root = container();
    const editor = buildCellEditor(root, { onEdit: vi.fn() });
    editor.render(ID_2X3);
    expect(() => editor.render("BS-2X2-ZZZZZ")).not.toThrow();
    expect(hits(root)).toHaveLength(0);
  });

  it("emits an ID with only cells[2].type changed when a primitive is picked", () => {
    const onEdit = vi.fn();
    const root = container();
    const editor = buildCellEditor(root, { onEdit });
    editor.render(ID_2X3);

    hits(root)[2]?.click();
    const picker = root.querySelectorAll<HTMLButtonElement>(".cell-primitive");
    expect(picker.length).toBeGreaterThan(1);
    picker[3]?.click();

    expect(onEdit).toHaveBeenCalledOnce();
    const decoded = decodeShapeId(onEdit.mock.calls[0][0]);
    expect(decoded.cols).toBe(2);
    expect(decoded.rows).toBe(3);
    expect(decoded.cells[2]).toEqual({ type: 3, rotation: 0, invert: false });
    expect(decoded.cells.filter((_, i) => i !== 2)).toEqual(
      SHAPE_2X3.cells.filter((_, i) => i !== 2),
    );
  });

  it("sets rotation on the selected cell only", () => {
    const onEdit = vi.fn();
    const root = container();
    const editor = buildCellEditor(root, { onEdit });
    editor.render(ID_2X3);

    hits(root)[1]?.click();
    const rot = [...root.querySelectorAll<HTMLButtonElement>(".cell-rotation button")].find(
      (b) => b.textContent === "90",
    );
    rot?.click();

    const decoded = decodeShapeId(onEdit.mock.calls.at(-1)?.[0]);
    expect(decoded.cells[1]).toEqual({ type: 1, rotation: 90, invert: false });
    expect(decoded.cells[0]).toEqual({ type: 1, rotation: 0, invert: false });
  });

  it("toggles invert on the selected cell only", () => {
    const onEdit = vi.fn();
    const root = container();
    const editor = buildCellEditor(root, { onEdit });
    editor.render(ID_2X3);

    hits(root)[4]?.click();
    root.querySelector<HTMLInputElement>(".cell-invert input")?.click();

    const decoded = decodeShapeId(onEdit.mock.calls.at(-1)?.[0]);
    expect(decoded.cells[4]).toEqual({ type: 1, rotation: 0, invert: true });
    expect(decoded.cells[3]).toEqual({ type: 1, rotation: 0, invert: false });
  });

  it("emits a base ID with no ~ block even when the input ID carried a ramp", () => {
    const onEdit = vi.fn();
    const root = container();
    const editor = buildCellEditor(root, { onEdit });
    editor.render(RAMPED_ID);

    hits(root)[0]?.click();
    root.querySelector<HTMLInputElement>(".cell-invert input")?.click();

    expect(onEdit.mock.calls.at(-1)?.[0]).not.toContain("~");
  });

  it("closes the popover on Escape and on outside pointerdown", () => {
    const root = container();
    const editor = buildCellEditor(root, { onEdit: vi.fn() });
    editor.render(ID_2X3);

    hits(root)[0]?.click();
    expect(root.querySelector(".cell-popover")).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(root.querySelector(".cell-popover")).toBeNull();

    hits(root)[0]?.click();
    expect(root.querySelector(".cell-popover")).not.toBeNull();
    document.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(root.querySelector(".cell-popover")).toBeNull();
  });
});
