import { encodeShapeId } from "./id.js";
import type { PathSegment } from "./primitives/transform.js";
import { createRandom, hashStringToSeed } from "./random.js";
import { PRIMITIVE_REGISTRY, getPrimitiveByIndex } from "./registry.js";
import type { CellDef, ShapeDef } from "./types.js";

/**
 * Number of sample slots each cell edge is quantized into when computing an
 * {@link EdgeProfile}. Eighths — fine enough to separate the corner-anchored
 * half/quarter geometry the primitives actually produce, coarse enough that
 * two visually-continuous edges compare equal.
 */
const EDGE_SLOTS = 8;

/** Line samples per arc segment when flattening primitive geometry for fill tests. */
const ARC_SAMPLES = 48;

/** One cell edge, named by compass direction in the cell's local (unrotated) frame. */
export type CellEdge = "north" | "east" | "south" | "west";

/**
 * A cell edge's fill signature: {@link EDGE_SLOTS} booleans, one per equal
 * sub-interval of the edge (index 0 = the low-coordinate end), `true` where
 * the primitive's filled region covers that sub-interval. Two edges that meet
 * at a grid seam tile cleanly (coverage match, "C1") when their profiles are
 * element-wise equal — no coordinate reversal is needed because a `p1`
 * (translation-only) layout places every cell in the same orientation.
 */
export type EdgeProfile = readonly boolean[];

/** A coarse human-readable label for an {@link EdgeProfile}, for tests and debugging. */
export type EdgeProfileKind = "EMPTY" | "FULL" | "HALF@0" | "HALF@1" | "MID" | "OTHER";

interface Point {
  readonly x: number;
  readonly y: number;
}

/** Flattens one primitive path (M/L/A/Z, single closed subpath) to a polygon ring. */
function flattenToRing(segments: readonly PathSegment[]): Point[] {
  const ring: Point[] = [];
  let current: Point = { x: 0, y: 0 };
  for (const segment of segments) {
    switch (segment.command) {
      case "M":
      case "L":
        current = { x: segment.x, y: segment.y };
        ring.push(current);
        break;
      case "A": {
        const end = { x: segment.x, y: segment.y };
        for (const p of sampleCircularArc(current, end, segment)) {
          ring.push(p);
        }
        current = end;
        break;
      }
      case "Z":
        break;
    }
  }
  return ring;
}

/**
 * Samples a circular SVG arc (the primitives only ever emit `rx === ry`,
 * `xAxisRotation === 0`) from just after its start point through its end
 * point, using the endpoint -> center parameterization.
 */
