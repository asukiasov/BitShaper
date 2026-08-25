import { writeFileSync } from "node:fs";
import { renderShape } from "../../core/index.js";

/** Options accepted by {@link runRenderCommand}, mirroring the `render` subcommand's flags. */
export interface RenderCommandOptions {
  /** Fill color passed through to `renderShape`; omitted uses the render default. */
  readonly fill?: string;
}

/**
 * Implements the `bitshaper render <shapeId> -o <outputFile> [--fill <color>]`
 * subcommand: decodes and renders `shapeId`, then writes the resulting SVG to
 * `outputFile`. On failure (invalid shape ID, render error, or a file-write
 * failure such as a missing directory or permission error), prints a
 * user-facing error message and sets a non-zero `process.exitCode` — decode
 * and render always happen before the output file is opened for writing, so
 * a decode/render failure never leaves a partial file behind. The write is
 * guarded by its own try/catch so a filesystem-level failure also produces
 * a clean error message instead of an uncaught stack trace.
 */
export function runRenderCommand(
  shapeId: string,
  outputFile: string,
  options: RenderCommandOptions = {},
): void {
  let svg: string;
  try {
    svg = renderShape(shapeId, { fill: options.fill });
  } catch (error) {
    reportCliError(error);
    return;
  }

  try {
    writeFileSync(outputFile, svg, "utf8");
  } catch (error) {
    reportCliError(error);
  }
}

/** Prints a clean, user-facing error message and marks the process exit code non-zero. */
function reportCliError(error: unknown): void {
  const message = error instanceof Error ? error.message : "An unexpected error occurred.";
  console.error(`Error: ${message}`);
  process.exitCode = 1;
}
