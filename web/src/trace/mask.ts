/**
 * A binary raster: row-major pixels, each `1` (foreground / ink) or `0`
 * (background). All trace-pipeline geometry is expressed as `Mask`
 * transforms so it can be unit-tested with hand-built masks, away from any
 * canvas.
 */
export interface Mask {
  readonly width: number;
  readonly height: number;
  /** Row-major, 1 = foreground, 0 = background. */
  readonly data: Uint8Array;
}

/**
 * Converts packed RGBA bytes to a per-pixel luminance plane using Rec.709
 * weights (`0.2126 R + 0.7152 G + 0.0722 B`). Alpha is ignored. Output
 * values are in the range 0–255, row-major, one entry per pixel.
 */
export function toLuminance(rgba: Uint8ClampedArray, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  for (let i = 0; i < out.length; i += 1) {
    const r = rgba[i * 4] ?? 0;
    const g = rgba[i * 4 + 1] ?? 0;
    const b = rgba[i * 4 + 2] ?? 0;
    out[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  return out;
}

/**
 * Otsu's method: builds a 256-bin luminance histogram and returns the
 * threshold (0–255) that maximises between-class variance. Falls back to
 * `128` when every pixel shares one bin.
 */
export function otsuThreshold(luminance: Float32Array): number {
  const histogram = new Array<number>(256).fill(0);
  for (const value of luminance) {
    const bin = Math.max(0, Math.min(255, Math.round(value)));
    histogram[bin] += 1;
  }

  const total = luminance.length;
  let sumAll = 0;
  for (let t = 0; t < 256; t += 1) {
    sumAll += t * (histogram[t] as number);
  }

  let weightBackground = 0;
  let sumBackground = 0;
  let bestVariance = -1;
  let bestThreshold = 128;

  for (let t = 0; t < 256; t += 1) {
    weightBackground += histogram[t] as number;
    if (weightBackground === 0) {
      continue;
    }
    const weightForeground = total - weightBackground;
    if (weightForeground === 0) {
      break;
    }
    sumBackground += t * (histogram[t] as number);
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sumAll - sumBackground) / weightForeground;
    const variance = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;
    if (variance > bestVariance) {
      bestVariance = variance;
      bestThreshold = t;
    }
  }

  return bestThreshold;
}

/**
 * Thresholds a luminance plane into a {@link Mask}: a pixel is foreground
 * (`1`) when its luminance is strictly below `threshold` (darker is ink by
 * default). The swap toggle and {@link guessSwapForeground} correct sources
 * where that assumption is wrong.
 */
export function binarize(
  luminance: Float32Array,
  width: number,
  height: number,
  threshold: number,
): Mask {
  const data = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (luminance[i] as number) < threshold ? 1 : 0;
  }
  return { width, height, data };
}

/**
 * Border-majority heuristic: if foreground pixels are the majority of the
 * outer 1px ring, the foreground class is really the background, so the
 * caller should start with the swap toggle on. Returns `true` in that case.
 */
export function guessSwapForeground(mask: Mask): boolean {
  const { width, height, data } = mask;
  let ringCount = 0;
  let ringForeground = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x !== 0 && y !== 0 && x !== width - 1 && y !== height - 1) {
        continue;
      }
      ringCount += 1;
      ringForeground += data[y * width + x] as number;
    }
  }
  return ringCount > 0 && ringForeground * 2 > ringCount;
}

/**
 * Tight bounding box of the foreground pixels, or `null` when the mask has
 * none.
 */
export function contentBounds(
  mask: Mask,
): { x: number; y: number; width: number; height: number } | null {
  const { width, height, data } = mask;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if ((data[y * width + x] as number) === 0) {
        continue;
      }
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) {
    return null;
  }
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Crops `mask` to `bounds`, then centres that rectangle inside a
 * `max(width, height)` square padded with background pixels.
 */
export function cropAndSquare(
  mask: Mask,
  bounds: { x: number; y: number; width: number; height: number },
): Mask {
  const side = Math.max(bounds.width, bounds.height);
  const data = new Uint8Array(side * side);
  const offsetX = Math.floor((side - bounds.width) / 2);
  const offsetY = Math.floor((side - bounds.height) / 2);
  for (let y = 0; y < bounds.height; y += 1) {
    for (let x = 0; x < bounds.width; x += 1) {
      const source = (bounds.y + y) * mask.width + (bounds.x + x);
      const target = (offsetY + y) * side + (offsetX + x);
      data[target] = mask.data[source] as number;
    }
  }
  return { width: side, height: side, data };
}

/**
 * Area-average downsample to `size × size`: each target pixel is the
 * fractional-coverage-weighted mean of the source cells it spans, emitted
 * as `1` when that mean is ≥ 0.5.
 */
export function downsample(mask: Mask, size: number): Mask {
  const { width, height, data } = mask;
  const out = new Uint8Array(size * size);
  const scaleX = width / size;
  const scaleY = height / size;

  for (let ty = 0; ty < size; ty += 1) {
    const sy0 = ty * scaleY;
    const sy1 = (ty + 1) * scaleY;
    for (let tx = 0; tx < size; tx += 1) {
      const sx0 = tx * scaleX;
      const sx1 = (tx + 1) * scaleX;
      let sum = 0;
      for (let sy = Math.floor(sy0); sy < Math.ceil(sy1); sy += 1) {
        const wy = Math.min(sy + 1, sy1) - Math.max(sy, sy0);
        for (let sx = Math.floor(sx0); sx < Math.ceil(sx1); sx += 1) {
          const wx = Math.min(sx + 1, sx1) - Math.max(sx, sx0);
          sum += wy * wx * (data[sy * width + sx] as number);
        }
      }
      const area = (sy1 - sy0) * (sx1 - sx0);
      out[ty * size + tx] = sum / area >= 0.5 ? 1 : 0;
    }
  }
  return { width: size, height: size, data: out };
}
