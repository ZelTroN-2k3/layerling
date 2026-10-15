import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as THREE from "three";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import type { CadModifierProfilePart } from "@/lib/cadModifierTypes";
import { cadModifierProfileForShape, cadProfileExpectation } from "@/lib/cadProfileExtrusion";
import { cadProfileSolidMismatch, profileExtrusionSolid } from "@/lib/cadProfileSolid";
import { cadTransformRequiresGeneralTransform } from "@/lib/cadModifierRuntime";
import { createPrismGeometry } from "@/lib/prismGeometry";
import { createBooleanHalfSphereGeometry, createBooleanHollowCylinderGeometry, createBooleanRoundRoofGeometry } from "@/lib/roundBodyGeometry";
import { roundSideCount } from "@/lib/roundSideCount";
import { sphereTessellation } from "@/lib/sphereTessellation";
import { meshYawDegrees } from "@/lib/workplaneShapes";

/*
 * The exact round bodies against the display meshes they replace, built by
 * the display's own builders: the worker's plausibility check lets every one
 * through, also turned, tipped and mirrored, and each is within a chord's
 * height of the mesh. cadRoundShapes.e2e.ts checks their volumes and faces.
 */

type Vec3 = [number, number, number];

function shape(kind: WorkplaneShape["kind"], extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: `test-${kind}`, name: kind, kind, x: 0, z: 0, elevation: 0, size: 20, width: 20, depth: 20, height: 10, rotation: 0, color: "#ff8800", ...extra } as WorkplaneShape;
}

/**
 * geometryMeshForShape in LayerlingEditor.tsx for the round kinds (a copy of
 * its dispatch, which the editor keeps to itself; the builders are the real
 * ones), then bufferGeometryToMeshData's lift onto y = 0.
 */
function localMesh(source: WorkplaneShape) {
  const { width, depth, height } = source;
  let geometry: THREE.BufferGeometry;
  switch (source.kind) {
    case "cylinder":
    case "ellipse":
      geometry = createPrismGeometry(width, height, depth, roundSideCount(source.sides, width, depth), source.segments ?? 1);
      break;
    case "sphere":
      geometry = new THREE.SphereGeometry(1, sphereTessellation(source.steps).widthSegments, sphereTessellation(source.steps).heightSegments);
      geometry.scale(width / 2, height / 2, depth / 2);
      break;
    case "cone":
      geometry = new THREE.CylinderGeometry(source.topRadius ?? 0, source.baseRadius ?? width / 2, height, roundSideCount(source.sides, width, depth));
      geometry.scale(1, 1, depth / Math.max(0.001, width));
      break;
    case "roundRoof":
      geometry = createBooleanRoundRoofGeometry(width, height, depth, source.sides ?? 64);
      break;
    case "halfSphere":
      geometry = createBooleanHalfSphereGeometry(width, height, depth, source.steps ?? 32);
      break;
    case "ring":
    case "tube":
      geometry = createBooleanHollowCylinderGeometry(width, height, depth, source.bevel ?? 4, roundSideCount(source.sides, width, depth));
      break;
    default:
      throw new Error(`no mesh for ${source.kind}`);
  }
  const prepared = geometry.index ? geometry.toNonIndexed() : geometry;
  prepared.computeBoundingBox();
  const minY = prepared.boundingBox?.min.y ?? 0;
  const position = prepared.getAttribute("position");
  const vertices: Vec3[] = [];
  for (let i = 0; i < position.count; i += 1) vertices.push([position.getX(i), position.getY(i) - minY, position.getZ(i)]);
  const faces: Vec3[] = [];
  for (let i = 0; i + 2 < position.count; i += 3) faces.push([i, i + 1, i + 2]);
  return { vertices, faces };
}

/** transformMesh, written out vertex by vertex: turn about the centre with the display yaw, mirror, stand on the elevation. */
function worldMesh(source: WorkplaneShape) {
  const mesh = localMesh(source);
  const centerY = source.height / 2;
  const rotation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(source.rotationX ?? 0),
    THREE.MathUtils.degToRad(meshYawDegrees(source)),
    THREE.MathUtils.degToRad(source.rotationZ ?? 0),
    "XYZ",
  ));
  const mx = source.mirrorX ? -1 : 1;
  const my = source.mirrorY ? -1 : 1;
  const mz = source.mirrorZ ? -1 : 1;
  const vertices = mesh.vertices.map(([x, y, z]) => {
    const v = new THREE.Vector3(x * mx, (y - centerY) * my, z * mz).applyMatrix4(rotation);
    return [v.x + source.x, v.y + (source.elevation ?? 0) + centerY, v.z + source.z] as Vec3;
  });
  return { vertices, faces: mesh.faces };
}

