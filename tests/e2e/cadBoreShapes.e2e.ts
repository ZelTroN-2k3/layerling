import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as THREE from "three";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import { cadModifierProfileForShape, cadProfileExpectation } from "@/lib/cadProfileExtrusion";
import { cadProfileSolidMismatch, profileExtrusionSolid } from "@/lib/cadProfileSolid";
import type { CadModifierProfilePart } from "@/lib/cadModifierTypes";
import { createTeardropGeometry } from "@/lib/teardropGeometry";
import { createScrewHoleGeometry } from "@/lib/screwHoleGeometry";

/*
 * The teardrop and the two screw holes as exact bodies against the real
 * kernel: valid solids with the faces their outline predicts, in the place
 * and turn their display mesh has, and with fillets that work on them.
 */

type Vec3 = [number, number, number];

function shape(kind: WorkplaneShape["kind"], extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: `test-${kind}`, name: kind, kind, x: 0, z: 0, elevation: 0, size: 20, width: 20, depth: 20, height: 10, rotation: 0, color: "#ff8800", ...extra } as WorkplaneShape;
}

function worldMesh(source: WorkplaneShape) {
  const { width, depth, height } = source;
  const geometry = source.kind === "teardrop"
    ? createTeardropGeometry({ width, depth, height })
    : createScrewHoleGeometry({ kind: source.kind as "counterbore" | "countersink", width, depth, height, screwHoleShaft: source.screwHoleShaft, screwHoleHeadDepth: source.screwHoleHeadDepth, screwHoleAngle: source.screwHoleAngle });
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const centerY = height / 2;
  const rotation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(source.rotationX ?? 0), THREE.MathUtils.degToRad(source.rotation ?? 0), THREE.MathUtils.degToRad(source.rotationZ ?? 0), "XYZ"));
  const vertices: Vec3[] = [];
  for (let i = 0; i < position.count; i += 1) {
    const v = new THREE.Vector3(position.getX(i), position.getY(i) - centerY, position.getZ(i)).applyMatrix4(rotation);
    vertices.push([v.x + source.x, v.y + (source.elevation ?? 0) + centerY, v.z + source.z]);
  }
  const faces: Vec3[] = [];
  const count = index ? index.count : position.count;
  for (let i = 0; i < count; i += 3) faces.push(index ? [index.getX(i), index.getX(i + 1), index.getX(i + 2)] : [i, i + 1, i + 2]);
  return { vertices, faces };
}

