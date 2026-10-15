/**
 * A mesh of flat faces as a solid whose faces are really flat (#248).
 *
 * A body that went through Split or a boolean is a triangle mesh with float32 corners. Triangles of
 * one flat face are then flat only to about a millionth of a millimetre, the kernel's "unify same
 * domain" does not take them for one face, and an edge treatment next to such a face stops at the
 * seams between the pieces ("cannot be filleted together at this size", even for 0.01 mm).
 *
 * Here the triangles of one flat face are gathered first, the corners where three or more flat faces
 * meet are moved onto the exact meeting point of their planes, and each flat face is built as one
 * polygon. What is not flat (a tessellated cylinder) stays triangles, the corners of those untouched.
 */
import type { OcctKernel, ShapeHandle } from "occt-wasm";

type V3 = [number, number, number];

/** Normals closer than about 0.025 degrees and planes closer than a thousandth of a millimetre are one face. */
const SAME_PLANE_DOT = 1 - 1e-7;
const SAME_PLANE_DISTANCE = 1e-3;
/** A moved corner must stay within this of where it was; further off, it was not a plain corner. */
const MAX_CORNER_SHIFT = 1e-3;
/** The three planes of a corner must be this far from sharing a line. */
const MIN_CORNER_CONDITION = 0.1;

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const length = (a: V3) => Math.hypot(a[0], a[1], a[2]);

interface Cluster {
  triangles: number[];
  /** Unit normal and offset of the fitted plane: normal . p = offset. */
  normal: V3;
  offset: number;
}

interface PlanarMesh {
  vertices: V3[];
  triangles: Array<[number, number, number]>;
  clusters: Cluster[];
  clusterOfTriangle: number[];
}

function weld(positions: ArrayLike<number>, indices: ArrayLike<number> | undefined) {
  const keyToId = new Map<string, number>();
  const vertices: V3[] = [];
  const idOf = (index: number) => {
    const point: V3 = [positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2]];
    const key = `${Math.round(point[0] * 1e4)},${Math.round(point[1] * 1e4)},${Math.round(point[2] * 1e4)}`;
    let id = keyToId.get(key);
    if (id === undefined) {
      id = vertices.length;
      keyToId.set(key, id);
      vertices.push(point);
    }
    return id;
  };
  const count = indices ? indices.length : Math.floor(positions.length / 3);
  const triangles: Array<[number, number, number]> = [];
  for (let offset = 0; offset + 2 < count; offset += 3) {
    const corner = (k: number) => idOf(indices ? indices[offset + k] : offset + k);
    const a = corner(0);
    const b = corner(1);
    const c = corner(2);
    if (a !== b && b !== c && a !== c) triangles.push([a, b, c]);
  }
  return { vertices, triangles };
}

