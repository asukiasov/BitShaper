import { type ShapeDef, decodeShapeId, listPrimitives } from "bitshaper";
import { renderPrimitiveIcon } from "./primitive-icon.js";

/** One primitive that appears in a shape, with how many cells use it. */
export interface PrimitiveUsage {
  /** Registry index (`CellDef.type`). */
  readonly index: number;
  /** Stable primitive name from the registry. */
  readonly name: string;
  /** Number of cells in the shape whose `type` is this primitive. */
  readonly count: number;
}

/**
 * Summarizes which primitives a decoded {@link ShapeDef} is built from:
 * one entry per distinct primitive type present, each with its cell count,
 * ordered by registry index. `empty` cells are included — they are a real
 * primitive and part of how a mark is composed.
 */
export function summarizePrimitiveUsage(shape: ShapeDef): PrimitiveUsage[] {
  const names = new Map(listPrimitives().map((p) => [p.index, p.name]));
  const counts = new Map<number, number>();
  for (const cell of shape.cells) {
    counts.set(cell.type, (counts.get(cell.type) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a - b)
    .map(([index, count]) => ({ index, name: names.get(index) ?? `#${index}`, count }));
}

/** Options accepted by {@link renderPrimitiveUsage}. */
export interface PrimitiveUsageOptions {
  /**
   * When provided, a "Use these primitives" button is rendered next to the
   * label; clicking it calls this with the shape's distinct primitive
   * types (registry indices, ascending) and its grid size.
   */
  readonly onReuse?: (allowedTypes: number[], grid: { cols: number; rows: number }) => void;
}

/**
 * Renders the "primitives used" breakdown for `shapeId` into `container`,
 * replacing any prior content: one chip per distinct primitive (icon, name,
 * and cell count when more than one), and — when `opts.onReuse` is given — a
 * "Use these primitives" button. If `shapeId` can't be decoded, the container is
 * simply cleared — the preview itself already surfaces the error.
 */
export function renderPrimitiveUsage(
  container: HTMLElement,
  shapeId: string,
  opts: PrimitiveUsageOptions = {},
): void {
  container.innerHTML = "";

  let shape: ShapeDef;
  try {
    shape = decodeShapeId(shapeId);
  } catch {
    return;
  }

  const usages = summarizePrimitiveUsage(shape);

  const header = document.createElement("div");
  header.className = "primitive-usage-header";
  const label = document.createElement("span");
  label.className = "primitive-usage-label";
  label.textContent = "Primitives used";
  header.appendChild(label);

  if (opts.onReuse) {
    const reuseButton = document.createElement("button");
    reuseButton.type = "button";
    reuseButton.className = "reuse-primitives-button";
    reuseButton.textContent = "Use these primitives";
    reuseButton.title = "Load this mark's primitives and grid into the generator";
    reuseButton.addEventListener("click", () => {
      opts.onReuse?.(
        usages.map((u) => u.index),
        { cols: shape.cols, rows: shape.rows },
      );
    });
    header.appendChild(reuseButton);
  }
  container.appendChild(header);

  for (const usage of summarizePrimitiveUsage(shape)) {
    const chip = document.createElement("span");
    chip.className = "primitive-usage-chip";

    const icon = document.createElement("span");
    icon.className = "primitive-icon";
    icon.innerHTML = renderPrimitiveIcon(usage.index);
    chip.appendChild(icon);

    const name = document.createElement("span");
    name.textContent = usage.count > 1 ? `${usage.name} ×${usage.count}` : usage.name;
    chip.appendChild(name);

    container.appendChild(chip);
  }
}

/** Clears any rendered primitive-usage breakdown from `container`. */
export function clearPrimitiveUsage(container: HTMLElement): void {
  container.innerHTML = "";
}
