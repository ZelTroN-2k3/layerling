import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as THREE from "three";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import { cadModifierProfileForShape, cadProfileExpectation, closedMeshVolume } from "@/lib/cadProfileExtrusion";
import { cadProfileSolidMismatch, profileExtrusionSolid } from "@/lib/cadProfileSolid";
import type { CadModifierProfilePart } from "@/lib/cadModifierTypes";
import { createLoftGeometry, loftFrameSize, loftStoredMeasures } from "@/lib/loftGeometry";

/*
 * The transition (#188) as an exact body against the real kernel: a valid solid in the place
 * its display mesh has, with the volume a frustum has where one is known, open at both ends
 * with a wall, and with edges the edge tool can round.
 */

type Vec3 = [number, number, number];

function loft(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  const base = {
    id: "test-loft", name: "loft", kind: "loft", x: 0, z: 0, elevation: 0, size: 40, height: 30, rotation: 0, color: "#c0703a",
    loftBottomOutline: "rectangle", loftTopOutline: "round", loftBottomWidth: 40, loftBottomDepth: 40, loftTopWidth: 30, loftTopDepth: 30,
    loftBottomCorner: 0, loftTopCorner: 0, loftOffsetX: 0, loftOffsetZ: 0, loftWall: 0,
    ...extra,
  } as WorkplaneShape;
  const frame = loftFrameSize(loftStoredMeasures(base));
  return { ...base, width: frame.width, depth: frame.depth };
}

function worldMesh(source: WorkplaneShape) {
  const geometry = createLoftGeometry(source);
  const position = geometry.getAttribute("position");
  const centerY = source.height / 2;
  const rotation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(source.rotationX ?? 0), THREE.MathUtils.degToRad(source.rotation ?? 0), THREE.MathUtils.degToRad(source.rotationZ ?? 0), "XYZ"));
  const vertices: Vec3[] = [];
  for (let i = 0; i < position.count; i += 1) {
    const v = new THREE.Vector3(position.getX(i), position.getY(i) - centerY, position.getZ(i)).applyMatrix4(rotation);
    vertices.push([v.x + source.x, v.y + (source.elevation ?? 0) + centerY, v.z + source.z]);
  }
  const faces: Vec3[] = [];
  for (let i = 0; i < position.count; i += 3) faces.push([i, i + 1, i + 2]);
  return { vertices, faces };
}

const frustum = (h: number, a: number, b: number) => (h / 3) * (a + b + Math.sqrt(a * b));

