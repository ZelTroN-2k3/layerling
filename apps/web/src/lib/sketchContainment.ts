export type PlanePoint = { x: number; z: number };

export function pointInPolygon(point: PlanePoint, polygon: readonly PlanePoint[]) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const current = polygon[index];
    const before = polygon[previous];
    if ((current.z > point.z) !== (before.z > point.z)
      && point.x < ((before.x - current.x) * (point.z - current.z)) / (before.z - current.z) + current.x) inside = !inside;
  }
  return inside;
}

function distanceToEdgeSquared(point: PlanePoint, a: PlanePoint, b: PlanePoint) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lengthSquared = dx * dx + dz * dz;
  const amount = lengthSquared > 0 ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / lengthSquared)) : 0;
  return (point.x - (a.x + dx * amount)) ** 2 + (point.z - (a.z + dz * amount)) ** 2;
}

function onOutline(point: PlanePoint, polygon: readonly PlanePoint[]) {
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    if (distanceToEdgeSquared(point, polygon[previous], polygon[index]) < 1e-10) return true;
  }
  return false;
}

/**
 * Does the closed outline `inner` lie inside `outer`? One corner is not enough to say: where two
 * outlines cross, a corner of one can sit exactly on the other, and two squares pushed over each
 * other have corners in each other. So every corner counts, and the ones that touch the outline
 * (a point the two share) are left out; the outline is inside when none is outside and at least
 * one is clearly in.
 */
export function polygonInside(inner: readonly PlanePoint[], outer: readonly PlanePoint[]) {
  let inside = 0;
  for (const point of inner) {
    if (onOutline(point, outer)) continue;
    if (!pointInPolygon(point, outer)) return false;
    inside += 1;
  }
  return inside > 0;
}

export type NestedRecord<T> = { item: T; polygon: readonly PlanePoint[]; area: number };

/**
 * Closed outlines as bodies and holes, the way the sketch becomes a 3D body: an outline that lies
 * inside an odd number of larger ones is a hole of the nearest solid around it, every other
 * outline is a solid. Outlines that only overlap are all solids - the body is their union.
 */
export function nestOutlines<T>(records: ReadonlyArray<NestedRecord<T>>): Array<{ outer: T; holes: T[] }> {
  const sorted = [...records].sort((a, b) => b.area - a.area);
  const contains = (outerIndex: number, innerIndex: number) =>
    sorted[outerIndex].area > sorted[innerIndex].area && polygonInside(sorted[innerIndex].polygon, sorted[outerIndex].polygon);
  const depths = sorted.map((_record, index) => {
    let depth = 0;
    for (let other = 0; other < sorted.length; other += 1) {
      if (other !== index && contains(other, index)) depth += 1;
    }
    return depth;
  });

  const regions: Array<{ outer: T; holes: T[] }> = [];
  sorted.forEach((record, index) => {
    if (depths[index] % 2 === 0) {
      regions.push({ outer: record.item, holes: [] });
      return;
    }
    let parent: number | null = null;
    for (let other = 0; other < sorted.length; other += 1) {
      if (other === index || depths[other] % 2 !== 0 || depths[other] >= depths[index] || !contains(other, index)) continue;
      if (parent === null || sorted[other].area < sorted[parent].area) parent = other;
    }
    if (parent !== null) regions.find((region) => region.outer === sorted[parent!].item)?.holes.push(record.item);
  });
  return regions;
}