function analyse(positions: ArrayLike<number>, indices: ArrayLike<number> | undefined): PlanarMesh | null {
  const { vertices, triangles } = weld(positions, indices);
  if (triangles.length < 4) return null;
  const normals: V3[] = [];
  const areas: number[] = [];
  triangles.forEach(([a, b, c]) => {
    const n = cross(sub(vertices[b], vertices[a]), sub(vertices[c], vertices[a]));
    const l = length(n);
    areas.push(l / 2);
    normals.push(l > 0 ? [n[0] / l, n[1] / l, n[2] / l] : [0, 0, 0]);
  });

  const edgeTriangles = new Map<string, number[]>();
  const edgeKey = (a: number, b: number) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  triangles.forEach(([a, b, c], index) => {
    [[a, b], [b, c], [c, a]].forEach(([from, to]) => {
      const key = edgeKey(from, to);
      const list = edgeTriangles.get(key);
      if (list) list.push(index);
      else edgeTriangles.set(key, [index]);
    });
  });

  // Grown from a seed triangle, each candidate compared with the seed's plane, so a slowly bending
  // surface cannot creep into one face.
  const clusterOfTriangle = new Array<number>(triangles.length).fill(-1);
  const clusters: Cluster[] = [];
  for (let seed = 0; seed < triangles.length; seed += 1) {
    if (clusterOfTriangle[seed] !== -1 || areas[seed] <= 0) continue;
    const clusterId = clusters.length;
    const seedNormal = normals[seed];
    const seedOffset = dot(seedNormal, vertices[triangles[seed][0]]);
    const members = [seed];
    clusterOfTriangle[seed] = clusterId;
    for (let head = 0; head < members.length; head += 1) {
      const [a, b, c] = triangles[members[head]];
      [[a, b], [b, c], [c, a]].forEach(([from, to]) => {
        (edgeTriangles.get(edgeKey(from, to)) ?? []).forEach((other) => {
          if (clusterOfTriangle[other] !== -1 || areas[other] <= 0) return;
          if (dot(seedNormal, normals[other]) < SAME_PLANE_DOT) return;
          if (!triangles[other].every((v) => Math.abs(dot(seedNormal, vertices[v]) - seedOffset) < SAME_PLANE_DISTANCE)) return;
          clusterOfTriangle[other] = clusterId;
          members.push(other);
        });
      });
    }
    let weighted: V3 = [0, 0, 0];
    let centre: V3 = [0, 0, 0];
    let total = 0;
    members.forEach((index) => {
      const [a, b, c] = triangles[index];
      weighted = [weighted[0] + normals[index][0] * areas[index], weighted[1] + normals[index][1] * areas[index], weighted[2] + normals[index][2] * areas[index]];
      const middle: V3 = [(vertices[a][0] + vertices[b][0] + vertices[c][0]) / 3, (vertices[a][1] + vertices[b][1] + vertices[c][1]) / 3, (vertices[a][2] + vertices[b][2] + vertices[c][2]) / 3];
      centre = [centre[0] + middle[0] * areas[index], centre[1] + middle[1] * areas[index], centre[2] + middle[2] * areas[index]];
      total += areas[index];
    });
    const l = length(weighted);
    const normal: V3 = [weighted[0] / l, weighted[1] / l, weighted[2] / l];
    centre = [centre[0] / total, centre[1] / total, centre[2] / total];
    clusters.push({ triangles: members, normal, offset: dot(normal, centre) });
  }
  if (clusterOfTriangle.some((id) => id === -1)) return null;
  return { vertices, triangles, clusters, clusterOfTriangle };
}

/** How many flat faces the mesh has (every triangle that is not part of a larger flat face counts one). */
export function planarFaceCount(positions: ArrayLike<number>, indices?: ArrayLike<number>) {
  return analyse(positions, indices)?.clusters.length ?? 0;
}

/** Corners where several flat faces meet, moved onto the exact meeting point of their planes. */
function snapCorners(mesh: PlanarMesh) {
  const { vertices, triangles, clusters, clusterOfTriangle } = mesh;
  const incident = vertices.map(() => new Set<number>());
  triangles.forEach((triangle, index) => triangle.forEach((v) => incident[v].add(clusterOfTriangle[index])));
  const moved = vertices.map((vertex) => [...vertex] as V3);
  incident.forEach((ids, v) => {
    const planes = [...ids].map((id) => clusters[id]);
    if (planes.length < 3) return;
    // A corner of a tessellated curve touches many one-triangle faces: only corners of real flat
    // faces (or exactly three planes, which always meet in one point) are taken.
    const flat = planes.filter((plane) => plane.triangles.length >= 2).length;
    if (planes.length > 3 && flat !== planes.length) return;
    // Normal equations of the least-squares meeting point (exact for three planes).
    const m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const r: V3 = [0, 0, 0];
    planes.forEach(({ normal, offset }) => {
      for (let i = 0; i < 3; i += 1) {
        for (let j = 0; j < 3; j += 1) m[i][j] += normal[i] * normal[j];
        r[i] += normal[i] * offset;
      }
    });
    const det = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    // For three unit normals this is the squared volume of the parallelepiped: 1 for a box corner, 0 when planes share a line.
    if (planes.length === 3 && Math.abs(det) < MIN_CORNER_CONDITION * MIN_CORNER_CONDITION) return;
    if (planes.length > 3 && Math.abs(det) < MIN_CORNER_CONDITION * MIN_CORNER_CONDITION * 0.25) return;
    const inverse = [
      [(m[1][1] * m[2][2] - m[1][2] * m[2][1]) / det, (m[0][2] * m[2][1] - m[0][1] * m[2][2]) / det, (m[0][1] * m[1][2] - m[0][2] * m[1][1]) / det],
      [(m[1][2] * m[2][0] - m[1][0] * m[2][2]) / det, (m[0][0] * m[2][2] - m[0][2] * m[2][0]) / det, (m[0][2] * m[1][0] - m[0][0] * m[1][2]) / det],
      [(m[1][0] * m[2][1] - m[1][1] * m[2][0]) / det, (m[0][1] * m[2][0] - m[0][0] * m[2][1]) / det, (m[0][0] * m[1][1] - m[0][1] * m[1][0]) / det],
    ];
    const point: V3 = [
      inverse[0][0] * r[0] + inverse[0][1] * r[1] + inverse[0][2] * r[2],
      inverse[1][0] * r[0] + inverse[1][1] * r[1] + inverse[1][2] * r[2],
      inverse[2][0] * r[0] + inverse[2][1] * r[1] + inverse[2][2] * r[2],
    ];
    if (point.some((value) => !Number.isFinite(value))) return;
    if (length(sub(point, vertices[v])) > MAX_CORNER_SHIFT) return;
    moved[v] = point;
  });
  return moved;
}

