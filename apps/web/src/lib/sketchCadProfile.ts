import { isConstructionSegment } from "@/lib/sketchConstruction";
import { nestOutlines, polygonInside } from "@/lib/sketchContainment";
import type { SketchPoint, SketchProfile, SketchSegment } from "@/types/layerling";

export type OrderedCadSketchStep = { segment: SketchSegment; from: SketchPoint; to: SketchPoint };
export type OrderedCadSketchPath = { id: string; points: SketchPoint[]; steps: OrderedCadSketchStep[]; closed: boolean };
export type CadSketchRegion = { outer: OrderedCadSketchPath; holes: OrderedCadSketchPath[] };

export function orderedCadSketchPaths(profile: SketchProfile): OrderedCadSketchPath[] {
  const pointById = new Map(profile.points.map((point) => [point.id, point]));
  const adjacency = new Map<string, Array<{ pointId: string; segment: SketchSegment }>>();
  profile.points.forEach((point) => adjacency.set(point.id, []));
  const valid = profile.segments.filter((segment) => {
    if (isConstructionSegment(segment) || segment.startId === segment.endId || !pointById.has(segment.startId) || !pointById.has(segment.endId)) return false;
    adjacency.get(segment.startId)?.push({ pointId: segment.endId, segment });
    adjacency.get(segment.endId)?.push({ pointId: segment.startId, segment });
    return true;
  });
  const unvisited = new Set(valid.map((segment) => segment.id));
  const paths: OrderedCadSketchPath[] = [];

  while (unvisited.size > 0) {
    const seedId = unvisited.values().next().value as string;
    const seed = valid.find((segment) => segment.id === seedId);
    if (!seed) break;
    const component = new Set<string>();
    const queue = [seed.startId, seed.endId];
    while (queue.length > 0) {
      const id = queue.pop();
      if (!id || component.has(id)) continue;
      component.add(id);
      adjacency.get(id)?.forEach((edge) => queue.push(edge.pointId));
    }
    const startId = [...component].find((id) => (adjacency.get(id)?.filter((edge) => unvisited.has(edge.segment.id)).length ?? 0) === 1) ?? seed.startId;
    const first = pointById.get(startId);
    if (!first) {
      unvisited.delete(seed.id);
      continue;
    }
    const points = [first];
    const steps: OrderedCadSketchStep[] = [];
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

function sampledPath(path: OrderedCadSketchPath) {
  const samples: Array<{ x: number; z: number }> = [];
  path.steps.forEach(({ segment, from, to }, stepIndex) => {
    if (stepIndex === 0) samples.push({ x: from.x, z: from.z });
    const forward = segment.startId === from.id;
    const first = forward ? from.handleOut : from.handleIn;
    const second = forward ? to.handleIn : to.handleOut;
    if (segment.kind === "line" || !first || !second) {
      samples.push({ x: to.x, z: to.z });
      return;
    }
    for (let index = 1; index <= 16; index += 1) {
      const amount = index / 16;
      const inverse = 1 - amount;
      samples.push({
        x: inverse ** 3 * from.x + 3 * inverse ** 2 * amount * first.x + 3 * inverse * amount ** 2 * second.x + amount ** 3 * to.x,
        z: inverse ** 3 * from.z + 3 * inverse ** 2 * amount * first.z + 3 * inverse * amount ** 2 * second.z + amount ** 3 * to.z,
      });
    }
  });
  return samples;
}

function signedArea(points: Array<{ x: number; z: number }>) {
  return points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length];
    return area + point.x * next.z - next.x * point.z;
  }, 0) / 2;
}

/**
 * The sketch without its holes (#197, the usual Silhouette): only the closed outlines no larger
 * one holds stay, with the open lines; every outline inside them - holes and islands in holes -
 * is left out.
 */
export function silhouetteSketchProfile(profile: SketchProfile): SketchProfile {
  const closed = orderedCadSketchPaths(profile)
    .filter((path) => path.closed)
    .map((path) => {
      const polygon = sampledPath(path);
      return { path, polygon, area: Math.abs(signedArea(polygon)) };
    })
    .filter((record) => record.polygon.length >= 3 && record.area > 1e-8);
  const dropped = new Set<string>();
  closed.forEach((record) => {
    const held = closed.some((other) => other !== record && other.area > record.area && polygonInside(record.polygon, other.polygon));
    if (held) record.path.steps.forEach((step) => dropped.add(step.segment.id));
  });
  if (!dropped.size) return profile;
  const segments = profile.segments.filter((segment) => !dropped.has(segment.id));
  const used = new Set(segments.flatMap((segment) => [segment.startId, segment.endId]));
  return { ...profile, points: profile.points.filter((point) => used.has(point.id)), segments };
}

export function cadSketchRegions(profile: SketchProfile): CadSketchRegion[] {
  const allPaths = orderedCadSketchPaths(profile);
  const openCount = allPaths.filter((path) => !path.closed).length;
  const records = allPaths
    .filter((path) => path.closed)
    .map((path) => {
      const polygon = sampledPath(path);
      return { item: path, polygon, area: Math.abs(signedArea(polygon)) };
    })
    .filter((record) => record.polygon.length >= 3 && record.area > 1e-8);

  // Even depth = solid (outer boundary), odd depth = hole; outlines that only overlap are all solids.
  const regions: CadSketchRegion[] = nestOutlines(records);

  if (regions.length === 0 && openCount > 0 && allPaths.length > 0) {
    throw new Error("All profile paths are open. Close at least one loop before finishing the sketch.");
  }
  return regions;
}
