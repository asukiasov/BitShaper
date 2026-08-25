import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { encodeShapeId } from "../../src/core/id.js";

const VALID_SHAPE_ID = encodeShapeId({
  cols: 1,
  rows: 1,
  cells: [{ type: 1, rotation: 0, invert: false }],
});

describe("cli entrypoint wiring", () => {
  let dir: string;
  let outFile: string;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let originalArgv: string[];

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "bitshaper-cli-index-"));
    outFile = join(dir, "out.svg");
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    originalArgv = process.argv;
    vi.resetModules();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    logSpy.mockRestore();
    process.argv = originalArgv;
  });

  it("routes `render` through commander to write an SVG file", async () => {
    process.argv = ["node", "bitshaper", "render", VALID_SHAPE_ID, "-o", outFile];

    await import("../../src/cli/index.js");

    expect(existsSync(outFile)).toBe(true);
    expect(readFileSync(outFile, "utf8")).toContain("<svg");
  });

  it("routes `list` through commander to print catalog entries", async () => {
    process.argv = ["node", "bitshaper", "list"];

    await import("../../src/cli/index.js");

    expect(logSpy).toHaveBeenCalled();
  });
});
