import { describe, expect, it } from "vitest";
import * as THREE from "three";
import type { WorkplaneShape } from "@/types/layerling";
import { cadTransformToMatrix, importedStepPartForShape } from "@/lib/cadBakeMetadata";
import { meshYawDegrees, mirrorSign, resizedImportedMeshPositions } from "@/lib/workplaneShapes";

// A STEP import as stepImport.ts leaves it: a 40 x 6 x 30 body, centred in x and z, its bottom at y = 0.
const corners = [-20, 0, -15, 20, 0, -15, 20, 6, 15, -20, 6, 15, 7, 3, -4];
function stepImport(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "step-1", name: "part", kind: "mesh", color: "#0098c7",
    x: 10, z: -10, size: 40, width: 40, depth: 30, height: 6, rotation: 0, rotationX: 0, rotationZ: 0,
    importedMesh: { positions: corners, baseWidth: 40, baseDepth: 30, baseHeight: 6, triangleCount: 1, sourceFormat: "step", brepStep: "ISO-10303-21; ..." },
    ...extra,
  } as WorkplaneShape;
}

/** Where transformMesh puts the import's points (no taper, twist or lean). */
function displayPoints(shape: WorkplaneShape) {
  const positions = resizedImportedMeshPositions(shape);
  const centerY = shape.height / 2;
  const rotation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(shape.rotationX ?? 0), THREE.MathUtils.degToRad(meshYawDegrees(shape)), THREE.MathUtils.degToRad(shape.rotationZ ?? 0), "XYZ"));
  const points: THREE.Vector3[] = [];
  for (let i = 0; i + 2 < positions.length; i += 3) {
    const v = new THREE.Vector3(positions[i] * mirrorSign(shape.mirrorX), (positions[i + 1] - centerY) * mirrorSign(shape.mirrorY), positions[i + 2] * mirrorSign(shape.mirrorZ)).applyMatrix4(rotation);
    points.push(v.add(new THREE.Vector3(shape.x, (shape.elevation ?? 0) + centerY, shape.z)));
  }
  return points;
}

describe("a STEP import's own body for the edge tool", () => {
  it.each([
    ["as imported", {}],
    ["turned, tipped and rolled, lifted and moved", { rotation: 25, rotationX: 70, rotationZ: -30, elevation: 4, x: -3, z: 8 }],
    ["mirrored and turned", { mirrorX: true, mirrorY: true, mirrorZ: true, rotation: 110 }],
    ["resized unevenly", { width: 55, depth: 12, height: 9, size: 55 }],
  ] as Array<[string, Partial<WorkplaneShape>]>)("moves the stored body exactly as the display moves the mesh: %s", (_name, change) => {
    const shape = stepImport(change);
    const part = importedStepPartForShape(shape);
    expect(part?.step).toBe("ISO-10303-21; ...");
    const matrix = cadTransformToMatrix(part?.brepTransform);
    const display = displayPoints(shape);
    // The stored body sits where the import's own points were before any change.
    for (let i = 0; i < display.length; i += 1) {
      const stored = new THREE.Vector3(corners[i * 3], corners[i * 3 + 1], corners[i * 3 + 2]).applyMatrix4(matrix);
      expect(stored.distanceTo(display[i])).toBeLessThan(1e-9);
    }
  });

  it("keeps the mesh for an import without a STEP body, a treated one, a deformed one, or a group", () => {
    const plain = stepImport();
    expect(importedStepPartForShape({ ...plain, importedMesh: { ...plain.importedMesh!, brepStep: undefined, sourceFormat: "stl" } })).toBeNull();
    expect(importedStepPartForShape({ ...plain, cadBrep: "DBRep_DrawableShape ..." })).toBeNull();
    expect(importedStepPartForShape({ ...plain, taperTopWidth: 20 })).toBeNull();
    expect(importedStepPartForShape({ ...plain, extrudeTwist: 15 })).toBeNull();
    expect(importedStepPartForShape({ ...plain, extrudeTopOffsetZ: 3 })).toBeNull();
    expect(importedStepPartForShape({ ...plain, groupedShapes: [plain] })).toBeNull();
    expect(importedStepPartForShape({ ...plain, kind: "box" })).toBeNull();
  });

  it("keeps the mesh when a resize holds treated edges at their size: no transform does that", () => {
    const shape = stepImport({ width: 60, edgeResizeMode: "preserve", edgeTreatments: [{ kind: "fillet", amount: 1, edgeCount: 4 }] });
    expect(importedStepPartForShape(shape)).toBeNull();
  });
});