describe("exact bodies for the bore shapes with the real OCCT kernel", () => {
  let cad: OcctKernel;
  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    cad = await OcctKernel.init({ wasm });
  });

  function exact(source: WorkplaneShape) {
    const part = cadModifierProfileForShape(source);
    expect(part).not.toBeNull();
    const mesh = worldMesh(source);
    const profile = { ...(part as CadModifierProfilePart), expected: cadProfileExpectation(mesh.vertices, mesh.faces) };
    const local = profileExtrusionSolid(cad, profile);
    const solid = profile.transform ? cad.transform(local, profile.transform) : local;
    expect(cad.isSolid(solid)).toBe(true);
    expect(cad.isValid(solid)).toBe(true);
    expect(cadProfileSolidMismatch(cad, solid, profile.expected)).toBeNull();
    return { solid, mesh, profile };
  }

  const surfaceTypes = (solid: ShapeHandle) => {
    const faces = cad.getSubShapes(solid, "face");
    const types = faces.map((face) => cad.surfaceType(face));
    faces.forEach((face) => cad.release(face));
    return types.sort();
  };

  it("teardrop: a round part and two flanks, laid along the depth with the point up", () => {
    const source = shape("teardrop", { x: 5, z: -3, elevation: 4, width: 6, depth: 20, height: 3 + 3 * Math.SQRT2 });
    const { solid, mesh } = exact(source);
    // round part, two flanks, two end caps
    expect(cad.subShapeCount(solid, "face")).toBe(5);
    expect(surfaceTypes(solid)).toEqual(["cylinder", "plane", "plane", "plane", "plane"]);
    const box = cad.getBoundingBox(solid);
    expect(box.xmin).toBeCloseTo(2, 3);
    expect(box.xmax).toBeCloseTo(8, 3);
    expect(box.ymin).toBeCloseTo(4, 3);
    expect(box.ymax).toBeCloseTo(4 + 3 + 3 * Math.SQRT2, 3);
    expect(box.zmin).toBeCloseTo(-13, 3);
    expect(box.zmax).toBeCloseTo(7, 3);
    const radius = 3;
    const rise = radius * Math.SQRT2;
    const area = Math.PI * radius * radius * (1 - Math.acos(radius / rise) / Math.PI) + radius * Math.sqrt(rise * rise - radius * radius);
    expect(cad.getVolume(solid)).toBeCloseTo(area * 20, 2);
    const meshVolume = cadProfileExpectation(mesh.vertices, mesh.faces).volume;
    expect(Math.abs(cad.getVolume(solid) - meshVolume) / meshVolume).toBeLessThan(0.02);
  });

  it("teardrop: follows the turn of the shape like its display mesh", () => {
    const { solid } = exact(shape("teardrop", { width: 6, depth: 20, height: 3 + 3 * Math.SQRT2, rotation: 30, rotationX: 15 }));
    expect(cad.isValid(solid)).toBe(true);
  });

  it("teardrop: takes a fillet on the end edges", () => {
    const { solid } = exact(shape("teardrop", { width: 6, depth: 20, height: 3 + 3 * Math.SQRT2 }));
    const edges = cad.getSubShapes(solid, "edge").filter((edge) => {
      const box = cad.getBoundingBox(edge);
      return Math.abs(box.zmin - box.zmax) < 1e-6 && Math.abs(Math.abs(box.zmin) - 10) < 1e-6;
    });
    expect(edges.length).toBeGreaterThan(0);
    const filleted = cad.fillet(solid, edges, 0.5);
    expect(cad.isValid(filleted)).toBe(true);
    expect(cad.getVolume(filleted)).toBeLessThan(cad.getVolume(solid));
  });

  it("teardrop: with no room for a tip it stays a mesh", () => {
    expect(cadModifierProfileForShape(shape("teardrop", { width: 6, depth: 20, height: 4 }))).toBeNull();
  });

  it("counterbore: five faces, plane and cylinder only, head end on top", () => {
    const source = shape("counterbore", { x: 2, z: 1, elevation: 3, width: 6.4, depth: 6.4, height: 12, screwHoleShaft: 3.4, screwHoleHeadDepth: 3.2 });
    const { solid } = exact(source);
    expect(cad.subShapeCount(solid, "face")).toBe(5);
    expect(surfaceTypes(solid)).toEqual(["cylinder", "cylinder", "plane", "plane", "plane"]);
    const box = cad.getBoundingBox(solid);
    expect(box.ymin).toBeCloseTo(3, 4);
    expect(box.ymax).toBeCloseTo(15, 4);
    expect(box.xmax - box.xmin).toBeCloseTo(6.4, 3);
    const exactVolume = Math.PI * 1.7 ** 2 * 8.8 + Math.PI * 3.2 ** 2 * 3.2;
    expect(cad.getVolume(solid)).toBeCloseTo(exactVolume, 2);
  });

  it("countersink: four faces with a real cone, and a chamfer works on its rim", () => {
    const source = shape("countersink", { width: 6.6, depth: 6.6, height: 8, screwHoleShaft: 3.4, screwHoleAngle: 90 });
    const { solid } = exact(source);
    expect(cad.subShapeCount(solid, "face")).toBe(4);
    expect(surfaceTypes(solid)).toEqual(["cone", "cylinder", "plane", "plane"]);
    const cone = (Math.PI * 1.6 / 3) * (1.7 ** 2 + 1.7 * 3.3 + 3.3 ** 2);
    expect(cad.getVolume(solid)).toBeCloseTo(Math.PI * 1.7 ** 2 * 6.4 + cone, 2);
    const rim = cad.getSubShapes(solid, "edge").filter((edge) => {
      const box = cad.getBoundingBox(edge);
      return Math.abs(box.ymin - 8) < 1e-6 && Math.abs(box.ymax - 8) < 1e-6;
    });
    expect(rim.length).toBeGreaterThan(0);
    const chamfered = cad.chamfer(solid, rim, 0.3);
    expect(cad.isValid(chamfered)).toBe(true);
  });

  it("screw holes: an oval footprint keeps the display mesh", () => {
    expect(cadModifierProfileForShape(shape("counterbore", { width: 6.4, depth: 9, height: 12 }))).toBeNull();
  });
});
