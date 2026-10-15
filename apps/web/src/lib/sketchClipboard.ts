import { addLineIntersectionPoints } from "@/lib/sketchPointRefinement";
import type { SketchImage, SketchPoint, SketchProfile, SketchSegment } from "@/types/layerling";

/*
 * Copy, paste and duplicate inside a sketch. The clipboard holds plain sketch
 * geometry, not workplane shapes, so it stays apart from the 3D clipboard and
 * survives from one sketch to the next within the session.
 */

export type SketchClipboard = { points: SketchPoint[]; segments: SketchSegment[]; images: SketchImage[] };

export type SketchClipboardSelection =
  | { kind: "point" | "segment" | "image"; id: string }
  | { kind: "multiple"; pointIds: readonly string[]; segmentIds: readonly string[]; imageIds?: readonly string[] }
  | null;

/** Space left between a pasted copy and its source; also the step offsets are rounded to, so a copy stays on the grid. */
export const SKETCH_PASTE_GAP = 10;

/** How close a pasted outline may come to an existing one before it counts as touching. */
const PASTE_CLEARANCE = 1;
/** How many steps out the search for a free spot goes before giving up. */
const PASTE_SEARCH_RINGS = 12;
const CURVE_SAMPLES = 16;

type IdFactory = (prefix: string) => string;
type Vec = { x: number; z: number };
type Edge = { from: Vec; to: Vec; minX: number; maxX: number; minZ: number; maxZ: number };
type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };

/**
 * The selected geometry as a self-contained piece: a selected line brings its
 * end points along, and a line is only taken when both of its ends are.
 */
export function copySketchSelection(profile: SketchProfile, selection: SketchClipboardSelection): SketchClipboard | null {
  if (!selection) return null;
  const selectedPointIds = selection.kind === "point" ? [selection.id] : selection.kind === "multiple" ? selection.pointIds : [];
  const selectedSegmentIds = new Set(selection.kind === "segment" ? [selection.id] : selection.kind === "multiple" ? selection.segmentIds : []);
  const selectedImageIds = new Set(selection.kind === "image" ? [selection.id] : selection.kind === "multiple" ? selection.imageIds ?? [] : []);

  const pointIds = new Set(selectedPointIds);
  profile.segments.forEach((segment) => {
    if (!selectedSegmentIds.has(segment.id)) return;
    pointIds.add(segment.startId);
    pointIds.add(segment.endId);
  });
  const points = profile.points.filter((point) => pointIds.has(point.id));
  const copiedPointIds = new Set(points.map((point) => point.id));
  const segments = profile.segments.filter((segment) => copiedPointIds.has(segment.startId) && copiedPointIds.has(segment.endId));
  const images = (profile.images ?? []).filter((image) => selectedImageIds.has(image.id));
  if (points.length === 0 && images.length === 0) return null;
  return structuredClone({ points, segments, images });
}

/**
 * Adds a fresh copy of the clipboard to the profile, moved by the offset.
 * Returns the new profile and the ids of what was added, to select them.
 * Copied images come unlocked: a locked copy could not be moved off the original.
 *
 * Lines that cross get split here already, as every sketch commit does, so the
 * selection covers each piece of the pasted lines: the split keeps a line's
 * pieces in its place in the list, and the pasted lines come last.
 */
