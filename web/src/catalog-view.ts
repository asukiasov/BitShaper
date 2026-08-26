import { renderShape } from "bitshaper";
import { type CatalogEntry, listCatalog } from "bitshaper/library";

/** Options accepted by {@link renderCatalogView}. */
export interface CatalogViewOptions {
  /** Called with a catalog entry's shape ID when that entry is selected (clicked). */
  readonly onSelect: (shapeId: string) => void;
}

/** Builds one catalog entry's preview tile. */
function buildEntryElement(
  entry: CatalogEntry,
  onSelect: (shapeId: string) => void,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "catalog-entry";
  button.dataset.shapeId = entry.id;

  const preview = document.createElement("div");
  preview.className = "catalog-entry-preview";
  preview.innerHTML = renderShape(entry.id);
  button.appendChild(preview);

  const name = document.createElement("span");
  name.className = "catalog-entry-name";
  name.textContent = entry.name;
  button.appendChild(name);

  if (entry.tags.length > 0) {
    const tags = document.createElement("span");
    tags.className = "catalog-entry-tags";
    tags.textContent = entry.tags.join(", ");
    button.appendChild(tags);
  }

  button.addEventListener("click", () => onSelect(entry.id));

  return button;
}

/**
 * Renders every entry from `listCatalog()` as a preview (via `renderShape`)
 * plus name and tags, into `container`, replacing any prior content.
 * Selecting an entry (click) invokes `opts.onSelect` with that entry's
 * shape ID — the caller (see `main.ts`) wires this to `updateUrlForShape`
 * and the live preview.
 */
export function renderCatalogView(container: HTMLElement, opts: CatalogViewOptions): void {
  container.innerHTML = "";
  container.classList.add("catalog-view");
  for (const entry of listCatalog()) {
    container.appendChild(buildEntryElement(entry, opts.onSelect));
  }
}
