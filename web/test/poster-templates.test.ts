import { describe, expect, it } from "vitest";
import {
  DEFAULT_POSTER_STATE,
  PALETTES,
  type PosterState,
  renderPosterSvg,
} from "../src/poster-templates.js";

const base: PosterState = { ...DEFAULT_POSTER_STATE, title: "HELLO", cols: 3, rows: 4 };

describe("renderPosterSvg", () => {
  it("returns one 2:3 svg with the escaped title", () => {
    const svg = renderPosterSvg({ ...base, title: "A & B <x>" });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('viewBox="0 0 1000 1500"');
    expect(svg).toContain("A &amp; B &lt;x&gt;");
  });

  it("emits one <g> group per grid cell", () => {
    const svg = renderPosterSvg(base);
    expect((svg.match(/<g transform/g) ?? []).length).toBe(3 * 4);
  });

  it("draws the default shape as a real <path> (no fallback outline)", () => {
    const svg = renderPosterSvg(DEFAULT_POSTER_STATE);
    expect(svg).toContain("<path d=");
    expect(svg).not.toContain("valid shape ID");
  });

  it("paints the selected palette background", () => {
    const svg = renderPosterSvg({ ...base, palette: "violet" });
    expect(svg).toContain(`fill="${PALETTES.violet.bg}"`);
  });

  it("checker and rows patterns place the accent colour differently", () => {
    const checker = renderPosterSvg({ ...base, pattern: "checker", palette: "violet" });
    const rows = renderPosterSvg({ ...base, pattern: "rows", palette: "violet" });
    expect(checker).not.toEqual(rows);
    expect(checker).toContain(`fill="${PALETTES.violet.accent}"`);
  });

  it("does not throw on an undecodable shape id and shows a note", () => {
    const svg = renderPosterSvg({ ...base, shapeId: "not-a-real-id" });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain("valid shape ID");
  });

  it("omits the footer caption element when caption is empty", () => {
    const withCap = renderPosterSvg({ ...base, textPos: "top-left", caption: " finis " });
    const noCap = renderPosterSvg({ ...base, textPos: "top-left", caption: "" });
    expect(withCap).toContain("finis");
    expect((noCap.match(/<text /g) ?? []).length).toBeLessThan(
      (withCap.match(/<text /g) ?? []).length,
    );
  });
});
