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
  /** Index of the logically-selected cell, or null when nothing is selected. */
  let selectedIndex: number | null = null;
  /** The hit button that opened the current popover, for focus restoration. */
  let anchorButton: HTMLButtonElement | null = null;
  /** True only while an `emit()` is in flight, so the caller's re-render can reopen. */
  let emitting = false;

  function closePopover(restoreFocus = true): void {
    const wasOpen = popover !== null;
    popover?.remove();
    popover = null;
    selectedIndex = null;
    for (const button of root.querySelectorAll<HTMLButtonElement>(
      ".cell-hit[aria-pressed='true']",
    )) {
      button.setAttribute("aria-pressed", "false");
    }
    document.removeEventListener("keydown", onKeydown);
    document.removeEventListener("pointerdown", onOutsidePointerdown, true);
    if (wasOpen && restoreFocus && anchorButton?.isConnected) {
      anchorButton.focus();
    }
    anchorButton = null;
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
    emitting = true;
    try {
      opts.onEdit(encodeShapeId({ cols: grid.cols, rows: grid.rows, cells: next }));
    } finally {
      emitting = false;
    }
  }

  function openPopover(button: HTMLButtonElement, index: number): void {
    closePopover(false);
    if (!grid) {
      return;
    }
    selectedIndex = index;
    anchorButton = button;
    button.setAttribute("aria-pressed", "true");

    const current = grid.cells[index] as CellDef;
    let draft: CellDef = { ...current };

    const panel = document.createElement("div");
    panel.className = "cell-popover";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", `Edit cell ${index}`);

    // Primitive picker.
    const picker = document.createElement("div");
    picker.className = "cell-primitives";
    for (const primitive of listPrimitives()) {
      const choice = document.createElement("button");
      choice.type = "button";
      choice.className = "cell-primitive";
      choice.title = primitive.name;
      choice.setAttribute("aria-label", primitive.name);
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
      seg.textContent = `${angle}°`;
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

    // Move focus into the popover (first focusable control).
    panel.querySelector<HTMLElement>("button, input, [tabindex]")?.focus();
  }

  function render(shapeId: string): void {
    // If this render was triggered by our own edit, reopen the same cell after
    // rebuilding; otherwise the popover closes for good.
    const reopenIndex = emitting ? selectedIndex : null;
    closePopover(false);
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
    // `renderShape` anchors the mark top-left with `cellSize = size / max(cols, rows)`,
    // so a non-square grid fills only part of the square canvas. Size the overlay to
    // that same fraction (the `.cell-overlay-root` already matches the SVG content box).
    const axis = Math.max(decoded.cols, decoded.rows);
    overlay.style.setProperty("--cell-overlay-w", `${(decoded.cols / axis) * 100}%`);
    overlay.style.setProperty("--cell-overlay-h", `${(decoded.rows / axis) * 100}%`);

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

    if (reopenIndex !== null && reopenIndex >= 0 && reopenIndex < decoded.cols * decoded.rows) {
      const button = overlay.children[reopenIndex] as HTMLButtonElement | undefined;
      if (button) {
        openPopover(button, reopenIndex);
      }
    }
  }

  return { element: root, render };
}
