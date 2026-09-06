import {
  type CellDef,
  type GridSize,
  type ShapeDef,
  decodeShapeId,
  encodeShapeId,
  generateShapeDef,
  listPrimitives,
} from "bitshaper";

/**
 * Deterministically remaps a cell whose primitive type isn't in
 * `allowedTypes` to one that is, as a pure function of the cell's own type
 * index (no additional randomness) — so the same input `ShapeDef` and
 * `allowedTypes` always produce the same remapped cell.
 */
function remapCellToAllowedType(cell: CellDef, allowedTypes: readonly number[]): CellDef {
  if (allowedTypes.includes(cell.type)) {
    return cell;
  }
  const type = allowedTypes[cell.type % allowedTypes.length] as number;
  return { ...cell, type };
}

/**
 * Restricts `shape` to only use primitive types in `allowedTypes`, remapping
 * any other cell deterministically. `bitshaper`'s `generateShapeDef` has no
 * primitive-subset parameter, so the primitive-mix control is a pure
 * client-side filter applied after generation.
 */
export function applyPrimitiveMix(shape: ShapeDef, allowedTypes: readonly number[]): ShapeDef {
  if (allowedTypes.length === 0) {
    throw new Error("allowedTypes must include at least one primitive type index.");
  }
  return { ...shape, cells: shape.cells.map((cell) => remapCellToAllowedType(cell, allowedTypes)) };
}

/**
 * Deterministically generates a shape ID from `seed` and `grid`, restricted to
 * `allowedTypes`. The same `seed`, `grid`, and `allowedTypes` always produce
 * the same shape ID.
 */
export function generateFilteredShapeId(
  seed: string,
  grid: GridSize,
  allowedTypes: readonly number[],
): string {
  const shape = generateShapeDef(seed, grid);
  return encodeShapeId(applyPrimitiveMix(shape, allowedTypes));
}

/** Generates a short, human-readable random seed (e.g. `"k3j9x2p1"`). */
export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

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
 * Summarizes which primitives a decoded {@link ShapeDef} is built from: one
 * entry per distinct primitive type present, each with its cell count, ordered
 * by registry index. `empty` cells are included.
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

/** Decodes `shapeId`, returning `undefined` instead of throwing on failure. */
export function tryDecodeShapeId(shapeId: string): ShapeDef | undefined {
  try {
    return decodeShapeId(shapeId);
  } catch {
    return undefined;
  }
}
