import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as THREE from "three";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import { cadModifierSpringForShape, cadProfileExpectation } from "@/lib/cadProfileExtrusion";
import { cadProfileSolidMismatch } from "@/lib/cadProfileSolid";
import { cadTransformRequiresGeneralTransform } from "@/lib/cadModifierRuntime";
import { springPartSolid } from "@/lib/springSolid";
import { createSpringGeometry, springBuildPlan, springRingSegments, MIN_SPRING_QUALITY } from "@/lib/springGeometry";
import { meshYawDegrees, mirrorSign } from "@/lib/workplaneShapes";

/*
 * The spring's exact body against its display mesh, built by the real
 * createSpringGeometry and placed as transformMesh places it (copied here,
 * as LayerlingEditor.tsx keeps it to itself; springs take no taper, twist or
 * lean). Bounds and volume cannot tell a left-hand coil from a right-hand
 * one, or a coil of the wrong pitch, so points just inside and just outside
 * the wire, all along it, are also tested against the body.
 *
 * The drawn wire is a polygon inside the round one (`springRingSegments`
 * corners) along chords of the coil, so the mesh holds less than the body:
 * 1.6 % at the default quality, 13.5 % at the lowest, of which the polygon
 * section is 1.1 % and 10 %. The volume is checked against the round wire
 * (pi r^2 times the helix length), and the mesh against that less its
 * polygon's share.
 */

type Vec3 = [number, number, number];

let cad: OcctKernel;

beforeAll(async () => {
  const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
  cad = await OcctKernel.init({ wasm });
});

function spring(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "s", name: "Spring", kind: "spring", color: "#18b99a", x: 0, z: 0, elevation: 0, rotation: 0,
    width: 20, depth: 20, size: 20, height: 30, springTurns: 6, springWire: 3, springQuality: 36,
    ...extra,
  } as WorkplaneShape;
}

/** Shape-local (y up, bottom at y = 0, unstretched) to world, as transformMesh places the mesh. */
function placer(shape: WorkplaneShape) {
  const plan = springBuildPlan({ ...shape, width: shape.width, depth: shape.depth ?? shape.width, height: shape.height });
  const centerY = shape.height / 2;
  const rotation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(shape.rotationX ?? 0), THREE.MathUtils.degToRad(meshYawDegrees(shape)), THREE.MathUtils.degToRad(shape.rotationZ ?? 0), "XYZ"));
  const mirror = new THREE.Vector3(mirrorSign(shape.mirrorX), mirrorSign(shape.mirrorY), mirrorSign(shape.mirrorZ));
  return (x: number, y: number, z: number, stretched = false): Vec3 => {
    const sx = stretched ? 1 : plan.scaleX;
    const sz = stretched ? 1 : plan.scaleZ;
    const v = new THREE.Vector3(x * sx * mirror.x, (y - centerY) * mirror.y, z * sz * mirror.z).applyMatrix4(rotation);
    return [v.x + shape.x, v.y + (shape.elevation ?? 0) + centerY, v.z + shape.z];
  };
}

/** The display mesh in world space. */
function displayMesh(shape: WorkplaneShape) {
  const geometry = createSpringGeometry({ ...shape, width: shape.width, depth: shape.depth ?? shape.width, height: shape.height });
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = flat.getAttribute("position");
  const place = placer(shape);
  const vertices: Vec3[] = [];
  for (let i = 0; i < position.count; i += 1) vertices.push(place(position.getX(i), position.getY(i), position.getZ(i), true));
  const faces: Vec3[] = [];
  const flip = [shape.mirrorX, shape.mirrorY, shape.mirrorZ].filter(Boolean).length % 2 === 1;
  for (let i = 0; i + 2 < vertices.length; i += 3) faces.push(flip ? [i, i + 2, i + 1] : [i, i + 1, i + 2]);
  return { vertices, faces };
}

/** What the editor hands the worker to check the body against: the mesh's bounds, and its volume taken up by its polygon wire's share. */
function expectation(shape: WorkplaneShape) {
  const mesh = displayMesh(shape);
  const drawn = cadProfileExpectation(mesh.vertices, mesh.faces);
  return { drawn, expected: { bounds: drawn.bounds, volume: drawn.volume / cadModifierSpringForShape(shape)!.meshSectionShare } };
}

function body(shape: WorkplaneShape) {
  const part = cadModifierSpringForShape(shape);
  expect(part).not.toBeNull();
  const local = springPartSolid(cad, part!);
  const t = part!.transform;
  return !t ? local : cadTransformRequiresGeneralTransform(t) ? cad.generalTransform(local, t) : cad.transform(local, t);
}

