import { type Mask, downsample } from "./mask.js";
import { assembleShapeId, matchCell } from "./score.js";

/** Input to {@link reconstruct}. Everything canvas-dependent is resolved by the caller. */
export interface ReconstructInput {
  /** The cropped, squared foreground mask of the source image. */
  readonly squaredMask: Mask;
  /** Number of cells per side of the target square grid. */
  readonly gridN: number;
  /** Candidate primitive masks, keyed by flat index, each `subRes × subRes`. */
  readonly candidates: ReadonlyMap<number, Mask>;
  /** Side length the per-cell tiles are downsampled to before matching. */
  readonly subRes: number;
}

/** Result of {@link reconstruct}. */
export interface ReconstructResult {
  /** The assembled `gridN × gridN` BitShaper shape ID. */
  readonly shapeId: string;
  /** Row-major per-cell downsampled masks (`subRes × subRes` each), for the source preview. */
  readonly cellMasks: readonly Mask[];
}

/**
 * Splits `squaredMask` into a `gridN × gridN` grid of tiles on rounded
 * integer boundaries (the mask side need not divide evenly), downsamples
 * each tile to `subRes`, matches it against `candidates` by IoU, and
 * assembles the row-major flat indices into a shape ID.
 *
 * Pure: no DOM or canvas access — `candidates` is supplied by the caller.
 */
export function reconstruct(input: ReconstructInput): ReconstructResult {
  const { squaredMask, gridN, candidates, subRes } = input;
  const { width, height, data } = squaredMask;

  const cellMasks: Mask[] = [];
  const flatIndices: number[] = [];

  for (let row = 0; row < gridN; row += 1) {
    const y0 = Math.round((row * height) / gridN);
    const y1 = Math.round(((row + 1) * height) / gridN);
    for (let col = 0; col < gridN; col += 1) {
      const x0 = Math.round((col * width) / gridN);
      const x1 = Math.round(((col + 1) * width) / gridN);
      const tileWidth = Math.max(1, x1 - x0);
      const tileHeight = Math.max(1, y1 - y0);

      const tile = new Uint8Array(tileWidth * tileHeight);
      for (let ty = 0; ty < tileHeight; ty += 1) {
        const sy = Math.min(y0 + ty, height - 1);
        for (let tx = 0; tx < tileWidth; tx += 1) {
          const sx = Math.min(x0 + tx, width - 1);
          tile[ty * tileWidth + tx] = data[sy * width + sx] as number;
        }
      }

      const cellMask = downsample({ width: tileWidth, height: tileHeight, data: tile }, subRes);
      cellMasks.push(cellMask);
      flatIndices.push(matchCell(cellMask, candidates));
    }
  }

  return { shapeId: assembleShapeId(gridN, flatIndices), cellMasks };
}