function sampleCircularArc(
  start: Point,
  end: Point,
  arc: Extract<PathSegment, { command: "A" }>,
): Point[] {
  const r = Math.max(arc.rx, Math.hypot(end.x - start.x, end.y - start.y) / 2);
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const half = Math.hypot(end.x - start.x, end.y - start.y) / 2;
  const h = Math.sqrt(Math.max(0, r * r - half * half));
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dy / len;
  const ny = -dx / len;
  const sign = arc.largeArcFlag === arc.sweepFlag ? 1 : -1;
  const cx = mid.x + sign * h * nx;
  const cy = mid.y + sign * h * ny;

  const a0 = Math.atan2(start.y - cy, start.x - cx);
  let a1 = Math.atan2(end.y - cy, end.x - cx);
  if (arc.sweepFlag === 1 && a1 < a0) a1 += Math.PI * 2;
  if (arc.sweepFlag === 0 && a1 > a0) a1 -= Math.PI * 2;

  const points: Point[] = [];
  for (let i = 1; i <= ARC_SAMPLES; i++) {
    const a = a0 + ((a1 - a0) * i) / ARC_SAMPLES;
    points.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return points;
}

/** Even-odd ray cast: is `p` inside the polygon `ring`? */
function pointInRing(p: Point, ring: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i] as Point;
    const b = ring[j] as Point;
    const straddles = a.y > p.y !== b.y > p.y;
    if (straddles && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Computes the {@link EdgeProfile} of the primitive at registry index
 * `typeIndex`, drawn at `rotation` (degrees clockwise) and `invert`, along the
 * given `edge`. Derived purely from the primitive's emitted geometry — no
 * hand-authored edge data.
 */
export function edgeProfile(
  typeIndex: number,
  rotation: CellDef["rotation"],
  invert: boolean,
  edge: CellEdge,
): EdgeProfile {
  const primitive = getPrimitiveByIndex(typeIndex);
  if (!primitive) return new Array(EDGE_SLOTS).fill(false);
  const cellSize = 1;
  const ring = flattenToRing(primitive.build(cellSize, rotation, invert));
  if (ring.length < 3) return new Array(EDGE_SLOTS).fill(false);

  const inset = cellSize * 1e-3;
  const slots: boolean[] = [];
  for (let k = 0; k < EDGE_SLOTS; k++) {
    const t = ((k + 0.5) / EDGE_SLOTS) * cellSize;
    let probe: Point;
    switch (edge) {
      case "north":
        probe = { x: t, y: inset };
        break;
      case "south":
        probe = { x: t, y: cellSize - inset };
        break;
      case "west":
        probe = { x: inset, y: t };
        break;
      case "east":
        probe = { x: cellSize - inset, y: t };
        break;
    }
    slots.push(pointInRing(probe, ring));
  }
  return slots;
}

/** Labels an {@link EdgeProfile} with a coarse {@link EdgeProfileKind}. */
export function classifyEdgeProfile(profile: EdgeProfile): EdgeProfileKind {
  const half = EDGE_SLOTS / 2;
  const quarter = EDGE_SLOTS / 4;
  const all = (from: number, to: number, value: boolean) =>
    profile.slice(from, to).every((slot) => slot === value);
  if (all(0, EDGE_SLOTS, true)) return "FULL";
  if (all(0, EDGE_SLOTS, false)) return "EMPTY";
  if (all(0, half, true) && all(half, EDGE_SLOTS, false)) return "HALF@0";
  if (all(0, half, false) && all(half, EDGE_SLOTS, true)) return "HALF@1";
  if (
    all(0, quarter, false) &&
    all(quarter, EDGE_SLOTS - quarter, true) &&
    all(EDGE_SLOTS - quarter, EDGE_SLOTS, false)
  ) {
    return "MID";
  }
  return "OTHER";
}

/** Do two edge profiles meeting at a grid seam tile cleanly (C1 coverage match)? */
export function edgesCompatible(a: EdgeProfile, b: EdgeProfile): boolean {
  return a.length === b.length && a.every((slot, i) => slot === b[i]);
}

function cellAt(shape: ShapeDef, col: number, row: number): CellDef {
  return shape.cells[row * shape.cols + col] as CellDef;
}

function profileOf(shape: ShapeDef, col: number, row: number, edge: CellEdge): EdgeProfile {
  const cell = cellAt(shape, col, row);
  return edgeProfile(cell.type, cell.rotation, cell.invert, edge);
}

/**
 * Returns `true` when `shape` tiles the plane seamlessly by pure translation
 * of the whole grid (wallpaper group `p1`): every interior seam and both wrap
 * seams (last column's east edge vs first column's west edge; last row's
 * south edge vs first row's north edge) are coverage-compatible.
 *
 * A ramped shape is never tileable — the per-cell transform breaks edge
 * continuity — so any `shape.ramp` makes this return `false`.
 */
export function isTileable(shape: ShapeDef): boolean {
  if (shape.ramp) return false;
  const { cols, rows } = shape;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const eastCol = (col + 1) % cols;
      if (
        !edgesCompatible(profileOf(shape, col, row, "east"), profileOf(shape, eastCol, row, "west"))
      ) {
        return false;
      }
      const southRow = (row + 1) % rows;
      if (
        !edgesCompatible(
          profileOf(shape, col, row, "south"),
          profileOf(shape, col, southRow, "north"),
        )
      ) {
        return false;
      }
    }
  }
  return true;
}

const ROTATIONS = [0, 90, 180, 270] as const;

/**
 * A `(type, rotation, invert)` placement is *self-tiling* when its own
 * opposite edges match: north == south and east == west. A grid filled with
 * any mix of self-tiling placements that all share one common edge profile
 * tiles under `p1`; a grid filled uniformly with a single self-tiling
 * placement always does.
 */
function selfTilingPlacements(): CellDef[] {
  const out: CellDef[] = [];
  for (let t = 0; t < PRIMITIVE_REGISTRY.length; t++) {
    for (const rotation of ROTATIONS) {
      for (const invert of [false, true]) {
        const n = edgeProfile(t, rotation, invert, "north");
        const s = edgeProfile(t, rotation, invert, "south");
        const e = edgeProfile(t, rotation, invert, "east");
        const w = edgeProfile(t, rotation, invert, "west");
        if (edgesCompatible(n, s) && edgesCompatible(e, w)) {
          out.push({ type: t, rotation, invert });
        }
      }
    }
  }
  return out;
}

