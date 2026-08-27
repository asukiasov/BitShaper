import {
  type CellDef,
  type Ramp,
  type ShapeDef,
  ShapeIdError,
  decodeShapeId,
  encodeShapeId,
} from "bitshaper";

/** Query parameter name the current shape ID is read from and written to. */
export const SHAPE_ID_PARAM = "id";

/**
 * Returns `shapeId` re-encoded with `ramp` swapped in, or — when `ramp` is
 * `undefined` — with any ramp modifier removed. If `shapeId` cannot be
 * decoded it is returned unchanged.
 */
export function applyRampToShapeId(shapeId: string, ramp: Ramp | undefined): string {
  let shape: ShapeDef;
  try {
    shape = decodeShapeId(shapeId);
  } catch {
    return shapeId;
  }
  const next: ShapeDef = ramp
    ? { ...shape, ramp }
    : { cols: shape.cols, rows: shape.rows, cells: shape.cells };
  return encodeShapeId(next);
}

/**
 * Returns `shapeId` re-encoded with the cell at `index` replaced by `cell`,
 * preserving any ramp modifier. Throws `RangeError` if `index` is out of
 * bounds for the decoded grid. Returns `shapeId` unchanged if it cannot be
 * decoded (mirrors {@link applyRampToShapeId}).
 */
export function replaceCell(shapeId: string, index: number, cell: CellDef): string {
  let shape: ShapeDef;
  try {
    shape = decodeShapeId(shapeId);
  } catch {
    return shapeId;
  }
  if (index < 0 || index >= shape.cells.length) {
    throw new RangeError(`cell index ${index} out of range (0..${shape.cells.length - 1})`);
  }
  const cells = shape.cells.map((c, i) => (i === index ? cell : c));
  return encodeShapeId(
    shape.ramp
      ? { cols: shape.cols, rows: shape.rows, cells, ramp: shape.ramp }
      : { cols: shape.cols, rows: shape.rows, cells },
  );
}

/** Result of attempting to read and decode a shape ID from the current URL. */
export type ShapeFromUrlResult =
  | { readonly kind: "empty" }
  | { readonly kind: "decoded"; readonly shapeId: string; readonly shape: ShapeDef }
  | { readonly kind: "error"; readonly shapeId: string; readonly message: string };

/** Reads the raw `?id=` value from the current URL, or `null` if absent. */
export function readShapeIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get(SHAPE_ID_PARAM);
}

/**
 * Reads the `?id=` query parameter from the current URL and decodes it.
 * Never throws: an absent parameter yields `{ kind: "empty" }`, a
 * present-but-invalid ID yields `{ kind: "error" }` with a message suitable
 * for display, and a valid ID yields `{ kind: "decoded" }` with its
 * {@link ShapeDef}.
 */
export function decodeShapeFromUrl(): ShapeFromUrlResult {
  const shapeId = readShapeIdFromUrl();
  if (shapeId === null) {
    return { kind: "empty" };
  }

  try {
    const shape = decodeShapeId(shapeId);
    return { kind: "decoded", shapeId, shape };
  } catch (error) {
    const message = error instanceof ShapeIdError ? error.message : "Failed to decode shape ID.";
    return { kind: "error", shapeId, message };
  }
}

/** Options accepted by {@link updateUrlForShape}. */
export interface UpdateUrlOptions {
  /** When `true`, pushes a new history entry via `pushState` instead of replacing the current one via `replaceState`. */
  readonly push?: boolean;
}

/**
 * Writes `shapeId` into the current URL's `?id=` query parameter. Uses
 * `history.replaceState` by default (no new browser-history entry); pass
 * `{ push: true }` to use `history.pushState` instead, for state changes
 * that should be reachable via back/forward navigation.
 */
export function updateUrlForShape(shapeId: string, opts?: UpdateUrlOptions): void {
  const url = new URL(window.location.href);
  url.searchParams.set(SHAPE_ID_PARAM, shapeId);

  if (opts?.push) {
    window.history.pushState(window.history.state, "", url);
  } else {
    window.history.replaceState(window.history.state, "", url);
  }
}
