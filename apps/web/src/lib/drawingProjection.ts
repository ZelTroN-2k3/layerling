// Adapted from WC3D/Cadverix-3D (SketchForge-3D), drawingProjection.ts,
// commit 8728f4d7a36fd965d362eb4d6d76b32d96e04391 (AGPL-3.0).
import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";

export type DrawingPoint = [number, number];
export type DrawingPoint3 = [number, number, number];
export type DrawingMesh = { vertices: readonly DrawingPoint3[]; faces: readonly [number, number, number][] };
export type DrawingLine = { a: DrawingPoint; b: DrawingPoint; hidden: boolean };
export type DrawingProjection = { lines: DrawingLine[]; center: DrawingPoint3; width: number; height: number };
export const MAX_DRAWING_TRIANGLES = 100_000;
export const MAX_DRAWING_EDGES = 12_000;

export function drawingRotation(rotation: DrawingPoint3) {
  return new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...rotation.map((angle) => angle * Math.PI / 180) as DrawingPoint3, "XYZ"));
}

/** Sharp and silhouette edges from the actual mesh, with BVH-tested hidden lines. */
export function projectDrawingMeshes(meshes: readonly DrawingMesh[], rotation: DrawingPoint3): DrawingProjection {
  const triangleCount = meshes.reduce((sum, mesh) => sum + mesh.faces.length, 0);
  if (!triangleCount) throw new Error("This view has no solid geometry");
  if (triangleCount > MAX_DRAWING_TRIANGLES) throw new Error("Drawing views support up to 100,000 triangles. Choose fewer or simpler objects.");
  if (meshes.reduce((sum, mesh) => sum + mesh.vertices.length, 0) > MAX_DRAWING_TRIANGLES * 3) throw new Error("Drawing source has too many vertices");
  const matrix = drawingRotation(rotation);
  const points: THREE.Vector3[] = [];
  const indices: number[] = [];
  const welded = new Map<string, number>();
  const edges = new Map<string, { a: number; b: number; normals: THREE.Vector3[] }>();
  const pointId = (point: DrawingPoint3) => {
    if (point.length !== 3 || !point.every(Number.isFinite)) throw new Error("Drawing source contains invalid coordinates");
    const key = point.map((v) => Math.round(v * 100000)).join(",");
    const existing = welded.get(key);
    if (existing !== undefined) return existing;
    const id = points.length;
    welded.set(key, id);
    points.push(new THREE.Vector3(...point).applyMatrix4(matrix));
    return id;
  };
  for (const mesh of meshes) {
    const ids = mesh.vertices.map(pointId);
    for (const face of mesh.faces) {
      const [a, b, c] = face.map((index) => ids[index]);
      if (a === undefined || b === undefined || c === undefined) throw new Error("Drawing source contains an invalid triangle");
      const normal = points[b]!.clone().sub(points[a]!).cross(points[c]!.clone().sub(points[a]!));
      if (normal.lengthSq() < 1e-18) continue;
      normal.normalize();
      indices.push(a, b, c);
      for (const [start, end] of [[a, b], [b, c], [c, a]]) {
        const key = start! < end! ? `${start}:${end}` : `${end}:${start}`;
        const edge = edges.get(key) ?? { a: start!, b: end!, normals: [] };
        edge.normals.push(normal);
        edges.set(key, edge);
      }
    }
  }
  if (!indices.length) throw new Error("Drawing source contains no usable triangles");
  const bounds = new THREE.Box3().setFromPoints(points);
  const center = bounds.getCenter(new THREE.Vector3()).toArray() as DrawingPoint3;
  const size = bounds.getSize(new THREE.Vector3());
  const project = (p: THREE.Vector3): DrawingPoint => [p.x - center[0], center[1] - p.y];
  const candidates = [...edges.values()].filter(({ normals }) => normals.length !== 2
    || normals[0]!.dot(normals[1]!) < Math.cos(25 * Math.PI / 180)
    || (normals.some((n) => n.z > 1e-7) && normals.some((n) => n.z < -1e-7)));
  if (candidates.length > MAX_DRAWING_EDGES) throw new Error("This view has too many drawing edges. Choose fewer or simpler objects.");
  const geometry = new THREE.BufferGeometry();
  // Keep Float32 BVH coordinates near the origin for far-away parts.
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points.flatMap((p) => [p.x - center[0], p.y - center[1], p.z - center[2]]), 3));
  geometry.setIndex(indices);
  const lines = new Map<string, DrawingLine>();
  try {
    const bvh = new MeshBVH(geometry, { targetLeafSize: 8 });
    const tolerance = Math.max(0.0001, size.length() * 1e-6);
    const top = bounds.max.z - center[2] + size.length() + 1;
    const ray = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, 0, -1));
    const hidden = (p: THREE.Vector3) => {
      ray.origin.set(p.x - center[0], p.y - center[1], top);
      const hit = bvh.raycastFirst(ray, THREE.DoubleSide);
      return Boolean(hit && hit.distance < top - (p.z - center[2]) - tolerance);
    };
    const add = (a: THREE.Vector3, b: THREE.Vector3, depth = 0) => {
      const p = project(a), q = project(b);
      if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-6) return;
      const visibility = [0.2, 0.5, 0.8].map((t) => hidden(a.clone().lerp(b, t)));
      if (depth < 4 && visibility.some((v) => v !== visibility[0])) {
        const middle = a.clone().lerp(b, 0.5);
        add(a, middle, depth + 1); add(middle, b, depth + 1); return;
      }
      const key = [p, q].map((point) => point.map((v) => Math.round(v * 100000)).join(",")).sort().join(":");
      const isHidden = visibility[1]!;
      if (!lines.has(key) || !isHidden) lines.set(key, { a: p, b: q, hidden: isHidden });
    };
    candidates.forEach(({ a, b }) => add(points[a]!, points[b]!));
  } finally { geometry.dispose(); }
  return { lines: [...lines.values()], center, width: size.x, height: size.y };
}
