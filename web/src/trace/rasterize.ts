import { type CellDef, type Rotation, encodeShapeId, listPrimitives, renderShape } from "bitshaper";
import { type Mask, binarize, downsample, toLuminance } from "./mask.js";

/** Rotation in degrees for each 0–3 rotation code, in order. */
const ROTATIONS: readonly Rotation[] = [0, 90, 180, 270];

/**
 * Supersample factor applied when rasterizing each 1×1 candidate primitive
 * before it is area-averaged down to the sub-resolution grid.
 */
const CANDIDATE_SUPERSAMPLE = 4;

/**
 * Luminance threshold (0–255) used to binarize a rasterized candidate
 * primitive. Candidates render as solid black paint on white, so any
 * mid-grey split works.
 */
const CANDIDATE_THRESHOLD = 128;

/** In-flight / resolved {@link candidateMasks} results, keyed by registry size and sub-resolution. */
const candidateCache = new Map<string, Promise<ReadonlyMap<number, Mask>>>();

/**
 * Loads `file` through an `<Image>` and draws it into a `size × size`
 * canvas (white-filled first, so transparent PNG/SVG regions read as
 * background), returning the raw RGBA bytes. The image's intrinsic
 * `width`/`height` are forced to `size` before load so a viewBox-only SVG
 * still rasterizes. The object URL is revoked on both success and failure.
 *
 * jsdom cannot rasterize, so this canvas glue has no unit test — it is
 * covered by the Playwright task alongside `export-png.ts`.
 */
export function imageFileToRgba(
  file: File,
  size: number,
): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.width = size;
    image.height = size;

    image.onload = () => {
      URL.revokeObjectURL(url);
      try {
        resolve(drawToRgba(image, size));
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load the dropped image for tracing."));
    };

    image.src = url;
  });
}

/**
 * Rasterizes every `type × rotation × invert` primitive combination to a
 * `subRes × subRes` {@link Mask}, keyed by flat index
 * (`type * 8 + rotation * 2 + invert`). The resolved map is cached at
 * module scope, keyed by `` `${listPrimitives().length}:${subRes}` ``, so
 * the registry is rasterized at most once per sub-resolution.
 *
 * Canvas glue — no unit test, covered by the Playwright task.
 */
export function candidateMasks(subRes: number): Promise<ReadonlyMap<number, Mask>> {
  const key = `${listPrimitives().length}:${subRes}`;
  const cached = candidateCache.get(key);
  if (cached) {
    return cached;
  }
  const pending = buildCandidateMasks(subRes);
  candidateCache.set(key, pending);
  return pending;
}

/** Draws a loaded image onto a white `size²` canvas and reads back its RGBA bytes. */
function drawToRgba(
  image: CanvasImageSource,
  size: number,
): { data: Uint8ClampedArray; width: number; height: number } {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context is not available in this browser.");
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(image, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  return { data, width: size, height: size };
}

/** Rasterizes and downsamples the whole primitive registry into a candidate map. */
async function buildCandidateMasks(subRes: number): Promise<ReadonlyMap<number, Mask>> {
  const typeCount = listPrimitives().length;
  const superSize = subRes * CANDIDATE_SUPERSAMPLE;
  const entries = new Map<number, Mask>();

  for (let type = 0; type < typeCount; type += 1) {
    for (let rot = 0; rot < 4; rot += 1) {
      for (let inv = 0; inv < 2; inv += 1) {
        const flatIndex = type * 8 + rot * 2 + inv;
        const cell: CellDef = {
          type,
          rotation: ROTATIONS[rot] as Rotation,
          invert: inv === 1,
        };
        const svg = renderShape(encodeShapeId({ cols: 1, rows: 1, cells: [cell] }), {
          size: superSize,
        });
        const rgba = await svgToRgba(svg, superSize);
        const luminance = toLuminance(rgba, superSize, superSize);
        const mask = binarize(luminance, superSize, superSize, CANDIDATE_THRESHOLD);
        entries.set(flatIndex, downsample(mask, subRes));
      }
    }
  }

  return entries;
}

/** Rasterizes SVG markup to RGBA bytes via the same Image→canvas path as {@link imageFileToRgba}. */
function svgToRgba(svgMarkup: string, size: number): Promise<Uint8ClampedArray> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svgMarkup], { type: "image/svg+xml" }));
    const image = new Image();
    image.width = size;
    image.height = size;

    image.onload = () => {
      URL.revokeObjectURL(url);
      try {
        resolve(drawToRgba(image, size).data);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to rasterize a candidate primitive."));
    };

    image.src = url;
  });
}
