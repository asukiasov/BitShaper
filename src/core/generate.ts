import { encodeShapeId } from "./id.js";
import { createRandom, hashStringToSeed } from "./random.js";
import { PRIMITIVE_REGISTRY } from "./registry.js";
import type { CellDef, Rotation, ShapeDef } from "./types.js";

/** Grid size applied by {@link generateShapeDef} and {@link generateShapeId} when `grid` is omitted. */
const DEFAULT_GRID = { cols: 4, rows: 4 } as const;

/** The four rotation values a generated cell may be assigned. */
const ROTATIONS: readonly Rotation[] = [0, 90, 180, 270];

/** A grid size, as accepted by {@link generateShapeDef} and {@link generateShapeId}. */
export interface GridSize {
  readonly cols: number;
  readonly rows: number;
}

/** Derives a numeric mulberry32 seed from a string or number seed. */
function toNumericSeed(seed: string | number): number {
  return typeof seed === "string" ? hashStringToSeed(seed) : seed >>> 0;
}

/** Picks one uniformly random cell definition using the given PRNG. */
function randomCell(random: () => number): CellDef {
  const type = Math.floor(random() * PRIMITIVE_REGISTRY.length);
  const rotation = ROTATIONS[Math.floor(random() * ROTATIONS.length)] as Rotation;
  const invert = random() < 0.5;
  return { type, rotation, invert };
}

/**
 * Deterministically generates a {@link ShapeDef} from a seed (string or
 * number) and an optional grid size, using a mulberry32 PRNG seeded from
 * `seed` (string seeds are hashed via {@link hashStringToSeed} first). The
 * same seed and grid size always produce the same `ShapeDef`. When `grid`
 * is omitted, a default 4×4 grid is used.
 */
export function generateShapeDef(seed: string | number, grid?: GridSize): ShapeDef {
  const { cols, rows } = grid ?? DEFAULT_GRID;
  const random = createRandom(toNumericSeed(seed));

  const cells: CellDef[] = [];
  for (let i = 0; i < cols * rows; i++) {
    cells.push(randomCell(random));
  }

  return { cols, rows, cells };
}

/**
 * Convenience wrapper that generates a {@link ShapeDef} via
 * {@link generateShapeDef} and encodes it via `encodeShapeId`, returning the
 * resulting shape ID string. Deterministic for the same seed and grid size.
 */
export function generateShapeId(seed: string | number, grid?: GridSize): string {
  return encodeShapeId(generateShapeDef(seed, grid));
}
