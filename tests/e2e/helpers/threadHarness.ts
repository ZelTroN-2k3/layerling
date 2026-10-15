import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as THREE from "three";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import { cadModifierThreadForShape, cadProfileExpectation } from "@/lib/cadProfileExtrusion";
import { cadProfileSolidMismatch } from "@/lib/cadProfileSolid";
import { cadTransformRequiresGeneralTransform } from "@/lib/cadModifierRuntime";
import { threadPartSolid } from "@/lib/threadSolid";
import { createThreadGeometry, threadNaturalFootprint, threadNaturalHeight, threadProfileShape, threadSettings, MIN_THREAD_QUALITY, WHITWORTH_PROFILE_CONSTANTS } from "@/lib/threadGeometry";
import { meshYawDegrees, mirrorSign } from "@/lib/workplaneShapes";


/*
 * The thread's exact body against its display mesh, built by the real
 * createThreadGeometry and placed as transformMesh places it (copied here,
 * as LayerlingEditor.tsx keeps it to itself; threads take no taper, twist or
 * lean). Bounds and volume cannot tell a left-hand thread from a right-hand
 * one, or a thread half a turn out of phase, so points just inside and just
 * outside the drawn flanks are also tested against the body.
 */

export type Vec3 = [number, number, number];

export let cad: OcctKernel;

beforeAll(async () => {
  const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
  cad = await OcctKernel.init({ wasm });
});

export function thread(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  const fields = { threadDiameter: 6, threadPitch: 1, ...extra } as WorkplaneShape;
  const settings = threadSettings(fields);
  const footprint = threadNaturalFootprint(settings);
  return {
    id: "t", name: "Thread", kind: "thread", color: "#888888", x: 0, z: 0, elevation: 0, rotation: 0,
    width: footprint.width, depth: footprint.depth, size: Math.max(footprint.width, footprint.depth), height: threadNaturalHeight(settings),
    ...fields,
  } as WorkplaneShape;
}

/** The display mesh in world space, with each vertex's normal. */
export function displayMesh(shape: WorkplaneShape) {
  const geometry = createThreadGeometry({ ...shape, width: shape.width, depth: shape.depth ?? shape.width, height: shape.height });
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (!flat.getAttribute("normal")) flat.computeVertexNormals();
  const position = flat.getAttribute("position");
  const normal = flat.getAttribute("normal");
  const centerY = shape.height / 2;
  const rotation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(shape.rotationX ?? 0), THREE.MathUtils.degToRad(meshYawDegrees(shape)), THREE.MathUtils.degToRad(shape.rotationZ ?? 0), "XYZ"));
  const mirror = new THREE.Vector3(mirrorSign(shape.mirrorX), mirrorSign(shape.mirrorY), mirrorSign(shape.mirrorZ));
  const vertices: Vec3[] = [];
  const normals: Vec3[] = [];
  const local: Vec3[] = [];
  for (let i = 0; i < position.count; i += 1) {
    local.push([position.getX(i), position.getY(i), position.getZ(i)]);
    const v = new THREE.Vector3(position.getX(i) * mirror.x, (position.getY(i) - centerY) * mirror.y, position.getZ(i) * mirror.z).applyMatrix4(rotation);
    vertices.push([v.x + shape.x, v.y + (shape.elevation ?? 0) + centerY, v.z + shape.z]);
    const n = new THREE.Vector3(normal.getX(i) * mirror.x, normal.getY(i) * mirror.y, normal.getZ(i) * mirror.z).applyMatrix4(rotation).normalize();
    normals.push([n.x, n.y, n.z]);
  }
  const faces: Vec3[] = [];
  const flip = [shape.mirrorX, shape.mirrorY, shape.mirrorZ].filter(Boolean).length % 2 === 1;
  for (let i = 0; i + 2 < vertices.length; i += 3) faces.push(flip ? [i, i + 2, i + 1] : [i, i + 1, i + 2]);
  return { vertices, normals, faces, local };
}

export function body(shape: WorkplaneShape) {
  const part = cadModifierThreadForShape(shape);
  expect(part).not.toBeNull();
  const local = threadPartSolid(cad, part!);
  const t = part!.transform;
  return !t ? local : cadTransformRequiresGeneralTransform(t) ? cad.generalTransform(local, t) : cad.transform(local, t);
}

/** The body as fine triangles, for point-in-body tests by ray parity (a boolean per point is far too slow). */
export function triangles(solid: ShapeHandle, deflection: number) {
  const copy = cad.copy(solid);
  const mesh = cad.tessellate(copy, { linearDeflection: deflection, angularDeflection: 0.5 });
  cad.release(copy);
  const tris: number[][] = [];
  for (let i = 0; i + 2 < mesh.indices.length; i += 3) {
    const t: number[] = [];
    for (let k = 0; k < 3; k += 1) t.push(mesh.positions[mesh.indices[i + k] * 3], mesh.positions[mesh.indices[i + k] * 3 + 1], mesh.positions[mesh.indices[i + k] * 3 + 2]);
    tris.push(t);
  }
  return tris;
}

/** Ray parity along a slightly skewed direction, so the ray does not graze edges. */
export function inside(tris: number[][], p: Vec3) {
  const d = [1, 0.0137, 0.0071];
  let hits = 0;
  for (const t of tris) {
    const e1 = [t[3] - t[0], t[4] - t[1], t[5] - t[2]];
    const e2 = [t[6] - t[0], t[7] - t[1], t[8] - t[2]];
    const h = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
    const a = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2];
    if (Math.abs(a) < 1e-14) continue;
    const f = 1 / a;
    const sv = [p[0] - t[0], p[1] - t[1], p[2] - t[2]];
    const u = f * (sv[0] * h[0] + sv[1] * h[1] + sv[2] * h[2]);
    if (u < 0 || u > 1) continue;
    const q = [sv[1] * e1[2] - sv[2] * e1[1], sv[2] * e1[0] - sv[0] * e1[2], sv[0] * e1[1] - sv[1] * e1[0]];
    const v = f * (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]);
    if (v < 0 || u + v > 1) continue;
    if (f * (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) > 0) hits += 1;
  }
  return hits % 2 === 1;
}

// The long rods of the slow profiles are cut to a few dozen turns: the test looks at the middle, and the
// whole file waits for its slowest test.
