/**
 * A twist turns every vertex by its height, but a body drawn with nothing between its bottom and
 * its top (a box, a prism) has no vertex halfway up: it only turned its lid, and its sides folded
 * along their diagonals (#184). Cutting the mesh into horizontal bands first gives the twist
 * something to turn at every step, so the sides wind round as the exact body does.
 */

type Vec3 = [number, number, number];
type Face = [number, number, number];

/**
 * Degrees of twist per band. Finer than the exact loft's sections (7.5 degrees): a band is two
 * flat triangles per side, and turned too far over its height they fold visibly against each
 * other; the loft's surface is smooth between its sections anyway.
 */
export const TWIST_BAND_STEP = 2.5;

/** How many bands a twist needs, 1 for none. */
export function twistBandCount(twistDegrees: number) {
  const twist = Math.abs(Number.isFinite(twistDegrees) ? twistDegrees : 0);
  return twist < 1e-6 ? 1 : Math.max(2, Math.ceil(twist / TWIST_BAND_STEP));
}

/** The cutting heights between `minY` and `maxY` for that many bands. */
export function bandLevels(minY: number, maxY: number, bands: number) {
  const levels: number[] = [];
  for (let index = 1; index < bands; index += 1) levels.push(minY + ((maxY - minY) * index) / bands);
  return levels;
}

/**
 * The mesh cut at the given heights. Every triangle that crosses a height is split there; a point
 * where an edge meets a height is computed the same way from both triangles that share the edge,
 * and shared, so a closed mesh stays closed. Winding is kept.
 */
export function sliceMeshAtHeights(vertices: readonly Vec3[], faces: readonly Face[], levels: readonly number[]) {
  if (levels.length === 0) return { vertices: vertices.slice(), faces: faces.slice() };
  const sorted = [...levels].sort((a, b) => a - b);
  const out: Vec3[] = vertices.slice();
  const keyIndex = new Map<string, number>();
  const key = (point: Vec3) => `${Math.round(point[0] * 1e6)},${Math.round(point[1] * 1e6)},${Math.round(point[2] * 1e6)}`;
  vertices.forEach((vertex, index) => {
    const k = key(vertex);
    if (!keyIndex.has(k)) keyIndex.set(k, index);
  });
  const edgeCut = new Map<string, number>();
  // The point on edge a-b at height y, shared by both faces of the edge.
  const cut = (a: number, b: number, level: number) => {
    // Ordered by place, not by index: two faces of one edge then compute the very same point.
    const [ka, kb] = [key(out[a]), key(out[b])];
    const [lo, hi] = ka < kb ? [a, b] : [b, a];
    const id = `${ka < kb ? ka : kb}|${ka < kb ? kb : ka}|${level}`;
    const known = edgeCut.get(id);
    if (known !== undefined) return known;
    const p = out[lo];
    const q = out[hi];
    const t = (level - p[1]) / (q[1] - p[1]);
    const point: Vec3 = [p[0] + (q[0] - p[0]) * t, level, p[2] + (q[2] - p[2]) * t];
    const k = key(point);
    let index = keyIndex.get(k);
    if (index === undefined) {
      index = out.length;
      out.push(point);
      keyIndex.set(k, index);
    }
    edgeCut.set(id, index);
    return index;
  };
  const result: Face[] = [];
  const emit = (polygon: number[]) => {
    for (let index = 1; index + 1 < polygon.length; index += 1) {
      const face: Face = [polygon[0], polygon[index], polygon[index + 1]];
      if (face[0] !== face[1] && face[1] !== face[2] && face[0] !== face[2]) result.push(face);
    }
  };
  for (const face of faces) {
    const ys = face.map((index) => out[index][1]);
    const low = Math.min(...ys);
    const high = Math.max(...ys);
    let polygon: number[] = [...face];
    for (const level of sorted) {
      if (level <= low + 1e-9 || level >= high - 1e-9) continue;
      // Split the polygon at the level into the part below and the part above, keeping the order.
      const below: number[] = [];
      const above: number[] = [];
      polygon.forEach((current, index) => {
        const next = polygon[(index + 1) % polygon.length];
        const cy = out[current][1];
        const ny = out[next][1];
        if (cy <= level + 1e-12) below.push(current);
        if (cy >= level - 1e-12) above.push(current);
        if ((cy < level - 1e-12 && ny > level + 1e-12) || (cy > level + 1e-12 && ny < level - 1e-12)) {
          const point = cut(current, next, level);
          below.push(point);
          above.push(point);
        }
      });
      if (below.length >= 3) emit(below);
      polygon = above;
      if (polygon.length < 3) break;
    }
    if (polygon.length >= 3) emit(polygon);
  }
  return { vertices: out, faces: result };
}

/** The same for a flat list of triangle corners (x, y, z, x, y, z, ...), as a non-indexed geometry holds them. */
export function slicePositionsAtHeights(positions: ArrayLike<number>, levels: readonly number[]) {
  const vertices: Vec3[] = [];
  const faces: Face[] = [];
  for (let index = 0; index + 8 < positions.length; index += 9) {
    const base = vertices.length;
    vertices.push([positions[index], positions[index + 1], positions[index + 2]]);
    vertices.push([positions[index + 3], positions[index + 4], positions[index + 5]]);
    vertices.push([positions[index + 6], positions[index + 7], positions[index + 8]]);
    faces.push([base, base + 1, base + 2]);
  }
  const sliced = sliceMeshAtHeights(vertices, faces, levels);
  const flat = new Float32Array(sliced.faces.length * 9);
  sliced.faces.forEach((face, faceIndex) => {
    face.forEach((vertex, corner) => {
      const point = sliced.vertices[vertex];
      flat.set(point, faceIndex * 9 + corner * 3);
    });
  });
  return flat;
}