export function pasteSketchClipboard(
  profile: SketchProfile,
  clipboard: SketchClipboard,
  offset: { x: number; z: number },
  createId: IdFactory,
) {
  const shift = (value: { x: number; z: number }) => ({ x: value.x + offset.x, z: value.z + offset.z });
  const pointIdMap = new Map(clipboard.points.map((point) => [point.id, createId("sketch-point")]));
  const points = clipboard.points.map((point) => ({
    ...point,
    ...shift(point),
    id: pointIdMap.get(point.id)!,
    handleIn: point.handleIn ? shift(point.handleIn) : undefined,
    handleOut: point.handleOut ? shift(point.handleOut) : undefined,
  }));
  const segments = clipboard.segments.flatMap((segment) => {
    const startId = pointIdMap.get(segment.startId);
    const endId = pointIdMap.get(segment.endId);
    return startId && endId ? [{ ...segment, id: createId("sketch-segment"), startId, endId }] : [];
  });
  const images = clipboard.images.map((image) => ({ ...image, ...shift(image), id: createId("sketch-image"), locked: false }));
  const next = addLineIntersectionPoints({
    ...profile,
    points: [...profile.points, ...points],
    segments: [...profile.segments, ...segments],
    images: [...(profile.images ?? []), ...images],
  }, createId);
  // Crossing points all lie on a pasted line, so they belong to the selection.
  const existingPointIds = new Set(profile.points.map((point) => point.id));
  const firstPasted = segments.length ? next.segments.findIndex((segment) => segment.id === segments[0].id) : -1;
  return {
    profile: next,
    pointIds: next.points.filter((point) => !existingPointIds.has(point.id)).map((point) => point.id),
    segmentIds: firstPasted < 0 ? [] : next.segments.slice(firstPasted).map((segment) => segment.id),
    imageIds: images.map((image) => image.id),
  };
}

function cubicAt(start: Vec, first: Vec, second: Vec, end: Vec, amount: number): Vec {
  const inverse = 1 - amount;
  return {
    x: inverse ** 3 * start.x + 3 * inverse ** 2 * amount * first.x + 3 * inverse * amount ** 2 * second.x + amount ** 3 * end.x,
    z: inverse ** 3 * start.z + 3 * inverse ** 2 * amount * first.z + 3 * inverse * amount ** 2 * second.z + amount ** 3 * end.z,
  };
}

function edge(from: Vec, to: Vec): Edge {
  return { from, to, minX: Math.min(from.x, to.x), maxX: Math.max(from.x, to.x), minZ: Math.min(from.z, to.z), maxZ: Math.max(from.z, to.z) };
}

/** The outline as straight pieces, curves flattened; a lone point is a piece of no length. */
function outlineEdges(points: SketchPoint[], segments: SketchSegment[]) {
  const pointById = new Map(points.map((point) => [point.id, point]));
  const edges: Edge[] = [];
  const connected = new Set<string>();
  segments.forEach((segment) => {
    const start = pointById.get(segment.startId);
    const end = pointById.get(segment.endId);
    if (!start || !end) return;
    connected.add(start.id);
    connected.add(end.id);
    if (segment.kind === "line" || !start.handleOut || !end.handleIn) {
      edges.push(edge(start, end));
      return;
    }
    let previous: Vec = start;
    for (let index = 1; index <= CURVE_SAMPLES; index += 1) {
      const next = cubicAt(start, start.handleOut, end.handleIn, end, index / CURVE_SAMPLES);
      edges.push(edge(previous, next));
      previous = next;
    }
  });
  points.forEach((point) => {
    if (!connected.has(point.id)) edges.push(edge(point, point));
  });
  return edges;
}

function pointSegmentDistance(point: Vec, from: Vec, to: Vec) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const lengthSquared = dx * dx + dz * dz;
  const amount = lengthSquared > 0 ? Math.min(1, Math.max(0, ((point.x - from.x) * dx + (point.z - from.z) * dz) / lengthSquared)) : 0;
  return Math.hypot(point.x - (from.x + amount * dx), point.z - (from.z + amount * dz));
}

function edgesCross(a: Edge, b: Edge) {
  const side = (origin: Vec, to: Vec, point: Vec) => (to.x - origin.x) * (point.z - origin.z) - (to.z - origin.z) * (point.x - origin.x);
  const first = side(b.from, b.to, a.from);
  const second = side(b.from, b.to, a.to);
  const third = side(a.from, a.to, b.from);
  const fourth = side(a.from, a.to, b.to);
  return ((first > 0 && second < 0) || (first < 0 && second > 0)) && ((third > 0 && fourth < 0) || (third < 0 && fourth > 0));
}

