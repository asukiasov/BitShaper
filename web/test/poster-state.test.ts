import { beforeEach, describe, expect, it } from "vitest";
import { readPosterFromUrl, updatePosterUrl } from "../src/poster-state.js";
import { DEFAULT_POSTER_STATE, type PosterState } from "../src/poster-templates.js";

beforeEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("poster-state", () => {
  it("returns the default state when no params are present", () => {
    expect(readPosterFromUrl()).toEqual(DEFAULT_POSTER_STATE);
  });

  it("round-trips a non-default state through the URL", () => {
    const state: PosterState = {
      ...DEFAULT_POSTER_STATE,
      shapeId: "BS-2X2-8888W",
      title: "TRANSITION",
      subtitle: "009",
      caption: "vector / minimal",
      textPos: "top-split",
      cols: 6,
      rows: 8,
      palette: "violet",
      pattern: "rows",
      seed: "abc",
    };
    updatePosterUrl(state);
    expect(readPosterFromUrl()).toEqual(state);
  });

  it("clamps out-of-range columns and rows", () => {
    window.history.replaceState({}, "", "/?pc=99&pr=0");
    const s = readPosterFromUrl();
    expect(s.cols).toBe(8);
    expect(s.rows).toBe(1);
  });

  it("falls back on unknown palette / position", () => {
    window.history.replaceState({}, "", "/?ppal=chartreuse&ppos=sideways");
    const s = readPosterFromUrl();
    expect(s.palette).toBe(DEFAULT_POSTER_STATE.palette);
    expect(s.textPos).toBe(DEFAULT_POSTER_STATE.textPos);
  });

  it("leaves an existing ?id= untouched and omits default params", () => {
    window.history.replaceState({}, "", "/?id=BS-2X2-8888W#poster");
    updatePosterUrl({ ...DEFAULT_POSTER_STATE, title: "X" });
    expect(window.location.search).toContain("id=BS-2X2-8888W");
    expect(window.location.search).toContain("pt=X");
    expect(window.location.search).not.toContain("ppal=");
    expect(window.location.hash).toBe("#poster");
  });
});
