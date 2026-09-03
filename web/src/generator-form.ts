import {
  type CellDef,
  type GridSize,
  type ShapeDef,
  encodeShapeId,
  generateShapeDef,
  generateTileableShapeId,
  listPrimitives,
  renderShape,
} from "bitshaper";

/** Grid size preselected in a freshly built generator form. */
const DEFAULT_GRID: GridSize = { cols: 4, rows: 4 };

/** Options accepted by {@link buildGeneratorForm}. */
export interface GeneratorFormOptions {
  /** Called with a newly generated shape ID whenever the form is submitted. */
  readonly onGenerate: (shapeId: string) => void;
}

/**
 * Deterministically remaps a cell whose primitive type isn't in
 * `allowedTypes` to one that is, as a pure function of the cell's own
 * type index (no additional randomness) — so the same input `ShapeDef`
 * and `allowedTypes` always produce the same remapped cell.
 */
function remapCellToAllowedType(cell: CellDef, allowedTypes: readonly number[]): CellDef {
  if (allowedTypes.includes(cell.type)) {
    return cell;
  }
  const type = allowedTypes[cell.type % allowedTypes.length] as number;
  return { ...cell, type };
}

/**
 * Restricts `shape` to only use primitive types in `allowedTypes`,
 * remapping any other cell deterministically. `bitshaper`'s published
 * `generateShapeId`/`generateShapeDef` have no primitive-subset parameter
 * (their signature is fixed by the published core package), so the
 * primitive-mix control is implemented as this pure client-side filter
 * applied after generation, rather than a core-package change.
 */
export function applyPrimitiveMix(shape: ShapeDef, allowedTypes: readonly number[]): ShapeDef {
  if (allowedTypes.length === 0) {
    throw new Error("allowedTypes must include at least one primitive type index.");
  }
  return { ...shape, cells: shape.cells.map((cell) => remapCellToAllowedType(cell, allowedTypes)) };
}

/**
 * Deterministically generates a shape ID from `seed` and `grid`, restricted
 * to `allowedTypes`. The same `seed`, `grid`, and `allowedTypes` always
 * produce the same shape ID.
 */
export function generateFilteredShapeId(
  seed: string,
  grid: GridSize,
  allowedTypes: readonly number[],
): string {
  const shape = generateShapeDef(seed, grid);
  return encodeShapeId(applyPrimitiveMix(shape, allowedTypes));
}

/** Whether the "Seamless tile" checkbox is currently checked in `form`. */
export function readTileable(form: HTMLFormElement): boolean {
  const box = form.elements.namedItem("tileable");
  return box instanceof HTMLInputElement && box.checked;
}

/** Reads the grid size currently entered in `form`. */
export function readGridSize(form: HTMLFormElement): GridSize {
  const data = new FormData(form);
  const cols = Number(data.get("cols"));
  const rows = Number(data.get("rows"));
  return { cols, rows };
}

/** Reads the primitive type indices currently checked in `form`. */
export function readSelectedPrimitiveTypes(form: HTMLFormElement): number[] {
  return new FormData(form)
    .getAll("primitive")
    .map((value) => Number(value))
    .sort((a, b) => a - b);
}

/** Generates a short, human-readable random seed (e.g. `"k3j9x2p1"`). */
export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Sets the primitive-mix checkboxes in `form` so exactly the types in
 * `allowedTypes` are checked and all others are cleared. Used by the
 * preview's "Reuse primitives" action to seed the generator from an
 * existing mark.
 */
export function setPrimitiveMix(form: HTMLFormElement, allowedTypes: readonly number[]): void {
  const wanted = new Set(allowedTypes);
  for (const checkbox of form.querySelectorAll<HTMLInputElement>('input[name="primitive"]')) {
    checkbox.checked = wanted.has(Number(checkbox.value));
  }
}

/** Sets the columns/rows number inputs in `form` to `grid`. */
export function setGridSize(form: HTMLFormElement, grid: GridSize): void {
  (form.elements.namedItem("cols") as HTMLInputElement).value = String(grid.cols);
  (form.elements.namedItem("rows") as HTMLInputElement).value = String(grid.rows);
}

/**
 * Triggers `form`'s generate flow as if the user had submitted it —
 * honouring the current seed/grid/primitive-mix values and the blank-seed
 * auto-fill. Lets callers (see `main.ts`'s "Reuse primitives" button)
 * drive the form without duplicating `generateFromForm`.
 */
