import { type CatalogEntry, listCatalog } from "../../library/index.js";

/**
 * Implements the `bitshaper list` subcommand: prints every entry in the
 * curated catalog (its shape ID, name, and tags) to stdout, one per line.
 * Prints a graceful "the catalog is empty" message instead of erroring or
 * printing nothing when the catalog has no entries.
 *
 * @param getCatalog Source of catalog entries; defaults to `listCatalog`.
 * Overridable for testing.
 */
export function runListCommand(getCatalog: () => CatalogEntry[] = listCatalog): void {
  const entries = getCatalog();

  if (entries.length === 0) {
    console.log("The catalog is empty.");
    return;
  }

  for (const entry of entries) {
    console.log(`${entry.id}  ${entry.name}  [${entry.tags.join(", ")}]`);
  }
}