function edgesTouch(a: Edge, b: Edge, clearance: number) {
  if (a.maxX + clearance < b.minX || b.maxX + clearance < a.minX || a.maxZ + clearance < b.minZ || b.maxZ + clearance < a.minZ) return false;
  if (edgesCross(a, b)) return true;
  return Math.min(
    pointSegmentDistance(a.from, b.from, b.to),
    pointSegmentDistance(a.to, b.from, b.to),
    pointSegmentDistance(b.from, a.from, a.to),
    pointSegmentDistance(b.to, a.from, a.to),
  ) < clearance;
}

function edgeBounds(edges: Edge[]): Bounds | null {
  if (!edges.length) return null;
  return {
    minX: Math.min(...edges.map((entry) => entry.minX)),
    maxX: Math.max(...edges.map((entry) => entry.maxX)),
    minZ: Math.min(...edges.map((entry) => entry.minZ)),
    maxZ: Math.max(...edges.map((entry) => entry.maxZ)),
  };
}

/**
 * Where a paste or duplicate goes. Every sketch commit splits straight lines
 * where they cross and joins them there, so a copy that lands on existing
 * lines would be welded to them and hard to pull apart again. The copy is
 * therefore moved by whole multiples of its own size plus a gap - right, then
 * below, then diagonally, then the other ways round, one ring further out each
 * time - to the first spot where no line of it comes near an existing one and
 * it stays on the sketch plate. Images are only kept clear of the source, as
 * they never join anything. With no free spot, the copy goes right of its source.
 */
export function freeSketchPasteOffset(profile: SketchProfile, clipboard: SketchClipboard, plate?: Bounds, gap = SKETCH_PASTE_GAP): Vec {
  const pastedEdges = outlineEdges(clipboard.points, clipboard.segments);
  const imageEdges = clipboard.images.flatMap((image) => [
    edge({ x: image.x - image.width / 2, z: image.z - image.depth / 2 }, { x: image.x + image.width / 2, z: image.z + image.depth / 2 }),
  ]);
  const extent = edgeBounds([...pastedEdges, ...imageEdges]);
  if (!extent) return { x: gap, z: gap };
  const roundUp = (value: number) => Math.max(gap, Math.ceil((value - 1e-9) / gap) * gap);
  const stepX = roundUp(extent.maxX - extent.minX + gap);
  const stepZ = roundUp(extent.maxZ - extent.minZ + gap);
  const existingEdges = outlineEdges(profile.points, profile.segments);

  const fits = (offset: Vec) => {
    if (plate && (
      extent.minX + offset.x < plate.minX || extent.maxX + offset.x > plate.maxX ||
      extent.minZ + offset.z < plate.minZ || extent.maxZ + offset.z > plate.maxZ
    )) return false;
    const moved = pastedEdges.map((entry) => edge(
      { x: entry.from.x + offset.x, z: entry.from.z + offset.z },
      { x: entry.to.x + offset.x, z: entry.to.z + offset.z },
    ));
    const movedBounds = edgeBounds(moved);
    if (!movedBounds) return true;
    const nearby = existingEdges.filter((entry) =>
      entry.maxX + PASTE_CLEARANCE >= movedBounds.minX && entry.minX - PASTE_CLEARANCE <= movedBounds.maxX &&
      entry.maxZ + PASTE_CLEARANCE >= movedBounds.minZ && entry.minZ - PASTE_CLEARANCE <= movedBounds.maxZ);
    return !moved.some((pasted) => nearby.some((existing) => edgesTouch(pasted, existing, PASTE_CLEARANCE)));
  };

  for (let ring = 1; ring <= PASTE_SEARCH_RINGS; ring += 1) {
    const x = ring * stepX;
    const z = ring * stepZ;
    const candidates = [{ x, z: 0 }, { x: 0, z }, { x, z }, { x: -x, z: 0 }, { x: 0, z: -z }, { x: -x, z }, { x, z: -z }, { x: -x, z: -z }];
    const free = candidates.find(fits);
    if (free) return free;
  }
  return { x: stepX, z: 0 };
}
