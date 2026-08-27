import { type ShapeDef, decodeShapeId, encodeShapeId } from "bitshaper";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCellEditor, placePopover } from "../src/cell-editor.js";

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
function panelBox(pos: { left: number; top: number }, pw: number, ph: number): Box {
  return { left: pos.left, top: pos.top, right: pos.left + pw, bottom: pos.top + ph };
}
function intersects(a: Box, b: Box): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
function within(a: Box, w: number, h: number): boolean {
  return a.left >= 0 && a.top >= 0 && a.right <= w && a.bottom <= h;
}

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

describe("placePopover", () => {
  const bounds = { width: 400, height: 400 };
  const pw = 120;
  const ph = 100;
  const gap = 8;

  it("places the popover to the right of a top-left cell, not overlapping it", () => {
    const cell: Box = { left: 0, top: 0, right: 40, bottom: 40 };
    const pos = placePopover(cell, bounds, pw, ph, gap);
    expect(pos).toEqual({ left: 48, top: 0 });
    const box = panelBox(pos, pw, ph);
    expect(intersects(box, cell)).toBe(false);
    expect(within(box, bounds.width, bounds.height)).toBe(true);
  });

  it("flips to the left when the cell hugs the right edge", () => {
    const cell: Box = { left: 360, top: 0, right: 400, bottom: 40 };
    const pos = placePopover(cell, bounds, pw, ph, gap);
    expect(pos.left).toBe(360 - gap - pw);
    const box = panelBox(pos, pw, ph);
    expect(intersects(box, cell)).toBe(false);
    expect(within(box, bounds.width, bounds.height)).toBe(true);
  });

  it("falls back to the roomiest axis, flush to the far edge, when nothing fits beside", () => {
    // A near-full cell: no side has room for the whole panel.
    const cell: Box = { left: 40, top: 40, right: 360, bottom: 360 };
    const pos = placePopover(cell, bounds, pw, ph, gap);
    const box = panelBox(pos, pw, ph);
    // horizontal space (both sides ~40) ties/beats vertical -> flush to the far
    // horizontal edge, maximally away from the cell.
    expect(pos.left).toBe(bounds.width - pw);
    expect(within(box, bounds.width, bounds.height)).toBe(true);
  });
});

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
      (b) => b.textContent === "90°",
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

  it("reopens the same cell's popover after a re-render triggered by its own edit", () => {
    const root = container();
    let currentId = ID_2X3;
    const editor = buildCellEditor(root, {
      onEdit: (id) => {
        currentId = id;
        editor.render(id);
      },
    });
    editor.render(currentId);

    hits(root)[2]?.click();
    root.querySelector<HTMLInputElement>(".cell-invert input")?.click();

    // Popover survives the re-render and still targets cell 2.
    expect(root.querySelector(".cell-popover")).not.toBeNull();
    expect(hits(root)[2]?.getAttribute("aria-pressed")).toBe("true");
    // ...and reflects the freshly-emitted cell state.
    expect(root.querySelector<HTMLInputElement>(".cell-invert input")?.checked).toBe(true);
    expect(decodeShapeId(currentId).cells[2]).toEqual({ type: 1, rotation: 0, invert: true });

    // A genuine close (Escape) does not reopen on the next render.
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    editor.render(currentId);
    expect(root.querySelector(".cell-popover")).toBeNull();
  });

  it("sizes the overlay to the mark's fraction of the square canvas for a non-square grid", () => {
    const root = container();
    const editor = buildCellEditor(root, { onEdit: vi.fn() });
    editor.render(ID_2X3);

    const overlay = root.querySelector<HTMLElement>(".cell-overlay");
    expect(overlay).not.toBeNull();
    expect(overlay?.style.gridTemplateColumns).toBe("repeat(2, 1fr)");
    expect(overlay?.style.gridTemplateRows).toBe("repeat(3, 1fr)");
    // 2x3 → max axis 3 → width 2/3, height 3/3 of the content box, top-left anchored.
    expect(overlay?.style.getPropertyValue("--cell-overlay-w")).toBe(`${(2 / 3) * 100}%`);
    expect(overlay?.style.getPropertyValue("--cell-overlay-h")).toBe("100%");
  });

  it("opens the popover beside the selected cell (not over it) and marks the cell pressed", () => {
    const root = container();
    const editor = buildCellEditor(root, { onEdit: vi.fn() });
    editor.render(ID_2X3);

    const overlayRoot = root.querySelector<HTMLElement>(".cell-overlay-root");
    if (!overlayRoot) throw new Error("overlay root missing");
    overlayRoot.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400 }) as DOMRect;

    // Cell hugging the right edge: 360..400 x 0..40.
    const cellRect = { left: 360, top: 0, width: 40, height: 40, right: 400, bottom: 40 };
    const button = hits(root)[1] as HTMLButtonElement;
    button.getBoundingClientRect = () => cellRect as DOMRect;

    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      get() {
        return (this as HTMLElement).classList.contains("cell-popover") ? 120 : 0;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get() {
        return (this as HTMLElement).classList.contains("cell-popover") ? 100 : 0;
      },
    });

    try {
      button.click();
      const panel = root.querySelector<HTMLElement>(".cell-popover");
      if (!panel) throw new Error("popover missing");
      const left = Number.parseFloat(panel.style.left);
      const top = Number.parseFloat(panel.style.top);
      const box: Box = { left, top, right: left + 120, bottom: top + 100 };
      const cell: Box = { left: 360, top: 0, right: 400, bottom: 40 };
      expect(intersects(box, cell)).toBe(false);
      expect(within(box, 400, 400)).toBe(true);
      // right side does not fit (360+8+120 > 400) -> flips left
      expect(left).toBe(360 - 8 - 120);
      expect(button.getAttribute("aria-pressed")).toBe("true");
    } finally {
      // biome-ignore lint/performance/noDelete: restore the prototype stub
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).offsetWidth;
      // biome-ignore lint/performance/noDelete: restore the prototype stub
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).offsetHeight;
    }
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
