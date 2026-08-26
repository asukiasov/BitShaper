/**
 * Public API surface of the `bitshaper` core package: encode/decode shape
 * IDs, render a shape ID to SVG, and generate shapes deterministically from
 * a seed.
 */
export { encodeShapeId, decodeShapeId, ShapeIdError } from "./id.js";
export { renderShape, RenderError } from "./render.js";
export type { RenderShapeOptions } from "./render.js";
export { generateShapeDef, generateShapeId } from "./generate.js";
export type { GridSize } from "./generate.js";
export { listPrimitives } from "./registry.js";
export type { CellDef, Rotation, ShapeDef } from "./types.js";
