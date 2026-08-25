/**
 * Creates a mulberry32 pseudo-random number generator seeded by a 32-bit
 * integer. Each call to the returned function yields the next float in
 * [0, 1), deterministic for a given seed across runs, platforms, and Node
 * versions.
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return function random(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministically hashes a string to a 32-bit unsigned integer using
 * FNV-1a. Used to derive a numeric seed for {@link createRandom} from a
 * string seed (e.g. `generateShapeDef("some-string-seed", ...)`).
 */
export function hashStringToSeed(input: string): number {
  let hash = 0x811c9dc5; // FNV-1a 32-bit offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193); // FNV-1a 32-bit prime
  }
  return hash >>> 0;
}