/** The outline of one flat face as a ring of corner ids, or null when it is not one plain ring. */
function outline(mesh: PlanarMesh, cluster: Cluster): number[] | null {
  const { triangles } = mesh;
  const directed = new Set<string>();
  cluster.triangles.forEach((index) => {
    const [a, b, c] = triangles[index];
    directed.add(`${a}_${b}`);
    directed.add(`${b}_${c}`);
    directed.add(`${c}_${a}`);
  });
  const next = new Map<number, number>();
  for (const index of cluster.triangles) {
    const [a, b, c] = triangles[index];
    for (const [from, to] of [[a, b], [b, c], [c, a]]) {
      if (directed.has(`${to}_${from}`)) continue;
      if (next.has(from)) return null;
      next.set(from, to);
    }
  }
  if (next.size < 3) return null;
  const start = next.keys().next().value as number;
  const ring = [start];
  for (let at = next.get(start)!; at !== start; at = next.get(at)!) {
    if (at === undefined || ring.length > next.size) return null;
    ring.push(at);
  }
  // One ring holding every boundary edge: a face with a hole has a second ring.
  return ring.length === next.size ? ring : null;
}

/** Flat faces of the mesh as kernel faces, ready for sewing; null when there is nothing to gain. */
export function planarMeshFaces(cad: OcctKernel, positions: ArrayLike<number>, indices?: ArrayLike<number>): { faces: ShapeHandle[]; faceCount: number } | null {
  const mesh = analyse(positions, indices);
  if (!mesh || mesh.clusters.length === mesh.triangles.length) return null;
  const corners = snapCorners(mesh);
  const point = (id: number): V3 => corners[id];
  const faces: ShapeHandle[] = [];
  const faceOf = (ring: number[], plane?: Cluster) => {
    const points = ring.map((id) => {
      const p = point(id);
      if (!plane) return p;
      // Whatever the corner step left off the plane (a corner of curved parts) is put onto it.
      const distance = dot(plane.normal, p) - plane.offset;
      return [p[0] - plane.normal[0] * distance, p[1] - plane.normal[1] * distance, p[2] - plane.normal[2] * distance] as V3;
    });
    const edges = points.map((from, index) => cad.makeLineEdge({ x: from[0], y: from[1], z: from[2] }, { x: points[(index + 1) % points.length][0], y: points[(index + 1) % points.length][1], z: points[(index + 1) % points.length][2] }));
    return cad.makeFace(cad.makeWire(edges));
  };
  mesh.clusters.forEach((cluster) => {
    const ring = cluster.triangles.length >= 2 ? outline(mesh, cluster) : null;
    if (ring) {
      faces.push(faceOf(ring, cluster));
      return;
    }
    cluster.triangles.forEach((index) => faces.push(faceOf(mesh.triangles[index])));
  });
  return { faces, faceCount: mesh.clusters.length };
}
