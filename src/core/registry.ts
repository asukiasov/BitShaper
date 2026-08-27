import {
  arcBand,
  bulge,
  cap,
  circle,
  diagonalBand,
  empty,
  fill,
  fillet,
  leaf,
  ogee,
  pinwheelArc,
  roundCorner,
  step,
  wedge,
} from "./primitives/index.js";
import type { PrimitivePathBuilder } from "./primitives/transform.js";

/**
 * One entry in the primitive registry: a primitive's stable type name
 * paired with its path-builder function.
 */
export interface PrimitiveDefinition {
  readonly name: string;
  readonly build: PrimitivePathBuilder;
}

/**
 * The append-only primitive registry. A primitive's array index IS its
 * permanent numeric `CellDef.type` value, baked into every shape ID ever
 * issued referencing it (`type * 8 + rotation * 2 + invert`, per the
 * shape-id-codec spec). New primitives MUST be pushed to the end of this
 * array — never reorder or remove existing entries, or every previously
 * issued ID whose cells reference a later index will decode to the wrong
 * primitive. A pinned-index test (test/core/registry.test.ts) guards this.
 */
export const PRIMITIVE_REGISTRY: readonly PrimitiveDefinition[] = [
  { name: "empty", build: empty },
  { name: "fill", build: fill },
  { name: "fillet", build: fillet },
  { name: "bulge", build: bulge },
  { name: "circle", build: circle },
  { name: "wedge", build: wedge },
  { name: "cap", build: cap },
  { name: "pinwheel-arc", build: pinwheelArc },
  { name: "step", build: step },
  { name: "ogee", build: ogee },
  { name: "round-corner", build: roundCorner },
  { name: "arc-band", build: arcBand },
  { name: "diagonal-band", build: diagonalBand },
  { name: "leaf", build: leaf },
];

/** Looks up a primitive's definition by its registry index (`CellDef.type`). */
export function getPrimitiveByIndex(index: number): PrimitiveDefinition | undefined {
  return PRIMITIVE_REGISTRY[index];
}

/** Looks up a primitive's registry index by its stable type name, or -1 if unknown. */
export function getPrimitiveIndexByName(name: string): number {
  return PRIMITIVE_REGISTRY.findIndex((primitive) => primitive.name === name);
}

/**
 * Lists every registered primitive's stable name paired with its registry
 * index, in registration order. Consumers (e.g. a UI listing eligible
 * primitives) should use this instead of hardcoding names, so new
 * primitives appended to the registry appear automatically.
 */
export function listPrimitives(): ReadonlyArray<{ readonly name: string; readonly index: number }> {
  return PRIMITIVE_REGISTRY.map((primitive, index) => ({ name: primitive.name, index }));
}
