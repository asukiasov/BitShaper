import catalogData from "./catalog.json" with { type: "json" };

/**
 * One curated shape in the catalog: a valid, renderable shape ID paired
 * with a human-friendly name and descriptive tags.
 */
export interface CatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly tags: readonly string[];
}

const CATALOG: readonly CatalogEntry[] = catalogData;

/**
 * Returns every curated catalog entry. Every entry's `id` is guaranteed to
 * decode and render without error against the current primitive set.
 * Returns a shallow copy — mutating the returned array does not affect the
 * module's internal catalog.
 */
export function listCatalog(): CatalogEntry[] {
  return [...CATALOG];
}

/**
 * Looks up a single catalog entry by its exact shape ID string, or
 * `undefined` if no entry matches.
 */
export function getCatalogEntry(id: string): CatalogEntry | undefined {
  return CATALOG.find((entry) => entry.id === id);
}