export function submitGeneratorForm(form: HTMLFormElement): void {
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

/**
 * Renders a single primitive (at rotation 0, uninverted) as a small SVG
 * preview icon, so the primitive-mix checkboxes can be recognized visually
 * instead of by name alone.
 */
function renderPrimitiveIcon(primitiveIndex: number): string {
  const previewId = encodeShapeId({
    cols: 1,
    rows: 1,
    cells: [{ type: primitiveIndex, rotation: 0, invert: false }],
  });
  return renderShape(previewId, { size: 28 });
}

/**
 * Generates a shape ID from `form`'s current seed/grid/primitive-mix
 * values and invokes `opts.onGenerate` with it. A blank seed field is
 * filled in with a fresh random seed first (and left visible in the
 * field), so generating never requires typing anything. No-op if no
 * primitive is selected.
 */
function generateFromForm(form: HTMLFormElement, opts: GeneratorFormOptions): void {
  const seedInput = form.elements.namedItem("seed") as HTMLInputElement;
  if (seedInput.value.trim().length === 0) {
    seedInput.value = randomSeed();
  }
  const seed = seedInput.value.trim();

  const grid = readGridSize(form);

  if (readTileable(form)) {
    // The constructive tileable solver picks placements by edge compatibility,
    // so the primitive-mix filter doesn't apply — it would break the seams.
    opts.onGenerate(generateTileableShapeId(seed, grid));
    return;
  }

  const allowedTypes = readSelectedPrimitiveTypes(form);
  if (allowedTypes.length === 0) {
    return;
  }
  const shapeId = generateFilteredShapeId(seed, grid, allowedTypes);
  opts.onGenerate(shapeId);
}

/**
 * Builds the seed/grid/primitive-mix generator form into `container`.
 * Submitting the form calls `generateFilteredShapeId` with the form's
 * current values and invokes `opts.onGenerate` with the resulting shape
 * ID — the caller (see `main.ts`) wires this to `updateUrlForShape` and
 * the live preview.
 */
export function buildGeneratorForm(
  container: HTMLElement,
  opts: GeneratorFormOptions,
): HTMLFormElement {
  const form = document.createElement("form");
  form.className = "generator-form";

  const seedLabel = document.createElement("label");
  seedLabel.textContent = "Seed";
  const seedRow = document.createElement("span");
  seedRow.className = "seed-row";
  const seedInput = document.createElement("input");
  seedInput.type = "text";
  seedInput.name = "seed";
  seedInput.placeholder = "optional — leave blank for a random one";
  seedRow.appendChild(seedInput);
  const randomizeButton = document.createElement("button");
  randomizeButton.type = "button";
  randomizeButton.className = "randomize-button";
  randomizeButton.textContent = "Randomize";
  randomizeButton.title = "Fill in a random seed and generate";
  seedRow.appendChild(randomizeButton);
  seedLabel.appendChild(seedRow);
  form.appendChild(seedLabel);

  const colsLabel = document.createElement("label");
  colsLabel.textContent = "Columns";
  const colsInput = document.createElement("input");
  colsInput.type = "number";
  colsInput.name = "cols";
  colsInput.min = "1";
  colsInput.max = "8";
  colsInput.value = String(DEFAULT_GRID.cols);
  colsInput.required = true;
  colsLabel.appendChild(colsInput);
  form.appendChild(colsLabel);

  const rowsLabel = document.createElement("label");
  rowsLabel.textContent = "Rows";
  const rowsInput = document.createElement("input");
  rowsInput.type = "number";
  rowsInput.name = "rows";
  rowsInput.min = "1";
  rowsInput.max = "8";
  rowsInput.value = String(DEFAULT_GRID.rows);
  rowsInput.required = true;
  rowsLabel.appendChild(rowsInput);
  form.appendChild(rowsLabel);

  const tileableLabel = document.createElement("label");
  tileableLabel.className = "tileable-toggle";
  const tileableInput = document.createElement("input");
  tileableInput.type = "checkbox";
  tileableInput.name = "tileable";
  tileableLabel.appendChild(tileableInput);
  tileableLabel.append("Seamless tile (edges wrap; ignores the primitive mix)");
  form.appendChild(tileableLabel);

  const mixFieldset = document.createElement("fieldset");
  mixFieldset.className = "primitive-mix";
  const legend = document.createElement("legend");
  legend.textContent = "Primitives";
  mixFieldset.appendChild(legend);
  for (const primitive of listPrimitives()) {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "primitive";
    checkbox.value = String(primitive.index);
    checkbox.checked = true;
    label.appendChild(checkbox);
    const icon = document.createElement("span");
    icon.className = "primitive-icon";
    icon.innerHTML = renderPrimitiveIcon(primitive.index);
    label.appendChild(icon);
    label.append(primitive.name);
    mixFieldset.appendChild(label);
  }
  form.appendChild(mixFieldset);

  tileableInput.addEventListener("change", () => {
    mixFieldset.disabled = tileableInput.checked;
  });

  const submit = document.createElement("button");
  submit.type = "submit";
  submit.textContent = "Generate";
  form.appendChild(submit);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    generateFromForm(form, opts);
  });

  randomizeButton.addEventListener("click", () => {
    seedInput.value = randomSeed();
    generateFromForm(form, opts);
  });

  container.appendChild(form);
  return form;
}