/** The round wire's volume: its section times the centre line's length, stretched with the footprint. */
function roundWireVolume(shape: WorkplaneShape) {
  const plan = springBuildPlan({ ...shape, width: shape.width, depth: shape.depth ?? shape.width, height: shape.height });
  const length = Math.hypot(plan.coilRadius * plan.twist, plan.span);
  return Math.PI * plan.wireRadius ** 2 * length * plan.scaleX * plan.scaleZ;
}

/**
 * Points along the wire, `share` of its radius off the centre line, across
 * the wire in four directions: inwards, outwards, and both ways along the
 * wire's own up direction (square to the wire, as the drawn rings are).
 */
function wirePoints(shape: WorkplaneShape, share: number, count: number) {
  const plan = springBuildPlan({ ...shape, width: shape.width, depth: shape.depth ?? shape.width, height: shape.height });
  const place = placer(shape);
  const { coilRadius: radius, wireRadius, twist, span, bottom, zSign } = plan;
  const points: Vec3[] = [];
  for (let k = 0; k < count; k += 1) {
    // Short of both ends, where the square cut leaves less wire.
    const progress = 0.02 + (0.96 * (k + 0.5)) / count;
    const angle = twist * progress;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const centre: Vec3 = [cos * radius, bottom + span * progress, zSign * sin * radius];
    const tangent = new THREE.Vector3(-sin * radius * twist, span, zSign * cos * radius * twist).normalize();
    const outward = new THREE.Vector3(cos, 0, zSign * sin);
    const up = new THREE.Vector3().crossVectors(tangent, outward).normalize().negate();
    if (up.y < 0) up.negate();
    for (const direction of [outward, outward.clone().negate(), up, up.clone().negate()]) {
      const d = direction.clone().multiplyScalar(share * wireRadius);
      points.push(place(centre[0] + d.x, centre[1] + d.y, centre[2] + d.z));
    }
  }
  return points;
}

const at = (p: Vec3) => ({ x: p[0], y: p[1], z: p[2] });

/**
 * Which side of the body's surface a point near it stands on, and how far
 * off: the nearest face, the nearest point on it, and the surface normal
 * there. The kernel's own classifier casts a ray and now and then miscounts
 * it - on the thickest wire a point 1.02 wire radii off the centre line read
 * inside while 1.01 and 1.05 read outside, and a boolean with a small ball
 * agreed with it, as it classifies the same way - so it is not asked here.
 * `surfaceNormal` already points out of the body on a reversed face (the
 * start disc as built, the wire of a mirrored spring): checked at points
 * well clear of the wire.
 */
function surfaceSides(solid: ShapeHandle) {
  const faces = cad.getSubShapes(solid, "face").map((face) => ({ face, box: cad.getBoundingBox(face) }));
  return (p: Vec3, reach: number) => {
    const vertex = cad.makeVertex(p[0], p[1], p[2]);
    let nearest: { face: ShapeHandle; distance: number } | undefined;
    for (const { face, box } of faces) {
      if (!(p[0] > box.xmin - reach && p[0] < box.xmax + reach && p[1] > box.ymin - reach && p[1] < box.ymax + reach && p[2] > box.zmin - reach && p[2] < box.zmax + reach)) continue;
      const distance = cad.distanceBetween(face, vertex);
      if (!nearest || distance < nearest.distance) nearest = { face, distance };
    }
    cad.release(vertex);
    expect(nearest).toBeDefined();
    const q = cad.projectPointOnFace(nearest!.face, at(p));
    const uv = cad.uvFromPoint(nearest!.face, q);
    const normal = cad.surfaceNormal(nearest!.face, uv.u, uv.v);
    const along = (p[0] - q.x) * normal.x + (p[1] - q.y) * normal.y + (p[2] - q.z) * normal.z;
    return { inside: along < 0, distance: nearest!.distance };
  };
}

