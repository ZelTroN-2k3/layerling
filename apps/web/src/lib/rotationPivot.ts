import * as THREE from "three";
import { quaternionForShape } from "@/lib/geometryRotation";
import { mirrorSign, shapeDepth, shapeWidth } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

export type PivotPoint = { x: number; y: number; z: number };

/**
 * The centre of the flat face a click landed on.
 *
 * `positions` holds world-space triangles, nine numbers per triangle, and
 * `hitTriangle` is the one under the pointer. The face is every triangle that
 * lies in the same plane as the hit and is connected to it through shared
 * corners; its area-weighted centre is returned. On the round end of a pipe
 * that is the pipe's axis - the point a bend has to turn around to keep its
 * end where it was. Connectivity matters: both ends of a U-bend lie in one
 * plane, and averaging them would land between the two pipes.
 *
 * On a curved surface the "face" is a single facet, so the result is simply a
 * point next to the click. Returns null for a degenerate hit triangle.
 */
export function planarFaceCentroid(positions: ArrayLike<number>, hitTriangle: number): PivotPoint | null {
  const face = planarFaceTriangles(positions, hitTriangle);
  if (!face) return null;
  let weight = 0;
  let cx = 0;
  let cy = 0;
  let cz = 0;
  face.triangles.forEach((triangle) => {
    const o = triangle * 9;
    const area = face.areas[triangle];
    weight += area;
    cx += area * (positions[o] + positions[o + 3] + positions[o + 6]) / 3;
    cy += area * (positions[o + 1] + positions[o + 4] + positions[o + 7]) / 3;
    cz += area * (positions[o + 2] + positions[o + 5] + positions[o + 8]) / 3;
  });
  return { x: cx / weight, y: cy / weight, z: cz / weight };
}

/**
 * The triangles of the flat face a triangle belongs to: every triangle in the
 * same plane that is connected to it through shared corners. `areas` holds
 * the area of every triangle of the mesh, indexed like `positions`.
 */
export function planarFaceTriangles(positions: ArrayLike<number>, hitTriangle: number): { triangles: number[]; areas: Float64Array } | null {
  const triangleCount = Math.floor(positions.length / 9);
  if (hitTriangle < 0 || hitTriangle >= triangleCount) {
    return null;
  }

  const normals = new Float64Array(triangleCount * 3);
  const areas = new Float64Array(triangleCount);
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const o = triangle * 9;
    const ux = positions[o + 3] - positions[o];
    const uy = positions[o + 4] - positions[o + 1];
    const uz = positions[o + 5] - positions[o + 2];
    const vx = positions[o + 6] - positions[o];
    const vy = positions[o + 7] - positions[o + 1];
    const vz = positions[o + 8] - positions[o + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz);
    areas[triangle] = length / 2;
    if (length > 0) {
      normals[triangle * 3] = nx / length;
      normals[triangle * 3 + 1] = ny / length;
      normals[triangle * 3 + 2] = nz / length;
    }
    for (let corner = 0; corner < 9; corner += 3) {
      minX = Math.min(minX, positions[o + corner]);
      maxX = Math.max(maxX, positions[o + corner]);
      minY = Math.min(minY, positions[o + corner + 1]);
      maxY = Math.max(maxY, positions[o + corner + 1]);
      minZ = Math.min(minZ, positions[o + corner + 2]);
      maxZ = Math.max(maxZ, positions[o + corner + 2]);
    }
  }
  if (!(areas[hitTriangle] > 0)) {
    return null;
  }

  const extent = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1);
  const planeTolerance = extent * 1e-5;
  // Corners closer than this count as one; the mesh stores float32 positions.
  const weld = extent * 1e-6;
  const hx = normals[hitTriangle * 3];
  const hy = normals[hitTriangle * 3 + 1];
  const hz = normals[hitTriangle * 3 + 2];
  const hitOffset = hx * positions[hitTriangle * 9] + hy * positions[hitTriangle * 9 + 1] + hz * positions[hitTriangle * 9 + 2];

  const coplanar = (triangle: number) => {
    if (!(areas[triangle] > 0)) return false;
    const dot = normals[triangle * 3] * hx + normals[triangle * 3 + 1] * hy + normals[triangle * 3 + 2] * hz;
    if (dot < 0.9999) return false;
    const o = triangle * 9;
    for (let corner = 0; corner < 9; corner += 3) {
      const distance = hx * positions[o + corner] + hy * positions[o + corner + 1] + hz * positions[o + corner + 2] - hitOffset;
      if (Math.abs(distance) > planeTolerance) return false;
    }
    return true;
  };

  const cornerKey = (triangle: number, corner: number) => {
    const o = triangle * 9 + corner * 3;
    return `${Math.round(positions[o] / weld)},${Math.round(positions[o + 1] / weld)},${Math.round(positions[o + 2] / weld)}`;
  };

  const trianglesAtCorner = new Map<string, number[]>();
  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    if (!coplanar(triangle)) continue;
    for (let corner = 0; corner < 3; corner += 1) {
      const key = cornerKey(triangle, corner);
      const list = trianglesAtCorner.get(key);
      if (list) list.push(triangle);
      else trianglesAtCorner.set(key, [triangle]);
    }
  }

  const visited = new Set<number>([hitTriangle]);
  const queue = [hitTriangle];
  const triangles: number[] = [];
  while (queue.length > 0) {
    const triangle = queue.pop() as number;
    triangles.push(triangle);
    for (let corner = 0; corner < 3; corner += 1) {
      trianglesAtCorner.get(cornerKey(triangle, corner))?.forEach((neighbour) => {
        if (!visited.has(neighbour)) {
          visited.add(neighbour);
          queue.push(neighbour);
        }
      });
    }
  }

  return { triangles, areas };
}

