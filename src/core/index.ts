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
export { rampParameterAt, resolveCellTransform } from "./ramp.js";
export type { CellRampTransform } from "./ramp.js";
export { listPrimitives } from "./registry.js";
export {
  edgeProfile,
  classifyEdgeProfile,
  edgesCompatible,
  isTileable,
  generateTileableShapeDef,
  generateTileableShapeId,
  listSelfTilingPlacements,
} from "./tiling.js";
export type { CellEdge, EdgeProfile, EdgeProfileKind } from "./tiling.js";
export type {
  CellDef,
  Ramp,
  RampAxis,
  RampCurve,
  RampParam,
  RampTrack,
  Rotation,
  ShapeDef,
} from "./types.js";