describe("the spring's exact body", () => {
  const cases: Array<[string, Partial<WorkplaneShape>]> = [
    ["default spring", {}],
    ["left-hand spring", { springHand: "left" }],
    ["single turn", { springTurns: 1 }],
    ["spring of 60 turns of thin wire", { height: 60, springWire: 0.5, springTurns: 60 }],
    ["spring of the thinnest wire", { springWire: 0.3 }],
    ["spring of the thickest wire", { springWire: 8, springTurns: 2 }],
    ["spring on an oval footprint", { width: 20, depth: 12 }],
    ["spring turned, tipped and lifted", { rotation: 30, rotationX: 90, rotationZ: 15, elevation: 4, x: 12, z: -5 }],
    ["mirrored spring", { mirrorX: true }],
    ["spring mirrored twice, upside down", { mirrorZ: true, mirrorY: true, rotation: 50 }],
  ];

  it.each(cases)("matches the drawn %s", (_name, extra) => {
    const shape = spring(extra);
    const part = cadModifierSpringForShape(shape)!;
    expect(part.turns).toBe(springBuildPlan({ ...shape, width: shape.width, depth: shape.depth!, height: shape.height }).settings.turns);
    const solid = body(shape);
    expect(cad.isValid(solid)).toBe(true);
    const { drawn, expected } = expectation(shape);
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    // Bounds: the mesh's vertices lie on the round wire, so its box is the
    // body's, short of it at most by how far the polygon wire and the chords
    // along the coil cut inside the round.
    const plan = springBuildPlan({ ...shape, width: shape.width, depth: shape.depth!, height: shape.height });
    const sag = plan.wireRadius * (1 - Math.cos(Math.PI / springRingSegments(plan.settings.quality))) + plan.coilRadius * (1 - Math.cos(Math.PI / Math.max(8, plan.settings.quality)));
    const box = cad.getBoundingBox(solid);
    const actual = [box.xmin, box.ymin, box.zmin, box.xmax, box.ymax, box.zmax];
    actual.forEach((value, index) => expect(Math.abs(value - drawn.bounds[index])).toBeLessThan(sag + 1e-4));
    // Volume: the round wire exactly, and the drawn polygon wire within 1 % of the body less the polygon's share.
    const volume = cad.getVolume(solid);
    expect(Math.abs(volume - roundWireVolume(shape)) / volume).toBeLessThan(1e-5);
    const segments = springRingSegments(plan.settings.quality);
    expect(part.meshSectionShare).toBeCloseTo((segments / (2 * Math.PI)) * Math.sin((2 * Math.PI) / segments), 12);
    expect(Math.abs(drawn.volume - volume * part.meshSectionShare) / drawn.volume).toBeLessThan(0.01);
    // Points 2 % of the wire radius inside and outside the wire, all along it,
    // and half way in: on the right side, and (where the footprint is round,
    // so distances keep) that far off the surface.
    const round = (shape.depth ?? shape.width) === shape.width;
    const sideOf = surfaceSides(solid);
    for (const [share, expectInside] of [[0.5, true], [0.98, true], [1.02, false]] as const) {
      const offset = Math.abs(1 - share) * part.wireRadius;
      for (const p of wirePoints(shape, share, 24)) {
        const side = sideOf(p, 2 * part.wireRadius);
        expect(side.inside).toBe(expectInside);
        if (round) expect(Math.abs(side.distance - offset)).toBeLessThan(0.02 * part.wireRadius * 0.05);
      }
    }
  });

  it("builds the same exact body at any quality, which only sets how finely the mesh is drawn", () => {
    const coarse = spring({ springQuality: MIN_SPRING_QUALITY });
    const solid = body(coarse);
    // The coarsest mesh holds 13.5 % less than the round wire, 3.9 % past its polygon's share: inside the worker's check.
    const { drawn, expected } = expectation(coarse);
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    expect(drawn.volume / cad.getVolume(solid)).toBeGreaterThan(0.85);
    expect(Math.abs(cad.getVolume(solid) - cad.getVolume(body(spring())))).toBeLessThan(1e-6 * cad.getVolume(solid));
    expect(Math.abs(cad.getVolume(solid) - cad.getVolume(body(spring({ springQuality: 96 }))))).toBeLessThan(1e-6 * cad.getVolume(solid));
  });

  it("takes edge treatment: both wire ends rounded", () => {
    const solid = body(spring());
    // The two rims where the wire's square ends meet its surface: the edges of the two flat faces.
    const ends = cad.getSubShapes(solid, "face").filter((face) => cad.surfaceType(face) === "plane");
    expect(ends.length).toBe(2);
    const rims = ends.flatMap((face) => cad.getSubShapes(face, "edge"));
    expect(rims.length).toBe(2);
    const filleted = cad.fillet(solid, rims, 0.5);
    expect(cad.isValid(filleted)).toBe(true);
    // A fillet of radius f round the rim of a wire of radius r takes the
    // corner left beside a quarter circle, (1 - pi/4) f^2, round the rim at the
    // radius of that corner's centroid, r - f (10 - 3 pi) / (12 - 3 pi): at both ends.
    const removed = cad.getVolume(solid) - cad.getVolume(filleted);
    const f = 0.5;
    const r = 1.5;
    const expectedRemoved = 2 * (1 - Math.PI / 4) * f * f * 2 * Math.PI * (r - (f * (10 - 3 * Math.PI)) / (12 - 3 * Math.PI));
    expect(Math.abs(removed - expectedRemoved) / expectedRemoved).toBeLessThan(0.02);
  });
});
