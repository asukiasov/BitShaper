import { type ShapeDef, ShapeIdError, decodeShapeId } from "bitshaper";

/** Query parameter name the current shape ID is read from and written to. */
export const SHAPE_ID_PARAM = "id";

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