/** Every `(type, rotation, invert)` placement with its four edge profiles, computed once. */
interface Placement {
  readonly cell: CellDef;
  readonly north: EdgeProfile;
  readonly east: EdgeProfile;
  readonly south: EdgeProfile;
  readonly west: EdgeProfile;
}

let placementCache: Placement[] | undefined;

function allPlacements(): Placement[] {
  if (placementCache) return placementCache;
  const out: Placement[] = [];
  for (let t = 0; t < PRIMITIVE_REGISTRY.length; t++) {
    for (const rotation of ROTATIONS) {
      for (const invert of [false, true]) {
        out.push({
          cell: { type: t, rotation, invert },
          north: edgeProfile(t, rotation, invert, "north"),
          east: edgeProfile(t, rotation, invert, "east"),
          south: edgeProfile(t, rotation, invert, "south"),
          west: edgeProfile(t, rotation, invert, "west"),
        });
      }
    }
  }
  placementCache = out;
  return out;
}

/** Fisher–Yates shuffle in place, driven by a seeded PRNG. */
function shuffle<T>(items: T[], random: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j] as T, items[i] as T];
  }
  return items;
}

/** Upper bound on backtracking node expansions before falling back to a uniform grid. */
const MAX_CONSTRUCTIVE_NODES = 200_000;

/**
 * Deterministically generates a {@link ShapeDef} whose shape {@link isTileable},
 * as a `p1` wallpaper unit.
 *
 * Strategy: constructive backtracking. Cells are placed row-major; each cell's
 * candidates are the placements whose west edge matches the left neighbour's
 * east and whose north matches the upper neighbour's south — plus, on the last
 * column, an east match against column 0's west, and on the last row, a south
 * match against row 0's north (the wrap seams). Candidates are tried in a
 * seeded-shuffled order with backtracking. If the search exhausts its node
 * budget (only realistic on tiny grids with hostile constraints), it falls
 * back to a uniform grid of one seeded self-tiling placement, which always
 * succeeds.
 */
export function generateTileableShapeDef(
  seed: string | number,
  grid?: { readonly cols: number; readonly rows: number },
): ShapeDef {
  const { cols, rows } = grid ?? { cols: 4, rows: 4 };
  const random = createRandom(typeof seed === "string" ? hashStringToSeed(seed) : seed >>> 0);
  const placements = allPlacements();
  const total = cols * rows;
  const chosen: (Placement | undefined)[] = new Array(total).fill(undefined);
  let nodes = 0;

  const place = (index: number): boolean => {
    if (index === total) return true;
    if (++nodes > MAX_CONSTRUCTIVE_NODES) return false;

    const col = index % cols;
    const row = Math.floor(index / cols);
    const left = col > 0 ? (chosen[index - 1] as Placement) : undefined;
    const up = row > 0 ? (chosen[index - cols] as Placement) : undefined;
    const rowStartWest = col === cols - 1 ? (chosen[row * cols] as Placement).west : undefined;
    const colTopNorth = row === rows - 1 ? (chosen[col] as Placement).north : undefined;

    for (const candidate of shuffle([...placements], random)) {
      if (left && !edgesCompatible(candidate.west, left.east)) continue;
      if (up && !edgesCompatible(candidate.north, up.south)) continue;
      if (rowStartWest && !edgesCompatible(candidate.east, rowStartWest)) continue;
      if (colTopNorth && !edgesCompatible(candidate.south, colTopNorth)) continue;
      chosen[index] = candidate;
      if (place(index + 1)) return true;
      chosen[index] = undefined;
    }
    return false;
  };

  if (place(0)) {
    return { cols, rows, cells: chosen.map((p) => (p as Placement).cell) };
  }

  // Fallback: uniform self-tiling grid.
  const safe = selfTilingPlacements();
  const cell = safe[Math.floor(random() * safe.length)] as CellDef;
  return { cols, rows, cells: Array.from({ length: total }, () => cell) };
}

/**
 * Deterministically generates a shape ID whose shape {@link isTileable}.
 * Thin wrapper over {@link generateTileableShapeDef}.
 */
export function generateTileableShapeId(
  seed: string | number,
  grid?: { readonly cols: number; readonly rows: number },
): string {
  return encodeShapeId(generateTileableShapeDef(seed, grid));
}

/** Registry size — exported so callers can reason about the generation space. */
export const PRIMITIVE_COUNT = PRIMITIVE_REGISTRY.length;

/**
 * The distinct self-tiling placements available to {@link generateTileableShapeId},
 * as `{type, rotation, invert}`. Exposed for a UI that wants to show the
 * tileable-primitive palette.
 */
export function listSelfTilingPlacements(): readonly CellDef[] {
  return selfTilingPlacements();
}
