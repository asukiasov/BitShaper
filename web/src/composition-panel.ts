import { type GridSize, type ShapeDef, listPrimitives } from "bitshaper";
import { randomSeed, summarizePrimitiveUsage } from "./generate.js";
import { renderPrimitiveIcon } from "./primitive-icon.js";

/** Grid size preselected in a freshly built panel. */
const DEFAULT_GRID: GridSize = { cols: 4, rows: 4 };

/** Options accepted by {@link buildCompositionPanel}. */
export interface CompositionPanelOptions {
  /**
   * Called when Randomize is clicked (after a blank seed field has been
   * auto-filled). The caller reads {@link CompositionPanelHandle.seedValue},
   * {@link CompositionPanelHandle.gridSize}, and
   * {@link CompositionPanelHandle.allowedTypes} to build the shape.
   */
  readonly onRandomize: () => void;
}

/** Handle returned by {@link buildCompositionPanel}. */
export interface CompositionPanelHandle {
  readonly element: HTMLElement;
  /** Pressed primitive toggles, as registry indices, ascending. */
  allowedTypes(): number[];
  /** The columns/rows currently entered. */
  gridSize(): GridSize;
  /** The trimmed seed field value. */
  seedValue(): string;
  /** Sets the seed field (Randomize auto-fills a blank one itself). */
  fillSeed(seed: string): void;
  /** Points the columns/rows inputs at `shape`'s grid. */
  syncGrid(shape: ShapeDef): void;
  /** Badges + highlights the toggles `shape` uses; clears the rest. Never presses a toggle. */
  showUsage(shape: ShapeDef): void;
  /** Removes every usage badge/highlight. */
  clearUsage(): void;
}

function buildNumberField(
  name: "cols" | "rows",
  label: string,
): {
  readonly label: HTMLLabelElement;
  readonly input: HTMLInputElement;
} {
  const el = document.createElement("label");
  el.textContent = label;
  const input = document.createElement("input");
  input.type = "number";
  input.name = name;
  input.min = "1";
  input.max = "8";
  input.required = true;
  input.value = String(DEFAULT_GRID[name]);
  el.appendChild(input);
  return { label: el, input };
}

/**
 * Builds the always-visible Composition panel: columns/rows, seed, Randomize,
 * and a toggle per registered primitive. The toggles are a persistent
 * allow-list for the next Randomize — loading a shape only updates their
 * "used ×N" badges, never their pressed state.
 */
export function buildCompositionPanel(
  container: HTMLElement,
  opts: CompositionPanelOptions,
): CompositionPanelHandle {
  const panel = document.createElement("div");
  panel.className = "composition-panel";

  const controls = document.createElement("div");
  controls.className = "composition-controls";
  panel.appendChild(controls);

  const cols = buildNumberField("cols", "Columns");
  const rows = buildNumberField("rows", "Rows");
  controls.appendChild(cols.label);
  controls.appendChild(rows.label);

  const seedLabel = document.createElement("label");
  seedLabel.textContent = "Seed";
  const seedRow = document.createElement("span");
  seedRow.className = "seed-row";
  const seedInput = document.createElement("input");
  seedInput.type = "text";
  seedInput.name = "seed";
  seedInput.placeholder = "optional";
  seedRow.appendChild(seedInput);
  const copySeedButton = document.createElement("button");
  copySeedButton.type = "button";
  copySeedButton.className = "copy-seed-button";
  copySeedButton.textContent = "Copy";
  copySeedButton.title = "Copy this seed";
  seedRow.appendChild(copySeedButton);
  seedLabel.appendChild(seedRow);
  controls.appendChild(seedLabel);

  const randomizeButton = document.createElement("button");
  randomizeButton.type = "button";
  randomizeButton.className = "randomize-button";
  randomizeButton.textContent = "Randomize";
  controls.appendChild(randomizeButton);

  const seedHint = document.createElement("p");
  seedHint.className = "section-hint seed-hint";
  seedHint.textContent =
    "Randomize rolls a fresh seed each time. Type a seed and press Enter to re-run it. " +
    "To share an exact shape, copy its ID or URL instead.";
  panel.appendChild(seedHint);

  const primitives = document.createElement("div");
  primitives.className = "composition-primitives";
  panel.appendChild(primitives);

  const toggles = new Map<number, { button: HTMLButtonElement; badge: HTMLElement }>();
  for (const primitive of listPrimitives()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "primitive-toggle";
    button.setAttribute("role", "switch");
    button.setAttribute("aria-pressed", "true");
    button.dataset.type = String(primitive.index);

    const icon = document.createElement("span");
    icon.className = "primitive-icon";
    icon.innerHTML = renderPrimitiveIcon(primitive.index);
    button.appendChild(icon);

    const name = document.createElement("span");
    name.className = "primitive-toggle-name";
    name.textContent = primitive.name;
    button.appendChild(name);

    const badge = document.createElement("span");
    badge.className = "primitive-toggle-badge";
    button.appendChild(badge);

    button.addEventListener("click", () => {
      const pressed = button.getAttribute("aria-pressed") === "true";
      button.setAttribute("aria-pressed", String(!pressed));
    });

    primitives.appendChild(button);
    toggles.set(primitive.index, { button, badge });
  }

  copySeedButton.addEventListener("click", () => {
    const value = seedInput.value.trim();
    if (value.length === 0) {
      return;
    }
    void navigator.clipboard?.writeText(value).then(
      () => {
        copySeedButton.textContent = "Copied!";
        setTimeout(() => {
          copySeedButton.textContent = "Copy";
        }, 1200);
      },
      () => {},
    );
  });

  // Randomize always rolls a fresh seed, so repeated clicks keep producing new
  // shapes. To re-run a specific seed, type it and press Enter in the field.
  randomizeButton.addEventListener("click", () => {
    seedInput.value = randomSeed();
    opts.onRandomize();
  });

  seedInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    if (seedInput.value.trim().length === 0) {
      seedInput.value = randomSeed();
    }
    opts.onRandomize();
  });

  container.appendChild(panel);

  return {
    element: panel,
    allowedTypes() {
      return [...toggles.entries()]
        .filter(([, t]) => t.button.getAttribute("aria-pressed") === "true")
        .map(([index]) => index)
        .sort((a, b) => a - b);
    },
    gridSize() {
      return { cols: Number(cols.input.value), rows: Number(rows.input.value) };
    },
    seedValue() {
      return seedInput.value.trim();
    },
    fillSeed(seed: string) {
      seedInput.value = seed;
    },
    syncGrid(shape: ShapeDef) {
      cols.input.value = String(shape.cols);
      rows.input.value = String(shape.rows);
    },
    showUsage(shape: ShapeDef) {
      const counts = new Map(summarizePrimitiveUsage(shape).map((u) => [u.index, u.count]));
      for (const [index, { button, badge }] of toggles) {
        const count = counts.get(index);
        badge.textContent = count ? `×${count}` : "";
        if (count) {
          button.dataset.used = "true";
        } else {
          delete button.dataset.used;
        }
      }
    },
    clearUsage() {
      for (const { button, badge } of toggles.values()) {
        badge.textContent = "";
        delete button.dataset.used;
      }
    },
  };
}