describe("exact bodies for the transition with the real OCCT kernel", () => {
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
    return { solid, mesh };
  }

  const edgesAtHeight = (solid: ShapeHandle, y: number) => cad.getSubShapes(solid, "edge").filter((edge) => {
    const box = cad.getBoundingBox(edge);
    return Math.abs(box.ymin - y) < 1e-6 && Math.abs(box.ymax - y) < 1e-6;
  });

  it("square to circle: a valid solid where the display mesh is, as big as the mesh says", () => {
    const source = loft({ x: 7, z: -4, elevation: 2 });
    const { solid, mesh } = exact(source);
    const box = cad.getBoundingBox(solid);
    expect(box.xmin).toBeCloseTo(-13, 3);
    expect(box.xmax).toBeCloseTo(27, 3);
    expect(box.ymin).toBeCloseTo(2, 4);
    expect(box.ymax).toBeCloseTo(32, 4);
    const meshVolume = closedMeshVolume(mesh.vertices, mesh.faces);
    expect(Math.abs(cad.getVolume(solid) - meshVolume) / meshVolume).toBeLessThan(0.01);
    // Four flat-sided corners above the square's corners, the circle's quarters above the sides.
    expect(edgesAtHeight(solid, 32).length).toBeGreaterThanOrEqual(4);
  });

  it("two squares: a frustum with flat sides and its exact volume", () => {
    const source = loft({ loftTopOutline: "rectangle", loftTopWidth: 20, loftTopDepth: 20 });
    const { solid } = exact(source);
    expect(cad.getVolume(solid)).toBeCloseTo(frustum(30, 1600, 400), 2);
    const faces = cad.getSubShapes(solid, "face");
    expect(faces.every((face) => cad.surfaceType(face) === "plane")).toBe(true);
  });

  it("hose adapter: two circles with a wall are a tube open at both ends, a cone frustum less its bore", () => {
    const source = loft({ loftBottomOutline: "round", loftTopOutline: "round", loftBottomWidth: 30, loftBottomDepth: 30, loftTopWidth: 20, loftTopDepth: 20, loftWall: 2 });
    const { solid } = exact(source);
    const outer = frustum(30, Math.PI * 15 ** 2, Math.PI * 10 ** 2);
    const inner = frustum(30, Math.PI * 13 ** 2, Math.PI * 8 ** 2);
    expect(cad.getVolume(solid)).toBeCloseTo(outer - inner, 1);
    // Open: the top is a ring, its edges an outer and an inner circle (each in pieces).
    const top = edgesAtHeight(solid, 30);
    const radii = top.map((edge) => {
      const box = cad.getBoundingBox(edge);
      return Math.max(Math.abs(box.xmin), Math.abs(box.xmax), Math.abs(box.zmin), Math.abs(box.zmax));
    });
    expect(Math.min(...radii)).toBeCloseTo(8, 3);
    expect(Math.max(...radii)).toBeCloseTo(10, 3);
  });

  it("fan onto duct: a rounded square, moved sideways to a polygon, with a wall, turned on the plate", () => {
    const source = loft({
      loftBottomCorner: 4, loftTopOutline: "polygon", loftTopSides: 8, loftTopWidth: 24, loftTopDepth: 24,
      loftOffsetX: 6, loftOffsetZ: -3, loftWall: 1.6, rotation: 30, x: 3, z: 5,
    });
    exact(source);
  });

  // #205: the sections turn and tilt evenly on the way up; the body follows the same sections as the mesh.
  it("twisted square to circle: where the mesh is, its height kept", () => {
    const source = loft({ loftTwist: 90 });
    const { solid, mesh } = exact(source);
    const box = cad.getBoundingBox(solid);
    expect(box.ymin).toBeCloseTo(0, 4);
    expect(box.ymax).toBeCloseTo(30, 4);
    const meshVolume = closedMeshVolume(mesh.vertices, mesh.faces);
    expect(Math.abs(cad.getVolume(solid) - meshVolume) / meshVolume).toBeLessThan(0.01);
  });

  it("a twist keeps every slice: two equal squares turned are as big as the straight prism", () => {
    const source = loft({ loftTopOutline: "rectangle", loftTopWidth: 40, loftTopDepth: 40, loftTwist: 120 });
    const { solid } = exact(source);
    expect(Math.abs(cad.getVolume(solid) - 40 * 40 * 30) / (40 * 40 * 30)).toBeLessThan(0.005);
  });

  it("tilted top: its highest point at the frame's height, the body where the mesh is", () => {
    const source = loft({ loftTopOutline: "rectangle", loftTopWidth: 24, loftTopDepth: 20, loftOffsetX: 4, loftTiltX: 20, loftTiltZ: -15, elevation: 3 });
    const { solid, mesh } = exact(source);
    const box = cad.getBoundingBox(solid);
    expect(box.ymin).toBeCloseTo(3, 3);
    expect(box.ymax).toBeCloseTo(33, 2);
    const meshVolume = closedMeshVolume(mesh.vertices, mesh.faces);
    expect(Math.abs(cad.getVolume(solid) - meshVolume) / meshVolume).toBeLessThan(0.01);
  });

  it("twisted and tilted with a wall, turned on the plate: one valid tube", () => {
    const source = loft({ loftTwist: -135, loftTiltX: 25, loftWall: 2, loftBottomCorner: 4, rotation: 30, x: 5, z: -2 });
    exact(source);
  });

  it("takes a fillet on a twisted loft's top rim", () => {
    const { solid } = exact(loft({ loftTwist: 60 }));
    const rim = edgesAtHeight(solid, 30);
    expect(rim.length).toBeGreaterThan(0);
    const rounded = cad.fillet(solid, rim, 0.8);
    expect(cad.isValid(rounded)).toBe(true);
  });

  it("takes a fillet on its top rim", () => {
    const { solid } = exact(loft({}));
    const rim = edgesAtHeight(solid, 30);
    expect(rim.length).toBeGreaterThan(0);
    const rounded = cad.fillet(solid, rim, 1);
    expect(cad.isValid(rounded)).toBe(true);
    expect(cad.getVolume(rounded)).toBeLessThan(cad.getVolume(solid));
  });

  // #271: a smooth transition follows an S-curve between the ends; the body is built through sections along the same curve.
  it("smooth hose adapter: a tube along the S-curve, as big as the integral says and where the mesh is", () => {
    const source = loft({ loftBottomOutline: "round", loftTopOutline: "round", loftBottomWidth: 25, loftBottomDepth: 25, loftTopWidth: 50, loftTopDepth: 50, height: 40, loftWall: 2, loftSmooth: 1 });
    const { solid } = exact(source);
    // The ring between the outer radius r(t) and the opening r(t) - 2, integrated along the S-curve.
    const outerRadius = (t: number) => 12.5 + (25 - 12.5) * (t * t * (3 - 2 * t));
    let volume = 0;
    const steps = 2000;
    for (let step = 0; step < steps; step += 1) {
      const r = outerRadius((step + 0.5) / steps);
      volume += Math.PI * (r * r - (r - 2) * (r - 2)) * (40 / steps);
    }
    expect(Math.abs(cad.getVolume(solid) - volume) / volume).toBeLessThan(0.01);
    const box = cad.getBoundingBox(solid);
    expect(box.ymin).toBeCloseTo(0, 4);
    expect(box.ymax).toBeCloseTo(40, 4);
    expect(box.xmax).toBeCloseTo(25, 2);
  });

  it("smooth 0 is the straight transition, exactly the cone frustum as before", () => {
    const source = loft({ loftBottomOutline: "round", loftTopOutline: "round", loftBottomWidth: 30, loftBottomDepth: 30, loftTopWidth: 20, loftTopDepth: 20, loftWall: 2, loftSmooth: 0 });
    const { solid } = exact(source);
    const outer = frustum(30, Math.PI * 15 ** 2, Math.PI * 10 ** 2);
    const inner = frustum(30, Math.PI * 13 ** 2, Math.PI * 8 ** 2);
    expect(cad.getVolume(solid)).toBeCloseTo(outer - inner, 1);
  });

  it("smooth square to circle with the top moved sideways is a valid solid where the mesh is", () => {
    exact(loft({ loftSmooth: 0.7, loftOffsetX: 8, loftOffsetZ: -4 }));
  });
});
