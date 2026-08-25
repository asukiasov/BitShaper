import { describe, expect, it } from "vitest";
import { createRandom, hashStringToSeed } from "../../src/core/random.js";

describe("createRandom", () => {
  it("produces the same sequence for the same seed", () => {
    const a = createRandom(12345);
    const b = createRandom(12345);
    const sequenceA = [a(), a(), a()];
    const sequenceB = [b(), b(), b()];
    expect(sequenceA).toEqual(sequenceB);
  });

  it("produces a different sequence for a different seed", () => {
    const a = createRandom(1);
    const b = createRandom(2);
    expect(a()).not.toEqual(b());
  });

  it("yields floats within [0, 1)", () => {
    const random = createRandom(42);
    for (let i = 0; i < 100; i++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("hashStringToSeed", () => {
  it("returns the same hash for the same string", () => {
    expect(hashStringToSeed("bitshaper")).toBe(hashStringToSeed("bitshaper"));
  });

  it("returns different hashes for different strings", () => {
    expect(hashStringToSeed("foo")).not.toBe(hashStringToSeed("bar"));
  });

  it("returns a non-negative 32-bit integer", () => {
    const hash = hashStringToSeed("some-string-seed");
    expect(Number.isInteger(hash)).toBe(true);
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThanOrEqual(0xffffffff);
  });

  it("feeds createRandom to produce a deterministic sequence from a string seed", () => {
    const seed = hashStringToSeed("some-seed");
    const a = createRandom(seed);
    const b = createRandom(hashStringToSeed("some-seed"));
    expect(a()).toBe(b());
  });
});