describe("exact round bodies against their display meshes", () => {
  let cad: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    cad = await OcctKernel.init({ wasm });
  });

  /** The body as the worker builds and places it, and what the display mesh expects of it. */
  function body(source: WorkplaneShape) {
    const profile = cadModifierProfileForShape(source);
    expect(profile).not.toBeNull();
    const mesh = worldMesh(source);
    const expected = cadProfileExpectation(mesh.vertices, mesh.faces);
    const part = { ...(profile as CadModifierProfilePart), expected };
    const local = profileExtrusionSolid(cad, part);
    const transform = part.transform;
    const solid = !transform ? local : cadTransformRequiresGeneralTransform(transform) ? cad.generalTransform(local, transform) : cad.transform(local, transform);
    expect(cad.isSolid(solid)).toBe(true);
    expect(cad.isValid(solid)).toBe(true);
    return { solid, expected };
  }

  /**
   * Bounds of the exact body: measured on a fine mesh of a copy - the
   * kernel's own box is loose on turned curved faces - whose vertices lie on
   * the faces, 0.005 mm short of the true box at most.
   */
  function trueBounds(solid: ShapeHandle) {
    const copy = cad.copy(solid);
    const { positions } = cad.tessellate(copy, { linearDeflection: 0.005, angularDeflection: 0.3 });
    cad.release(copy);
    const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (let index = 0; index < positions.length; index += 3) {
      for (let axis = 0; axis < 3; axis += 1) {
        box[axis] = Math.min(box[axis], positions[index + axis]);
        box[axis + 3] = Math.max(box[axis + 3], positions[index + axis]);
      }
    }
    return box;
  }

  const shapes = () => [
    shape("ellipse", { width: 30, depth: 15 }),
    shape("cylinder", { width: 30, depth: 18 }),
    shape("tube", { width: 30, depth: 18, bevel: 3 }),
    shape("ring", { width: 30, depth: 30, height: 5 }),
    shape("roundRoof", { width: 20, depth: 30, height: 12 }),
    shape("halfSphere", { width: 24, depth: 24, height: 9 }),
    shape("halfSphere", { width: 30, depth: 20, height: 10 }),
    shape("sphere", { width: 20, depth: 20, height: 30 }),
    shape("sphere", { width: 30, depth: 20, height: 15 }),
    shape("cone", { width: 30, depth: 15, height: 15, baseRadius: 15, topRadius: 0 }),
    shape("cone", { width: 30, depth: 15, height: 15, baseRadius: 15, topRadius: 4 }),
  ];

  it("agrees with the display mesh, standing as drawn", () => {
    shapes().forEach((source) => {
      const { solid, expected } = body(source);
      expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
      // The display draws curves as chords; the sides follow the size, so 0.005 mm at most.
      trueBounds(solid).forEach((value, index) => expect(Math.abs(value - expected.bounds[index])).toBeLessThan(0.01));
      // The polygon lies inside the curve, so the display's volume is a little
      // less; the kernel's volume of the stretched B-spline bodies runs about 1 % high.
      const ratio = cad.getVolume(solid) / expected.volume;
      expect(ratio).toBeGreaterThan(0.999);
      expect(ratio).toBeLessThan(1.02);
    });
  });

  it("agrees with the display mesh turned, tipped over, mirrored and lifted", () => {
    // (The mirror flips the placement's handedness; isValid in body() checks that the solid stays one.)
    const placement = { x: 12.5, z: -7, elevation: 4, rotation: 33, rotationX: 90, rotationZ: 15, mirrorX: true };
    shapes().forEach((source) => {
      const { solid, expected } = body({ ...source, ...placement });
      // The kernel's own box is several mm too big on the turned half sphere and
      // spheroid (surfaces of revolution); the check measures a mesh then.
      expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
      trueBounds(solid).forEach((value, index) => expect(Math.abs(value - expected.bounds[index])).toBeLessThan(0.05));
    });
  });

  it("builds shapes drawn with few sides as the display's own flat faces", () => {
    [
      shape("cylinder", { sides: 6 }),
      // Turned beyond half a side step (36 degrees for five sides).
      shape("cylinder", { sides: 5, x: 12.5, z: -7, elevation: 4, rotation: 50, rotationX: 90, rotationZ: 15, mirrorX: true }),
      shape("ellipse", { width: 30, depth: 15, sides: 8 }),
      shape("tube", { sides: 8 }),
      shape("ring", { width: 30, depth: 30, height: 5, sides: 12 }),
      shape("roundRoof", { width: 20, depth: 30, height: 10, sides: 4 }),
    ].forEach((source) => {
      const { solid, expected } = body(source);
      const types = cad.getSubShapes(solid, "face").map((face) => cad.surfaceType(face));
      expect(types.every((type) => type === "plane")).toBe(true);
      expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
      // The display mesh is stored in 32-bit floats, good to about 1e-7.
      expect(Math.abs(cad.getVolume(solid) / expected.volume - 1)).toBeLessThan(1e-6);
      trueBounds(solid).forEach((value, index) => expect(Math.abs(value - expected.bounds[index])).toBeLessThan(1e-4));
    });
  });
});
