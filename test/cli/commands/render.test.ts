import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runRenderCommand } from "../../../src/cli/commands/render.js";
import { encodeShapeId } from "../../../src/core/id.js";

const VALID_SHAPE_ID = encodeShapeId({
  cols: 1,
  rows: 1,
  cells: [{ type: 1, rotation: 0, invert: false }],
});

describe("runRenderCommand", () => {
  let dir: string;
  let outFile: string;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "bitshaper-cli-render-"));
    outFile = join(dir, "out.svg");
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    process.exitCode = 0;
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    errorSpy.mockRestore();
    process.exitCode = 0;
  });

  it("writes the rendered SVG to the output file on success", () => {
    runRenderCommand(VALID_SHAPE_ID, outFile);

    expect(existsSync(outFile)).toBe(true);
    expect(readFileSync(outFile, "utf8")).toContain("<svg");
    expect(process.exitCode).toBe(0);
  });

  it("passes the --fill option through to the written SVG's fill color", () => {
    runRenderCommand(VALID_SHAPE_ID, outFile, { fill: "#333" });

    expect(readFileSync(outFile, "utf8")).toContain('fill="#333"');
  });

  it("exits non-zero and prints an error for an invalid shape ID", () => {
    runRenderCommand("not-a-valid-id", outFile);

    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("does not write the output file when the shape ID is invalid", () => {
    runRenderCommand("not-a-valid-id", outFile);

    expect(existsSync(outFile)).toBe(false);
  });
});
