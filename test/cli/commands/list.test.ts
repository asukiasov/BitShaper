import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runListCommand } from "../../../src/cli/commands/list.js";
import type { CatalogEntry } from "../../../src/library/index.js";

describe("runListCommand", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("prints each catalog entry's id, name, and tags", () => {
    const entries: CatalogEntry[] = [
      { id: "BS-1X1-1F", name: "Square", tags: ["basic", "fill"] },
      { id: "BS-2X2-00000", name: "Diamond", tags: ["curved"] },
    ];

    runListCommand(() => entries);

    const output = logSpy.mock.calls.map((call) => String(call[0])).join("\n");
    expect(output).toContain("BS-1X1-1F");
    expect(output).toContain("Square");
    expect(output).toContain("basic");
    expect(output).toContain("BS-2X2-00000");
    expect(output).toContain("Diamond");
    expect(output).toContain("curved");
  });

  it("prints a message indicating the catalog is empty, rather than nothing", () => {
    runListCommand(() => []);

    expect(logSpy).toHaveBeenCalledTimes(1);
    const [message] = logSpy.mock.calls[0] as [string];
    expect(message.toLowerCase()).toContain("empty");
  });
});
