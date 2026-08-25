import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runGenerateCommand } from "../../../src/cli/commands/generate.js";

describe("runGenerateCommand", () => {
  let dir: string;
  let outFile: string;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "bitshaper-cli-generate-"));
    outFile = join(dir, "out.svg");
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    process.exitCode = 0;
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    errorSpy.mockRestore();
    process.exitCode = 0;
  });

  it("writes a rendered SVG for the given seed and grid", () => {
    runGenerateCommand(outFile, { seed: "foo", grid: "4x4" });

    expect(existsSync(outFile)).toBe(true);
    expect(readFileSync(outFile, "utf8")).toContain("<svg");
    expect(process.exitCode).toBe(0);
  });

  it("applies the default grid size when --grid is omitted", () => {
    runGenerateCommand(outFile, { seed: "foo" });

    expect(existsSync(outFile)).toBe(true);
    expect(process.exitCode).toBe(0);
  });

  it("produces byte-identical output across two runs with the same seed and grid", () => {
    const outFileA = join(dir, "a.svg");
    const outFileB = join(dir, "b.svg");

    runGenerateCommand(outFileA, { seed: "foo", grid: "4x4" });
    runGenerateCommand(outFileB, { seed: "foo", grid: "4x4" });

    expect(readFileSync(outFileA, "utf8")).toEqual(readFileSync(outFileB, "utf8"));
  });

  it("exits non-zero and does not write the output file for a malformed --grid value", () => {
    runGenerateCommand(outFile, { seed: "foo", grid: "not-a-grid" });

    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalled();
    expect(existsSync(outFile)).toBe(false);
  });
});