/**
 * A pivot that stays with one body is stored in the body's own frame, as a
 * fraction of its width, height and depth from its centre: it moves, turns
 * and scales with the body, the way a note anchored to a body does.
 */
function shapePivotFrame(shape: WorkplaneShape) {
  const size = new THREE.Vector3(
    Math.max(1e-6, shapeWidth(shape)),
    Math.max(1e-6, shape.height),
    Math.max(1e-6, shapeDepth(shape)),
  );
  const mirror = new THREE.Vector3(mirrorSign(shape.mirrorX), mirrorSign(shape.mirrorY), mirrorSign(shape.mirrorZ));
  const center = new THREE.Vector3(shape.x, (shape.elevation ?? 0) + shape.height / 2, shape.z);
  return { size, mirror, center, turn: quaternionForShape(shape) };
}

/** Where a body's own pivot lies in the world, or null if it has none. */
export function shapePivotWorld(shape: WorkplaneShape): PivotPoint | null {
  const stored = shape.rotationPivot;
  if (!stored || !stored.every(Number.isFinite)) return null;
  const { size, mirror, center, turn } = shapePivotFrame(shape);
  const point = new THREE.Vector3(...stored).multiply(size).multiply(mirror).applyQuaternion(turn).add(center);
  return { x: point.x, y: point.y, z: point.z };
}

/** The value to store on a body for a pivot at a point in the world. */
export function shapePivotFromWorld(shape: WorkplaneShape, point: PivotPoint): [number, number, number] {
  const { size, mirror, center, turn } = shapePivotFrame(shape);
  const local = new THREE.Vector3(point.x, point.y, point.z).sub(center).applyQuaternion(turn.clone().invert()).multiply(mirror).divide(size);
  return [local.x, local.y, local.z];
}

/**
 * Keeps a body's pivot on the same spot in the world when the body is
 * rebuilt in a new frame (a turn baked into its mesh, say).
 */
export function carryShapePivot(from: WorkplaneShape, to: WorkplaneShape): WorkplaneShape {
  const world = shapePivotWorld(from);
  if (!world) return to;
  return { ...to, rotationPivot: shapePivotFromWorld(to, world) };
}
