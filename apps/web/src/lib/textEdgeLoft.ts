import * as THREE from "three";

/**
 * The top edge of a text's letters as one smooth skin (#225). The 2D kernel steps the letters'
 * outlines inwards level by level (always valid outlines, however sharp a corner or short an edge
 * is); here every ring of a level is joined to the matching ring of the level above it by a band
 * of triangles, so the surface has no ledges and shades smoothly. Where a level has more or fewer
 * rings than the one below - a thin stroke that runs out, a counter that closes - nothing is built
 * (null) and textFill falls back to slabs, which always stand.
 */

type Point = { x: number; z: number };
export type EdgeRing = Point[];

const signedArea = (ring: EdgeRing) => ring.reduce((sum, point, index) => {
  const next = ring[(index + 1) % ring.length];
  return sum + point.x * next.z - next.x * point.z;
}, 0) / 2;

/** Whether `point` lies inside `ring` (even-odd). */
function inside(point: Point, ring: EdgeRing) {
  let odd = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const a = ring[index];
    const b = ring[previous];
    if ((a.z > point.z) !== (b.z > point.z) && point.x < ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z) + a.x) odd = !odd;
  }
  return odd;
}

/**
 * For each ring of the level above, the ring of the level below it belongs to: an outer ring lies
 * inside its lower one, a hole (which grows as the letters step in) contains it. Null unless that
 * is one ring for each, no ring used twice.
 */
function matchLevels(lower: EdgeRing[], upper: EdgeRing[]): number[] | null {
  if (lower.length !== upper.length) return null;
  const taken = new Set<number>();
  const matches: number[] = [];
  for (const ring of upper) {
    const outer = signedArea(ring) > 0;
    let found = -1;
    let foundArea = Infinity;
    lower.forEach((candidate, index) => {
      if ((signedArea(candidate) > 0) !== outer || taken.has(index)) return;
      const contains = outer ? inside(ring[0], candidate) : inside(candidate[0], ring);
      const area = Math.abs(signedArea(candidate));
      if (contains && area < foundArea) {
        found = index;
        foundArea = area;
      }
    });
    if (found < 0) return null;
    taken.add(found);
    matches.push(found);
  }
  return matches;
}

/**
 * Triangles joining ring A (below) to ring B (above), both running the same way round with the
 * solid on the left: starting at the pair nearest each other, advancing along whichever ring gives
 * the shorter diagonal. Each triangle is (vertex of A, vertex of B, next vertex of A) or (vertex
 * of A, vertex of B, next vertex of B) - the winding of the quads of a straight wall.
 */
function band(a: EdgeRing, b: EdgeRing, aIds: number[], bIds: number[]): number[] {
  const near = (from: Point) => a.reduce((best, point, index) => (Math.hypot(point.x - from.x, point.z - from.z) < Math.hypot(a[best].x - from.x, a[best].z - from.z) ? index : best), 0);
  const start = near(b[0]);
  const n = a.length;
  const m = b.length;
  const distance = (i: number, j: number) => Math.hypot(a[(start + i) % n].x - b[j % m].x, a[(start + i) % n].z - b[j % m].z);
  const idA = (i: number) => aIds[(start + i) % n];
  const idB = (j: number) => bIds[j % m];
  const out: number[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    const advanceA = j >= m || (i < n && distance(i + 1, j) <= distance(i, j + 1));
    if (advanceA) {
      out.push(idA(i), idB(j), idA(i + 1));
      i += 1;
    } else {
      out.push(idA(i), idB(j), idB(j + 1));
      j += 1;
    }
  }
  return out;
}

/**
 * The skin as positions and triangle indices. `levels[k]` holds the rings of the letters stepped
 * in for the k-th boundary of the edge (level 0 is the full outline), `heights[k]` the height it
 * stands at; the walls run from the plate up to level 0. Null where the rings do not match up.
 */
