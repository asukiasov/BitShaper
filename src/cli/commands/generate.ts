import { writeFileSync } from "node:fs";
import { generateShapeId, renderShape } from "../../core/index.js";
import type { GridSize } from "../../core/index.js";

/** Pattern for a `--grid` value: `<cols>x<rows>`, e.g. `4x4`. */
const GRID_PATTERN = /^(\d+)x(\d+)$/i;

/** Options accepted by {@link runGenerateCommand}, mirroring the `generate` subcommand's flags. */
export interface GenerateCommandOptions {
  /** Seed value passed through to `generateShapeId`. */
  readonly seed: string;
  /** Raw `--grid` value in `<cols>x<rows>` form; omitted uses `generateShapeId`'s default grid. */
  readonly grid?: string;
}

/**
 * Implements the `bitshaper generate --seed <seed> [--grid <colsxrows>] -o <outputFile>`
 * subcommand: deterministically generates a shape ID from `options.seed`
 * (and optional grid size), renders it, and writes the SVG to `outputFile`.
 * On failure (malformed `--grid` value, generate/render error, or a
 * file-write failure such as a missing directory or permission error),
 * prints a user-facing error message and sets a non-zero `process.exitCode`.
 * The write is guarded by its own try/catch, separate from the
 * generate/render try/catch, so a filesystem-level failure also produces a
 * clean error message instead of an uncaught stack trace.
 */
export function runGenerateCommand(outputFile: string, options: GenerateCommandOptions): void {
  let svg: string;
  try {
    const grid = options.grid === undefined ? undefined : parseGrid(options.grid);
    const shapeId = generateShapeId(options.seed, grid);
    svg = renderShape(shapeId);
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

/** Parses a `--grid` value (`<cols>x<rows>`) into a {@link GridSize}. */
function parseGrid(value: string): GridSize {
  const match = GRID_PATTERN.exec(value);
  if (!match) {
    throw new Error(`Invalid --grid value "${value}"; expected format <cols>x<rows>, e.g. "4x4".`);
  }
  const [, colsStr, rowsStr] = match as unknown as [string, string, string];
  return { cols: Number(colsStr), rows: Number(rowsStr) };
}

/** Prints a clean, user-facing error message and marks the process exit code non-zero. */
function reportCliError(error: unknown): void {
  const message = error instanceof Error ? error.message : "An unexpected error occurred.";
  console.error(`Error: ${message}`);
  process.exitCode = 1;
}
