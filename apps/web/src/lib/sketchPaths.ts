import { isConstructionSegment } from "@/lib/sketchConstruction";
import { nestOutlines } from "@/lib/sketchContainment";
import type { SketchPoint, SketchProfile, SketchSegment } from "@/types/layerling";

export type PathStep = { segment: SketchSegment; from: SketchPoint; to: SketchPoint };
export type DisplayPath = { id: string; points: SketchPoint[]; steps: PathStep[]; closed: boolean };
export type PlaneEdge = { from: { x: number; z: number }; to: { x: number; z: number } };

export function orderedPaths(profile: SketchProfile): DisplayPath[] {
  const pointById = new Map(profile.points.map((point) => [point.id, point]));
  const adjacency = new Map<string, Array<{ pointId: string; segment: SketchSegment }>>();
  profile.points.forEach((point) => adjacency.set(point.id, []));
  const valid = profile.segments.filter((segment) => {
    if (isConstructionSegment(segment) || !pointById.has(segment.startId) || !pointById.has(segment.endId)) return false;
    adjacency.get(segment.startId)?.push({ pointId: segment.endId, segment });
    adjacency.get(segment.endId)?.push({ pointId: segment.startId, segment });
    return true;
  });
  const unvisited = new Set(valid.map((segment) => segment.id));
  const paths: DisplayPath[] = [];
  while (unvisited.size > 0) {
    const seedId = unvisited.values().next().value as string;
    const seed = valid.find((segment) => segment.id === seedId);
    if (!seed) break;
    const component = new Set<string>();
    const queue = [seed.startId, seed.endId];
    while (queue.length) {
      const id = queue.pop();
      if (!id || component.has(id)) continue;
      component.add(id);
      adjacency.get(id)?.forEach((edge) => queue.push(edge.pointId));
    }
    const startId = [...component].find((id) => (adjacency.get(id)?.filter((edge) => unvisited.has(edge.segment.id)).length ?? 0) === 1) ?? seed.startId;
    const first = pointById.get(startId);
    if (!first) break;
    const points = [first];
    const steps: PathStep[] = [];
    let currentId = startId;
    for (let guard = 0; guard <= valid.length; guard += 1) {
      const edge = adjacency.get(currentId)?.find((candidate) => unvisited.has(candidate.segment.id));
      if (!edge) break;
      const from = pointById.get(currentId);
      const to = pointById.get(edge.pointId);
      if (!from || !to) break;
      unvisited.delete(edge.segment.id);
      steps.push({ segment: edge.segment, from, to });
      currentId = to.id;
      if (currentId === startId) break;
      points.push(to);
    }
    paths.push({ id: seed.id, points, steps, closed: currentId === startId && steps.length >= 3 });
  }
  return paths;
}

export function curveControls(step: PathStep) {
  const forward = step.segment.startId === step.from.id;
  return {
    first: forward ? step.from.handleOut : step.from.handleIn,
    second: forward ? step.to.handleIn : step.to.handleOut,
  };
}

export function cubicPoint(start: SketchPoint, first: { x: number; z: number }, second: { x: number; z: number }, end: SketchPoint, amount: number) {
  const inverse = 1 - amount;
  return {
    x: inverse ** 3 * start.x + 3 * inverse ** 2 * amount * first.x + 3 * inverse * amount ** 2 * second.x + amount ** 3 * end.x,
    z: inverse ** 3 * start.z + 3 * inverse ** 2 * amount * first.z + 3 * inverse * amount ** 2 * second.z + amount ** 3 * end.z,
  };
}

// Outline of the given paths with curves flattened, for inside/outside and crossing tests.
export function pathEdges(paths: DisplayPath[]) {
  const edges: PlaneEdge[] = [];
  paths.forEach((path) => {
    path.steps.forEach((step) => {
      const controls = curveControls(step);
      if (step.segment.kind === "line" || !controls.first || !controls.second) {
        edges.push({ from: step.from, to: step.to });
        return;
      }
      let previous: { x: number; z: number } = step.from;
      for (let index = 1; index <= 16; index += 1) {
        const point = cubicPoint(step.from, controls.first, controls.second, step.to, index / 16);
        edges.push({ from: previous, to: point });
        previous = point;
      }
    });
  });
  return edges;
}

export type DisplayRegion = { outer: DisplayPath; holes: DisplayPath[] };

/**
 * The closed paths as the bodies they become (#239): holes only where an outline lies wholly
 * inside another, so two shapes pushed over each other show as one body, not as a hole.
 */
export function closedPathRegions(paths: DisplayPath[]): DisplayRegion[] {
  const records = paths
    .filter((path) => path.closed)
    .map((path) => {
      const polygon = pathEdges([path]).map((edge) => edge.from);
      const area = Math.abs(polygon.reduce((sum, point, index) => {
        const next = polygon[(index + 1) % polygon.length];
        return sum + point.x * next.z - next.x * point.z;
      }, 0)) / 2;
      return { item: path, polygon, area };
    })
    .filter((record) => record.polygon.length >= 3 && record.area > 1e-8);
  return nestOutlines(records);
}

export function isInsideEdges(point: { x: number; z: number }, edges: PlaneEdge[]) {
  let inside = false;
  edges.forEach(({ from, to }) => {
    if ((from.z > point.z) === (to.z > point.z)) return;
    const crossX = from.x + ((point.z - from.z) / (to.z - from.z)) * (to.x - from.x);
    if (crossX > point.x) inside = !inside;
  });
  return inside;
}

// Innermost closed path around `point`, so a click inside a hole picks the hole
// rather than the outline around it.
export function closedPathAt(point: { x: number; z: number }, paths: DisplayPath[]) {
  let best: DisplayPath | null = null;
  let bestArea = Infinity;
  for (const path of paths) {
    if (!path.closed) continue;
    const edges = pathEdges([path]);
    if (!isInsideEdges(point, edges)) continue;
    const area = Math.abs(edges.reduce((sum, { from, to }) => sum + from.x * to.z - to.x * from.z, 0)) / 2;
    if (area < bestArea) {
      best = path;
      bestArea = area;
    }
  }
  return best;
}