export function loftedTextEdge(levels: readonly EdgeRing[][], heights: readonly number[]): { positions: number[]; indices: number[] } | null {
  if (levels.length < 2 || levels.length !== heights.length || levels.some((rings) => rings.length === 0 || rings.some((ring) => ring.length < 3))) return null;
  const matches: number[][] = [];
  for (let level = 1; level < levels.length; level += 1) {
    const found = matchLevels(levels[level - 1], levels[level]);
    if (!found) return null;
    matches.push(found);
  }
  const positions: number[] = [];
  const indices: number[] = [];
  // A row of vertices for each ring at each level, and one under the first level on the plate when the walls have height.
  const rowIds: number[][][] = [];
  const addRow = (ring: EdgeRing, y: number) => {
    const ids: number[] = [];
    ring.forEach((point) => {
      ids.push(positions.length / 3);
      positions.push(point.x, y, point.z);
    });
    return ids;
  };
  const wall = heights[0] > 1e-4;
  const floor = wall ? levels[0].map((ring) => addRow(ring, 0)) : null;
  levels.forEach((rings, level) => rowIds.push(rings.map((ring) => addRow(ring, heights[level]))));

  // The walls, between the plate and the first level: quads whose winding faces away from the solid on the left.
  if (floor) {
    levels[0].forEach((ring, ringIndex) => ring.forEach((_, index) => {
      const next = (index + 1) % ring.length;
      const a = floor[ringIndex][index];
      const b = floor[ringIndex][next];
      const c = rowIds[0][ringIndex][index];
      const d = rowIds[0][ringIndex][next];
      indices.push(a, d, b, a, c, d);
    }));
  }
  // The bands of the edge between neighbouring levels.
  for (let level = 1; level < levels.length; level += 1) {
    levels[level].forEach((ring, ringIndex) => {
      const lowerIndex = matches[level - 1][ringIndex];
      indices.push(...band(levels[level - 1][lowerIndex], ring, rowIds[level - 1][lowerIndex], rowIds[level][ringIndex]));
    });
  }

  // The bottom looking down and the top looking up: every outer ring with the holes inside it.
  const cap = (rings: EdgeRing[], ids: number[][], up: boolean) => {
    const outers = rings.map((ring, index) => ({ ring, index })).filter(({ ring }) => signedArea(ring) > 0);
    const holeOf = new Map<number, number[]>();
    rings.forEach((ring, index) => {
      if (signedArea(ring) > 0) return;
      const owner = outers
        .filter((candidate) => inside(ring[0], candidate.ring))
        .sort((a, b) => Math.abs(signedArea(a.ring)) - Math.abs(signedArea(b.ring)))[0];
      if (owner) holeOf.set(owner.index, [...(holeOf.get(owner.index) ?? []), index]);
    });
    for (const { index } of outers) {
      const holes = holeOf.get(index) ?? [];
      const parts = [index, ...holes];
      const flat = parts.flatMap((part) => rings[part].map((point, at) => ({ point, id: ids[part][at] })));
      const contour = rings[index].map((point) => new THREE.Vector2(point.x, point.z));
      const holeContours = holes.map((holeIndex) => rings[holeIndex].map((point) => new THREE.Vector2(point.x, point.z)));
      for (const [p, q, r] of THREE.ShapeUtils.triangulateShape(contour, holeContours)) {
        const pa = flat[p].point;
        const pb = flat[q].point;
        const pc = flat[r].point;
        // The y of (b - a) x (c - a), with x/z as here: positive faces up.
        const facesUp = (pb.z - pa.z) * (pc.x - pa.x) - (pb.x - pa.x) * (pc.z - pa.z) > 0;
        indices.push(flat[p].id, ...(facesUp === up ? [flat[q].id, flat[r].id] : [flat[r].id, flat[q].id]));
      }
    }
  };
  cap(levels[0], floor ?? rowIds[0], false);
  cap(levels[levels.length - 1], rowIds[levels.length - 1], true);
  return { positions, indices };
}
