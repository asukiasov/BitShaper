import type { PathSegment, PrimitivePathBuilder } from "./transform.js";

/**
 * The empty primitive: produces no path segments. Used for cells that
 * render nothing.
 */
export const empty: PrimitivePathBuilder = (): PathSegment[] => [];
