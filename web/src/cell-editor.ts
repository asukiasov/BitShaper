import {
  type CellDef,
  type Rotation,
  decodeShapeId,
  encodeShapeId,
  listPrimitives,
} from "bitshaper";
import { renderPrimitiveIcon } from "./primitive-icon.js";

/** Options accepted by {@link buildCellEditor}. */
export interface CellEditorOptions {
  /** Called with a base shape ID (no ramp block) whenever a cell is edited. */
  readonly onEdit: (baseShapeId: string) => void;
}

/** Handle returned by {@link buildCellEditor}. */
export interface CellEditorHandle {
  readonly element: HTMLElement;
  /** Rebuild the overlay for `shapeId`. An undecodable ID clears it, no throw. */
  render(shapeId: string): void;
}

const ROTATIONS: readonly Rotation[] = [0, 90, 180, 270];

/**
 * Builds a click-to-edit overlay layered over the preview SVG: one
 * transparent hit target per grid cell, and a popover (primitive picker,
 * rotation control, invert toggle) for the selected cell. Every edit emits a
 * base shape ID via `opts.onEdit` — the caller re-layers any ramp. Grid
 * dimensions are never changed. Mirrors the vanilla-DOM style of
 * `ramp-panel.ts`.
 */
export function buildCellEditor(container: HTMLElement, opts: CellEditorOptions): CellEditorHandle {
  const root = document.createElement("div");
  root.className = "cell-overlay-root";
  container.appendChild(root);

  let grid: { cols: number; rows: number; cells: readonly CellDef[] } | null = null;
  let popover: HTMLElement | null = null;

  function closePopover(): void {
    popover?.remove();
    popover = null;
    for (const button of root.querySelectorAll<HTMLButtonElement>(
      ".cell-hit[aria-pressed='true']",
    )) {
      button.setAttribute("aria-pressed", "false");
    }
    document.removeEventListener("keydown", onKeydown);
    document.removeEventListener("pointerdown", onOutsidePointerdown, true);
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      closePopover();
    }
  }

  function onOutsidePointerdown(event: Event): void {
    if (popover && !popover.contains(event.target as Node)) {
      closePopover();
    }
  }

  function emit(index: number, updated: CellDef): void {
    if (!grid) {
      return;
    }
    const next = grid.cells.map((c, i) => (i === index ? updated : c));
    opts.onEdit(encodeShapeId({ cols: grid.cols, rows: grid.rows, cells: next }));
  }

  function openPopover(button: HTMLButtonElement, index: number): void {
    closePopover();
    if (!grid) {
      return;
    }
    button.setAttribute("aria-pressed", "true");

    const current = grid.cells[index] as CellDef;
    let draft: CellDef = { ...current };

    const panel = document.createElement("div");
    panel.className = "cell-popover";

    // Primitive picker.
    const picker = document.createElement("div");
    picker.className = "cell-primitives";
    for (const primitive of listPrimitives()) {
      const choice = document.createElement("button");
      choice.type = "button";
      choice.className = "cell-primitive";
      choice.title = primitive.name;
      choice.innerHTML = renderPrimitiveIcon(primitive.index);
      choice.setAttribute("aria-pressed", String(primitive.index === draft.type));
      choice.addEventListener("click", () => {
        draft = { ...draft, type: primitive.index };
        for (const other of picker.querySelectorAll<HTMLButtonElement>(".cell-primitive")) {
          other.setAttribute("aria-pressed", "false");
        }
        choice.setAttribute("aria-pressed", "true");
        emit(index, draft);
      });
      picker.appendChild(choice);
    }
    panel.appendChild(picker);

    // Rotation segmented control.
    const rotation = document.createElement("div");
    rotation.className = "cell-rotation";
    for (const angle of ROTATIONS) {
      const seg = document.createElement("button");
      seg.type = "button";
      seg.textContent = String(angle);
      seg.setAttribute("aria-pressed", String(angle === draft.rotation));
      seg.addEventListener("click", () => {
        draft = { ...draft, rotation: angle };
        for (const other of rotation.querySelectorAll<HTMLButtonElement>("button")) {
          other.setAttribute("aria-pressed", "false");
        }
        seg.setAttribute("aria-pressed", "true");
        emit(index, draft);
      });
      rotation.appendChild(seg);
    }
    panel.appendChild(rotation);

    // Invert toggle.
    const invertLabel = document.createElement("label");
    invertLabel.className = "cell-invert";
    const invertInput = document.createElement("input");
    invertInput.type = "checkbox";
    invertInput.checked = draft.invert;
    invertInput.addEventListener("change", () => {
      draft = { ...draft, invert: invertInput.checked };
      emit(index, draft);
    });
    invertLabel.appendChild(invertInput);
    invertLabel.append(" Invert");
    panel.appendChild(invertLabel);

    root.appendChild(panel);
    popover = panel;

    // Position near the button, clamped inside the container.
    const anchor = button.getBoundingClientRect();
    const bounds = container.getBoundingClientRect();
    const left = Math.max(0, Math.min(anchor.left - bounds.left, bounds.width - panel.offsetWidth));
    const top = Math.max(
      0,
      Math.min(anchor.bottom - bounds.top, bounds.height - panel.offsetHeight),
    );
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;

    document.addEventListener("keydown", onKeydown);
    document.addEventListener("pointerdown", onOutsidePointerdown, true);
  }

  function render(shapeId: string): void {
    closePopover();
    container.appendChild(root);
    root.innerHTML = "";

    let decoded: { cols: number; rows: number; cells: readonly CellDef[] };
    try {
      const shape = decodeShapeId(shapeId);
      decoded = { cols: shape.cols, rows: shape.rows, cells: shape.cells };
    } catch {
      grid = null;
      return;
    }
    grid = decoded;

    const overlay = document.createElement("div");
    overlay.className = "cell-overlay";
    overlay.style.gridTemplateColumns = `repeat(${decoded.cols}, 1fr)`;
    overlay.style.gridTemplateRows = `repeat(${decoded.rows}, 1fr)`;

    for (let i = 0; i < decoded.cols * decoded.rows; i++) {
      const hit = document.createElement("button");
      hit.type = "button";
      hit.className = "cell-hit";
      hit.dataset.index = String(i);
      hit.setAttribute("aria-pressed", "false");
      hit.setAttribute("aria-label", `Edit cell ${i}`);
      hit.addEventListener("click", () => openPopover(hit, i));
      overlay.appendChild(hit);
    }
    root.appendChild(overlay);
  }

  return { element: root, render };
}
