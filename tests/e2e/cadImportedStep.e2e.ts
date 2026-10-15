import { beforeAll, describe, expect, it, vi } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as THREE from "three";
import type { OcctKernel, ShapeHandle } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import { importedStepPartForShape } from "@/lib/cadBakeMetadata";
import { importedStepBody } from "@/lib/cadImportedStep";
import { cadProfileExpectation } from "@/lib/cadProfileExtrusion";
import { cadProfileSolidMismatch } from "@/lib/cadProfileSolid";
import { cadTransformRequiresGeneralTransform } from "@/lib/cadModifierRuntime";
import { meshYawDegrees, mirrorSign, resizedImportedMeshPositions } from "@/lib/workplaneShapes";

/*
 * A STEP import keeps its exact body; the edge tool now builds on it instead
 * of the import's triangles. The real importer runs (stepImport.ts, with the
 * kernel loaded from node_modules as in stepRoundTrip.e2e.ts), and the body is
 * held against the display mesh: resizedImportedMeshPositions and the
 * placement transformMesh gives an undeformed shape, copied here as
 * LayerlingEditor.tsx keeps it to itself.
 */

vi.mock("@/lib/brepKernel", async () => {
  const brep = await import("brepjs");
  const { OcctKernel } = await import("occt-wasm");
  const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
  let ready: Promise<typeof brep> | null = null;
  let raw: Awaited<ReturnType<typeof OcctKernel.init>> | null = null;
  return {
    occtKernel: () => raw,
    loadBrepWithOcct: () =>
      (ready ??= (async () => {
        const kernel = await OcctKernel.init({ wasm });
        raw = kernel;
        brep.registerKernel("occt-wasm", brep.OcctWasmAdapter.fromKernel(kernel));
        return brep;
      })()),
  };
});

type Vec3 = [number, number, number];

let cad: OcctKernel;
let importedShapeFromStep: typeof import("@/lib/stepImport").importedShapeFromStep;
let stepText: string;

/**
 * A part that shows a wrong placement: a 40 x 30 x 6 plate (CAD Z up) with
 * four holes, and one boss off in a corner, so a missing mirror or a turn the
 * wrong way moves its centre of mass even where its box stays put.
 */
function testPart() {
  let part = cad.makeBox(40, 30, 6);
  for (const [x, y] of [[8, 8], [32, 8], [8, 22], [32, 22]]) {
    part = cad.cut(part, cad.translate(cad.makeCylinder(2, 20), x, y, -5));
  }
  part = cad.fuse(part, cad.translate(cad.makeCylinder(4, 14), 24, 12, 0));
  return cad.unifySameDomain(part);
}

beforeAll(async () => {
  ({ importedShapeFromStep } = await import("@/lib/stepImport"));
  const { loadBrepWithOcct, occtKernel } = await import("@/lib/brepKernel");
  await loadBrepWithOcct();
  cad = occtKernel() as OcctKernel;
  stepText = cad.exportStep(testPart());
});

async function imported(overrides: Partial<WorkplaneShape> = {}): Promise<WorkplaneShape> {
  const shape = await importedShapeFromStep("part.step", new TextEncoder().encode(stepText).buffer as ArrayBuffer);
  return { ...shape, ...overrides };
}

/** The display mesh: the import's triangles resized, then mirrored, turned and placed as transformMesh does. */
function displayMesh(shape: WorkplaneShape) {
  const positions = resizedImportedMeshPositions(shape);
  const centerY = shape.height / 2;
  const matrix = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(shape.rotationX ?? 0), THREE.MathUtils.degToRad(meshYawDegrees(shape)), THREE.MathUtils.degToRad(shape.rotationZ ?? 0), "XYZ"));
  const vertices: Vec3[] = [];
  for (let i = 0; i + 2 < positions.length; i += 3) {
    const v = new THREE.Vector3(positions[i] * mirrorSign(shape.mirrorX), (positions[i + 1] - centerY) * mirrorSign(shape.mirrorY), positions[i + 2] * mirrorSign(shape.mirrorZ)).applyMatrix4(matrix);
    vertices.push([v.x + shape.x, v.y + (shape.elevation ?? 0) + centerY, v.z + shape.z]);
  }
  // A mirror turns the triangles inside out; transformMesh flips their winding back.
  const flip = [shape.mirrorX, shape.mirrorY, shape.mirrorZ].filter(Boolean).length % 2 === 1;
  const faces: Vec3[] = [];
  for (let i = 0; i + 2 < vertices.length; i += 3) faces.push(flip ? [i, i + 2, i + 1] : [i, i + 1, i + 2]);
  return { vertices, faces };
}

/** The volume-weighted centre of a closed triangle mesh. */
function meshCentroid({ vertices, faces }: ReturnType<typeof displayMesh>): Vec3 {
  let volume = 0;
  const sum: Vec3 = [0, 0, 0];
  faces.forEach(([a, b, c]) => {
    const [p, q, r] = [vertices[a], vertices[b], vertices[c]];
    const v = (p[0] * (q[1] * r[2] - q[2] * r[1]) - p[1] * (q[0] * r[2] - q[2] * r[0]) + p[2] * (q[0] * r[1] - q[1] * r[0])) / 6;
    volume += v;
    for (let k = 0; k < 3; k += 1) sum[k] += v * (p[k] + q[k] + r[k]) / 4;
  });
  return sum.map((value) => value / volume) as Vec3;
}