/**
 * The longest a side's edge may run across (in millimetres) so that the triangles of a twisted
 * side fold no more than about 4 degrees against each other. A flat side of a twisted body is in
 * truth curved across its width, and how much depends on the twist per height, not on the bands.
 */
export function twistEdgeLength(twistDegrees: number, height: number) {
  const twist = Math.abs((twistDegrees * Math.PI) / 180);
  if (twist < 1e-9) return Number.POSITIVE_INFINITY;
  return Math.max(0.3, height / 200, (0.07 * height) / twist);
}

/**
 * Splits every edge that runs further across than `maxLength` (measured in x and z, after
 * `scale`) at its middle, again and again, until none does or `maxFaces` would be passed. A
 * split edge is split for both faces that share it, so a closed mesh stays closed; winding is
 * kept.
 */
export function subdivideLongEdges(
  vertices: readonly Vec3[],
  faces: readonly Face[],
  maxLength: number,
  scale: Vec3 = [1, 1, 1],
  maxFaces = 150_000,
) {
  // Weld corners that sit on the same spot, so neighbouring faces share their edges.
  const key = (point: Vec3) => `${Math.round(point[0] * 1e6)},${Math.round(point[1] * 1e6)},${Math.round(point[2] * 1e6)}`;
  const out: Vec3[] = [];
  const byKey = new Map<string, number>();
  const weld = vertices.map((vertex) => {
    const k = key(vertex);
    let index = byKey.get(k);
    if (index === undefined) {
      index = out.length;
      out.push(vertex);
      byKey.set(k, index);
    }
    return index;
  });
  let current: Face[] = faces.map(([a, b, c]) => [weld[a], weld[b], weld[c]] as Face).filter(([a, b, c]) => a !== b && b !== c && a !== c);
  const across = (a: number, b: number) => Math.hypot((out[a][0] - out[b][0]) * scale[0], (out[a][2] - out[b][2]) * scale[2]);
  for (let pass = 0; pass < 12; pass += 1) {
    const middles = new Map<string, number>();
    const edgeId = (a: number, b: number) => (a < b ? `${a}|${b}` : `${b}|${a}`);
    for (const [a, b, c] of current) {
      for (const [p, q] of [[a, b], [b, c], [c, a]]) {
        if (across(p, q) > maxLength && !middles.has(edgeId(p, q))) middles.set(edgeId(p, q), -1);
      }
    }
    if (middles.size === 0 || current.length * 4 > maxFaces) break;
    middles.forEach((_value, id) => {
      const [a, b] = id.split("|").map(Number);
      middles.set(id, out.length);
      out.push([(out[a][0] + out[b][0]) / 2, (out[a][1] + out[b][1]) / 2, (out[a][2] + out[b][2]) / 2]);
    });
    const next: Face[] = [];
    for (const [a, b, c] of current) {
      const ab = middles.get(edgeId(a, b));
      const bc = middles.get(edgeId(b, c));
      const ca = middles.get(edgeId(c, a));
      if (ab !== undefined && bc !== undefined && ca !== undefined) next.push([a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]);
      else if (ab !== undefined && bc !== undefined) next.push([ab, b, bc], [a, ab, bc], [a, bc, c]);
      else if (bc !== undefined && ca !== undefined) next.push([bc, c, ca], [a, b, bc], [a, bc, ca]);
      else if (ca !== undefined && ab !== undefined) next.push([a, ab, ca], [ab, b, c], [ab, c, ca]);
      else if (ab !== undefined) next.push([a, ab, c], [ab, b, c]);
      else if (bc !== undefined) next.push([a, b, bc], [a, bc, c]);
      else if (ca !== undefined) next.push([a, b, ca], [ca, b, c]);
      else next.push([a, b, c]);
    }
    current = next;
  }
  return { vertices: out, faces: current };
}

/** Bands and short edges together: a mesh ready to be twisted by `twistDegrees` over its height. */
export function meshForTwist(vertices: readonly Vec3[], faces: readonly Face[], minY: number, maxY: number, twistDegrees: number, scale: Vec3 = [1, 1, 1]) {
  const sliced = sliceMeshAtHeights(vertices, faces, bandLevels(minY, maxY, twistBandCount(twistDegrees)));
  const height = (maxY - minY) * scale[1];
  return subdivideLongEdges(sliced.vertices, sliced.faces, twistEdgeLength(twistDegrees, height), scale);
}

/** The same for a flat list of triangle corners; returns a flat list again. */
export function positionsForTwist(positions: ArrayLike<number>, minY: number, maxY: number, twistDegrees: number, scale: Vec3 = [1, 1, 1]) {
  const vertices: Vec3[] = [];
  const faces: Face[] = [];
  for (let index = 0; index + 8 < positions.length; index += 9) {
    const base = vertices.length;
    vertices.push([positions[index], positions[index + 1], positions[index + 2]]);
    vertices.push([positions[index + 3], positions[index + 4], positions[index + 5]]);
    vertices.push([positions[index + 6], positions[index + 7], positions[index + 8]]);
    faces.push([base, base + 1, base + 2]);
  }
  const mesh = meshForTwist(vertices, faces, minY, maxY, twistDegrees, scale);
  const flat = new Float32Array(mesh.faces.length * 9);
  mesh.faces.forEach((face, faceIndex) => face.forEach((vertex, corner) => flat.set(mesh.vertices[vertex], faceIndex * 9 + corner * 3)));
  return flat;
}
