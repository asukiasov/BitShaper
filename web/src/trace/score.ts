import { type CellDef, type Rotation, encodeShapeId } from "bitshaper";
import type { Mask } from "./mask.js";

/** Rotation in degrees for each 0–3 rotation code, in order. */
const ROTATIONS: readonly Rotation[] = [0, 90, 180, 270];

/**
 * Intersection-over-union of the foreground pixels of two equally sized
 * masks: `|A ∩ B| / |A ∪ B|`. Two empty masks count as identical and
 * return `1`.
 *
 * @throws {Error} when `a` and `b` differ in size.
 */
export function iou(a: Mask, b: Mask): number {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error("iou requires masks of equal dimensions.");
  }
  let intersection = 0;
  let union = 0;
  for (let i = 0; i < a.data.length; i += 1) {
    const inA = (a.data[i] as number) === 1;
    const inB = (b.data[i] as number) === 1;
    if (inA && inB) intersection += 1;
    if (inA || inB) union += 1;
  }
  return union === 0 ? 1 : intersection / union;
}

/**
 * Returns the candidate key whose mask best matches `cellMask` by
 * {@link iou}. Keys are compared in ascending numeric order and the first
 * one wins a tie, so the lowest flat index is preferred among equally good
 * matches.
 *
 * @throws {Error} when `candidates` is empty.
 */
export function matchCell(cellMask: Mask, candidates: ReadonlyMap<number, Mask>): number {
  const keys = [...candidates.keys()].sort((x, y) => x - y);
  if (keys.length === 0) {
    throw new Error("matchCell requires at least one candidate.");
  }
  let bestKey = keys[0] as number;
  let bestScore = -1;
  for (const key of keys) {
    const score = iou(cellMask, candidates.get(key) as Mask);
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }
  return bestKey;
}

/**
 * Builds an `n × n` shape ID from row-major per-cell flat indices. Each
 * index decomposes as `{ type: ⌊i / 8⌋, rotation: [0,90,180,270][⌊i / 2⌋ %
 * 4], invert: (i & 1) === 1 }`; `encodeShapeId` then picks the `BS`/`BS2`
 * format automatically based on the largest index.
 */
export function assembleShapeId(n: number, flatIndices: readonly number[]): string {
  const cells: CellDef[] = flatIndices.map((i) => ({
    type: Math.floor(i / 8),
    rotation: ROTATIONS[Math.floor(i / 2) % 4] as Rotation,
    invert: (i & 1) === 1,
  }));
  return encodeShapeId({ cols: n, rows: n, cells });
}