function place(shape: WorkplaneShape): ShapeHandle {
  const part = importedStepPartForShape(shape);
  expect(part).not.toBeNull();
  const body = importedStepBody(cad, (part as { step: string }).step);
  const t = part?.brepTransform;
  return !t ? body : cadTransformRequiresGeneralTransform(t) ? cad.generalTransform(body, t) : cad.transform(body, t);
}

function trueBounds(solid: ShapeHandle) {
  const copy = cad.copy(solid);
  const { positions } = cad.tessellate(copy, { linearDeflection: 0.005, angularDeflection: 0.2 });
  cad.release(copy);
  const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) for (let a = 0; a < 3; a += 1) { box[a] = Math.min(box[a], positions[i + a]); box[a + 3] = Math.max(box[a + 3], positions[i + a]); }
  return box;
}

function surfaceKinds(solid: ShapeHandle) {
  return cad.getSubShapes(solid, "face").map((face) => cad.surfaceType(face)).sort();
}

describe("STEP imports keep their exact body for the edge tool", () => {
  const placements: Array<[string, Partial<WorkplaneShape>, boolean]> = [
    // [name, change after import, faces stay analytic (anything but an uneven stretch)]
    ["as imported", {}, true],
    ["turned", { rotation: 30 }, true],
    ["tipped onto its side and lifted", { rotationX: 90, elevation: 5 }, true],
    ["turned about all three axes and moved", { rotationX: 15, rotation: 20, rotationZ: 45, x: -40, z: 25 }, true],
    ["mirrored", { mirrorX: true }, true],
    ["mirrored twice and turned", { mirrorX: true, mirrorZ: true, rotation: 60 }, true],
    ["scaled up evenly", { width: 80, depth: 60, height: 28 }, true],
    ["stretched in width only", { width: 60 }, false],
  ];

  it.each(placements)("places the body where the display mesh is: %s", async (_name, change, analytic) => {
    const source = await imported();
    const shape = { ...source, ...change } as WorkplaneShape;
    const solid = place(shape);
    expect(cad.isValid(solid)).toBe(true);
    const mesh = displayMesh(shape);
    const expected = cadProfileExpectation(mesh.vertices, mesh.faces);
    // The worker's own check passes.
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    // Closer than that check asks: the box to a tenth, the volume to a percent
    // (the display's holes and boss are polygons inside the true circles).
    trueBounds(solid).forEach((value, index) => expect(Math.abs(value - expected.bounds[index])).toBeLessThan(0.1));
    expect(Math.abs(cad.getVolume(solid) - expected.volume) / expected.volume).toBeLessThan(0.01);
    // Box and volume cannot see a mirror; the centre of mass, off-centre because of the boss, can.
    const centre = cad.getCenterOfMass(solid);
    const displayCentre = meshCentroid(mesh);
    expect(Math.hypot(centre.x - displayCentre[0], centre.y - displayCentre[1], centre.z - displayCentre[2])).toBeLessThan(0.05);
    // A turn, mirror or even scale keeps every face what it was: planes and
    // cylinders. An uneven stretch needs the kernel's general transform, which
    // makes every face a spline - as for any stored body stretched that way.
    if (analytic) expect(surfaceKinds(solid)).toEqual(surfaceKinds(importedStepBody(cad, stepText)));
    else expect([...new Set(surfaceKinds(solid))]).toEqual(["bspline"]);
  });

  it("takes a fillet and a chamfer on the placed body", async () => {
    const solid = place(await imported({ rotation: 30, rotationX: 10 }));
    const edges = cad.getSubShapes(solid, "edge");
    // The plate's straight edges: lines of its flat faces (a cylinder's seam is a line too, but of no flat face).
    const lines = cad.getSubShapes(solid, "face")
      .filter((face) => cad.surfaceType(face) === "plane")
      .flatMap((face) => cad.getSubShapes(face, "edge"))
      .filter((edge) => cad.curveType(edge) === "line");
    const filleted = cad.fillet(solid, lines, 1);
    expect(cad.isValid(filleted)).toBe(true);
    expect(cad.getVolume(filleted)).toBeLessThan(cad.getVolume(solid));
    const circles = edges.filter((edge) => cad.curveType(edge) === "circle" && Math.abs(cad.getBoundingBox(edge).xmax - cad.getBoundingBox(edge).xmin) < 4.5);
    const chamfered = cad.chamfer(solid, circles, 0.5);
    expect(cad.isValid(chamfered)).toBe(true);
  });

  it("would be caught by the worker's check if placed wrong: the resize forgotten", async () => {
    const shape = await imported({ width: 60, rotation: 30 });
    const wrong = place({ ...shape, width: 40 });
    const mesh = displayMesh(shape);
    expect(cadProfileSolidMismatch(cad, wrong, cadProfileExpectation(mesh.vertices, mesh.faces))).not.toBeNull();
  });

  it("leaves everything else to the display mesh", async () => {
    const source = await imported();
    expect(importedStepPartForShape(source)).not.toBeNull();
    // An STL or OBJ brings no STEP.
    expect(importedStepPartForShape({ ...source, importedMesh: { ...source.importedMesh!, brepStep: undefined } })).toBeNull();
    // Once its edges were treated, the body is the stored BREP, not the import any more.
    expect(importedStepPartForShape({ ...source, cadBrep: "stored" })).toBeNull();
    // A taper, twist or lean bends the mesh in ways no transform does.
    expect(importedStepPartForShape({ ...source, taperTopWidth: 10 })).toBeNull();
    expect(importedStepPartForShape({ ...source, extrudeTwist: 20 })).toBeNull();
    expect(importedStepPartForShape({ ...source, extrudeTopOffsetX: 4 })).toBeNull();
  });
});
