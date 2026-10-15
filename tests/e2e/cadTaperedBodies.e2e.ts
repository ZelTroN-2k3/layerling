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
import { createBooleanHollowCylinderGeometry } from "@/lib/roundBodyGeometry";
import { roundSideCount } from "@/lib/roundSideCount";
import { createSlotGeometry } from "@/lib/slotGeometry";
import { createStarGeometry } from "@/lib/starGeometry";
import { createHeartGeometry } from "@/lib/heartGeometry";
import { createCrescentGeometry } from "@/lib/crescentGeometry";
import { createHoneycombGeometry } from "@/lib/honeycombGeometry";
import { createDovetailGeometry } from "@/lib/dovetailGeometry";
import { createRoundedBoxGeometry } from "@/lib/roundedBoxGeometry";
import { meshForTwist } from "@/lib/heightSlices";
import { shellSolid } from "@/lib/cadShell";
import { meshYawDegrees, mirrorSign, shapeExtrudeDeformAt, shapeHasExtrudeDeform, shapeHasTaper, shapeTaperDimensions, shapeTaperScaleAt } from "@/lib/workplaneShapes";

/*
 * Tapered and leaning shapes as ruled lofts between their bottom and top
 * section, against the display mesh that transformMesh deforms vertex by
 * vertex. The mesh builders are the real ones; the dispatch and transformMesh
 * are copied here, as LayerlingEditor.tsx keeps them to itself.
 */

type Vec3 = [number, number, number];

function shape(kind: WorkplaneShape["kind"], extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: `t-${kind}`, name: kind, kind, x: 0, z: 0, elevation: 0, size: 20, width: 20, depth: 20, height: 10, rotation: 0, color: "#ff8800", ...extra } as WorkplaneShape;
}

function localGeometry(source: WorkplaneShape) {
  const { width, depth, height } = source;
  switch (source.kind) {
    case "box": return new THREE.BoxGeometry(width, height, depth);
    case "cylinder":
    case "ellipse": return createPrismGeometry(width, height, depth, roundSideCount(source.sides, width, depth), source.segments ?? 1);
    case "polygon": return createPrismGeometry(width, height, depth, source.sides ?? 6);
    case "tube":
    case "ring": return createBooleanHollowCylinderGeometry(width, height, depth, source.bevel ?? 4, roundSideCount(source.sides, width, depth));
    case "slot": return createSlotGeometry({ width, depth, height, sides: source.sides });
    case "star": return createStarGeometry({ width, depth, height });
    case "heart": return createHeartGeometry({ width, depth, height });
    case "crescent": return createCrescentGeometry({ width, depth, height });
    case "honeycomb": return createHoneycombGeometry({ width, depth, height });
    case "dovetail": return createDovetailGeometry({ width, depth, height });
    case "roundedBox": return createRoundedBoxGeometry({ width, depth, height, topBottomFillet: source.topBottomFillet });
    default: throw new Error(`no mesh for ${source.kind}`);
  }
}

/** geometryMeshForShape's lift onto y = 0, then transformMesh with its taper, twist and lean. */
function worldMesh(source: WorkplaneShape) {
  const geometry = localGeometry(source);
  const prepared = geometry.index ? geometry.toNonIndexed() : geometry;
  prepared.computeBoundingBox();
  const lift = prepared.boundingBox?.min.y ?? 0;
  const position = prepared.getAttribute("position");
  let raw: Vec3[] = [];
  for (let i = 0; i < position.count; i += 1) raw.push([position.getX(i), position.getY(i) - lift, position.getZ(i)]);
  let rawFaces: Array<[number, number, number]> = [];
  for (let i = 0; i + 2 < raw.length; i += 3) rawFaces.push([i, i + 1, i + 2]);
  // A twist turns the mesh cut into bands with short edges, as transformMesh does.
  if (Math.abs(source.extrudeTwist ?? 0) > 1e-6) {
    const ys = raw.map((v) => v[1]);
    const cut = meshForTwist(raw, rawFaces, Math.min(...ys), Math.max(...ys), source.extrudeTwist ?? 0);
    raw = cut.vertices;
    rawFaces = cut.faces;
  }
  const tapered = shapeHasTaper(source);
  const deformed = shapeHasExtrudeDeform(source);
  const minY = Math.min(...raw.map((v) => v[1]));
  const maxY = Math.max(...raw.map((v) => v[1]));
  const span = Math.max(1e-6, maxY - minY);
  // Taper and twist work towards the middle of the mesh's extent (a star is not centred on its origin).
  const cx = (Math.min(...raw.map((v) => v[0])) + Math.max(...raw.map((v) => v[0]))) / 2;
  const cz = (Math.min(...raw.map((v) => v[2])) + Math.max(...raw.map((v) => v[2]))) / 2;
  const centerY = source.height / 2;
  const matrix = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(
    THREE.MathUtils.degToRad(source.rotationX ?? 0), THREE.MathUtils.degToRad(meshYawDegrees(source)), THREE.MathUtils.degToRad(source.rotationZ ?? 0), "XYZ"));
  const vertices = raw.map(([x, y, z]) => {
    const t = (y - minY) / span;
    let lx = (x - cx) * (tapered ? shapeTaperScaleAt(source, t, "width") : 1);
    let lz = (z - cz) * (tapered ? shapeTaperScaleAt(source, t, "depth") : 1);
    if (deformed) {
      const d = shapeExtrudeDeformAt(source, t);
      const c = Math.cos(d.twistRadians);
      const s = Math.sin(d.twistRadians);
      [lx, lz] = [lx * c - lz * s + d.offsetX, lx * s + lz * c + d.offsetZ];
    }
    lx += cx;
    lz += cz;
    const v = new THREE.Vector3(lx * mirrorSign(source.mirrorX), (y - centerY) * mirrorSign(source.mirrorY), lz * mirrorSign(source.mirrorZ)).applyMatrix4(matrix);
    return [v.x + source.x, v.y + (source.elevation ?? 0) + centerY, v.z + source.z] as Vec3;
  });
  return { vertices, faces: rawFaces };
}

/** Volume of a section of area `area` scaled linearly from (a0, c0) to (a1, c1) over `height`; a lean shears and keeps it. */
function taperedVolume(area: number, height: number, a0: number, c0: number, a1: number, c1: number) {
  return area * height * (a0 * c0 + (a0 * (c1 - c0) + c0 * (a1 - a0)) / 2 + ((a1 - a0) * (c1 - c0)) / 3);
}

describe("tapered and leaning shapes: exact lofts", () => {
  let cad: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    cad = await OcctKernel.init({ wasm });
  });

  function body(source: WorkplaneShape) {
    const profile = cadModifierProfileForShape(source);
    expect(profile?.kind).toBe("loft");
    const mesh = worldMesh(source);
    const expected = cadProfileExpectation(mesh.vertices, mesh.faces);
    const part = { ...(profile as CadModifierProfilePart), expected };
    const local = profileExtrusionSolid(cad, part);
    const t = part.transform;
    const solid = !t ? local : cadTransformRequiresGeneralTransform(t) ? cad.generalTransform(local, t) : cad.transform(local, t);
    expect(cad.isSolid(solid)).toBe(true);
    expect(cad.isValid(solid)).toBe(true);
    return { solid, expected };
  }

  function trueBounds(solid: ShapeHandle) {
    const copy = cad.copy(solid);
    const { positions } = cad.tessellate(copy, { linearDeflection: 0.005, angularDeflection: 0.2 });
    cad.release(copy);
    const box = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.length; i += 3) for (let a = 0; a < 3; a += 1) { box[a] = Math.min(box[a], positions[i + a]); box[a + 3] = Math.max(box[a + 3], positions[i + a]); }
    return box;
  }

  const cases: Array<[string, WorkplaneShape, number]> = [
    // [name, shape, area of the undeformed section]
    ["a box tapered to a frustum", shape("box", { width: 30, depth: 20, height: 15, taperTopWidth: 12, taperTopDepth: 8 }), 30 * 20],
    ["a box tapered only in width (a wedge-like prism)", shape("box", { width: 30, depth: 20, height: 15, taperTopWidth: 6, taperTopDepth: 20 }), 30 * 20],
    ["a box leaning", shape("box", { width: 20, depth: 20, height: 25, extrudeTopOffsetX: 8, extrudeTopOffsetZ: -5 }), 20 * 20],
    ["a box tapered, wider on top, and leaning", shape("box", { width: 20, depth: 10, height: 12, taperBottomWidth: 10, taperBottomDepth: 10, taperTopWidth: 24, taperTopDepth: 14, extrudeTopOffsetX: -4 }), 20 * 10],
    ["a cylinder tapered to an oval cone frustum", shape("cylinder", { width: 20, depth: 20, height: 20, taperTopWidth: 8, taperTopDepth: 14 }), Math.PI * 10 * 10],
    // A circle at the bottom, an oval long across at the top: the kernel starts the two rims at different points.
    ["a cylinder tapered to an oval long across", shape("cylinder", { width: 20, depth: 20, height: 20, taperTopWidth: 14, taperTopDepth: 4, extrudeTopOffsetZ: -6 }), Math.PI * 10 * 10],
    // The same, thin and far off to the side: without the split rims this one lofts twisted (0.6 of its volume).
    ["a thin rod flattening into a leaning blade", shape("ellipse", { width: 0.5, depth: 0.5, height: 20, taperTopWidth: 0.5, taperTopDepth: 0.025, extrudeTopOffsetX: -5, extrudeTopOffsetZ: -20 }), Math.PI * 0.25 * 0.25],
    ["a leaning ellipse", shape("ellipse", { width: 30, depth: 16, height: 10, extrudeTopOffsetX: 6 }), Math.PI * 15 * 8],
    ["a tapered hexagon", shape("polygon", { width: 20, depth: 20, height: 10, sides: 6, taperTopWidth: 10, taperTopDepth: 10 }), NaN],
    ["a tapered, leaning tube", shape("tube", { width: 30, depth: 30, height: 20, bevel: 3, taperTopWidth: 18, taperTopDepth: 18, extrudeTopOffsetZ: 4 }), Math.PI * (15 * 15 - 12 * 12)],
    ["a six-sided cylinder tapered", shape("cylinder", { width: 20, depth: 20, height: 10, sides: 6, taperTopWidth: 12, taperTopDepth: 12 }), NaN],
    // Tapered across but not along: the slanted sides twist into ruled surfaces (hyperbolic paraboloids).
    ["a hexagon tapered in width only, leaning", shape("polygon", { width: 20, depth: 20, height: 10, sides: 6, taperTopWidth: 8, taperTopDepth: 20, extrudeTopOffsetZ: 3 }), NaN],
    ["a square tube drawn with 12 sides, tapered in depth only", shape("tube", { width: 30, depth: 30, height: 15, bevel: 4, sides: 12, taperTopWidth: 30, taperTopDepth: 15 }), NaN],
  ];

  // Since #111 the outlines of more shapes loft. Their arcs are drawn as chords,
  // so place and volume agree to the chord's sag rather than exactly; the check
  // the editor itself makes (cadProfileSolidMismatch) holds as for the others.
  const outlineCases: Array<[string, WorkplaneShape]> = [
    // A star is not centred on its origin.
    ["a tapered star", shape("star", { width: 40, depth: 38, height: 12, taperTopWidth: 16, taperTopDepth: 15 })],
    ["a tapered, leaning heart", shape("heart", { width: 30, depth: 26, height: 10, taperTopWidth: 15, taperTopDepth: 13, extrudeTopOffsetZ: 3 })],
    ["a leaning capsule", shape("slot", { width: 40, depth: 16, height: 20, taperTopWidth: 30, taperTopDepth: 12, extrudeTopOffsetX: 6 })],
    ["a tapered crescent", shape("crescent", { width: 30, depth: 30, height: 8, taperTopWidth: 20, taperTopDepth: 20 })],
    ["a tapered honeycomb plate", shape("honeycomb", { width: 50, depth: 40, height: 6, taperTopWidth: 44, taperTopDepth: 34 })],
    ["a tapered dovetail", shape("dovetail", { width: 30, depth: 20, height: 10, taperTopWidth: 24, taperTopDepth: 18 })],
    ["a rounded box with round corners only, tapered", shape("roundedBox", { width: 40, depth: 30, height: 20, topBottomFillet: 0, taperTopWidth: 28, taperTopDepth: 20 })],
  ];

  it.each(outlineCases)("builds %s where the display mesh stands, turned and mirrored too", (_name, source) => {
    for (const placed of [source, { ...source, x: 12.5, z: -7, elevation: 4, rotation: 33, rotationX: 90, rotationZ: 15, mirrorX: true }]) {
      const { solid, expected } = body(placed);
      expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
      trueBounds(solid).forEach((value, index) => expect(Math.abs(value - expected.bounds[index])).toBeLessThan(0.15));
      expect(Math.abs(cad.getVolume(solid) / expected.volume - 1)).toBeLessThan(0.015);
    }
  });

  it.each(cases)("builds %s: the display mesh's place and volume, exactly the taper's volume", (_name, source, area) => {
    const { solid, expected } = body(source);
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    // Flat sides are drawn exactly; round ones as chords inside the surface.
    trueBounds(solid).forEach((value, index) => expect(Math.abs(value - expected.bounds[index])).toBeLessThan(0.05));
    if (Number.isFinite(area)) {
      const taper = shapeTaperDimensions(source);
      const exact = taperedVolume(area, source.height, taper.bottomWidth / source.width, taper.bottomDepth / source.depth, taper.topWidth / source.width, taper.topDepth / source.depth);
      expect(cad.getVolume(solid) / exact).toBeCloseTo(1, 4);
    } else {
      // A polygon is drawn exactly: the display mesh's own volume.
      expect(cad.getVolume(solid) / expected.volume).toBeCloseTo(1, 6);
    }
  });

  it("keeps the flat sides of a tapered or leaning box flat: six plane faces", () => {
    for (const [, source] of cases.slice(0, 4)) {
      const { solid } = body(source);
      const faces = cad.getSubShapes(solid, "face");
      expect(faces.length).toBe(6);
      faces.forEach((face) => expect(cad.surfaceType(face)).toBe("plane"));
    }
  });

  it("lofts a polygon whose slanted sides do not stay flat as a whole: one face per side, flat ends", () => {
    const { solid } = body(cases[11][1]);
    const kinds = cad.getSubShapes(solid, "face").map((face) => cad.surfaceType(face));
    expect(kinds.length).toBe(8);
    expect(kinds.filter((kind) => kind === "plane").length).toBeGreaterThanOrEqual(2);
  });

  it("builds a taper that crosses over - wide across at the bottom, deep at the top - facing outwards", () => {
    // The sewn sides of this one come out of the kernel facing inwards; repaired and turned, it is the drawn body.
    const source = shape("polygon", { width: 80, depth: 80, height: 3, sides: 12, taperBottomWidth: 112, taperBottomDepth: 16, taperTopWidth: 4, taperTopDepth: 40, extrudeTopOffsetX: 3, extrudeTopOffsetZ: 7 });
    const { solid, expected } = body(source);
    expect(cad.getVolume(solid)).toBeGreaterThan(0);
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    trueBounds(solid).forEach((value, index) => expect(Math.abs(value - expected.bounds[index])).toBeLessThan(0.05));
  });

  it("agrees with the display mesh turned, tipped over, mirrored and lifted", () => {
    const placement = { x: 12.5, z: -7, elevation: 4, rotation: 33, rotationX: 90, rotationZ: 15, mirrorX: true };
    for (const [, source] of cases) {
      const { solid, expected } = body({ ...source, ...placement });
      expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
      trueBounds(solid).forEach((value, index) => expect(Math.abs(value - expected.bounds[index])).toBeLessThan(0.05));
    }
  });

  it("takes a fillet on every edge of a tapered, leaning box and a chamfer on a tapered cylinder's rims", () => {
    const box = body(cases[3][1]).solid;
    const filleted = cad.fillet(box, cad.getSubShapes(box, "edge"), 1);
    expect(cad.isValid(filleted)).toBe(true);
    expect(cad.getVolume(filleted)).toBeLessThan(cad.getVolume(box));
    const cone = body(cases[4][1]).solid;
    const rims = cad.getSubShapes(cone, "edge").filter((edge) => cad.curveType(edge) !== "line");
    const chamfered = cad.chamfer(cone, rims, 0.5);
    expect(cad.isValid(chamfered)).toBe(true);
  });

  // #184: a twist is a smooth loft through sections 7.5 degrees apart; against the display mesh,
  // now cut into bands and short edges, place and volume agree closely.
  const twistCases: Array<[string, WorkplaneShape]> = [
    ["a twisted square", shape("box", { width: 20, depth: 20, height: 30, extrudeTwist: 90 })],
    ["a twisted flat bar", shape("box", { width: 30, depth: 10, height: 40, extrudeTwist: 180 })],
    ["a twisted, tapered, leaning box", shape("box", { width: 24, depth: 16, height: 30, extrudeTwist: 120, taperTopWidth: 12, taperTopDepth: 10, extrudeTopOffsetX: 5 })],
    ["a twisted star", shape("star", { width: 30, depth: 30, height: 30, extrudeTwist: 90 })],
    ["a twisted hexagon", shape("polygon", { width: 20, depth: 20, height: 25, sides: 6, extrudeTwist: 60 })],
    ["a twisted tube", shape("tube", { width: 30, depth: 30, height: 20, bevel: 3, sides: 8, extrudeTwist: 45 })],
  ];

  it.each(twistCases)("builds %s where the display mesh stands, turned and mirrored too", (_name, source) => {
    for (const placed of [source, { ...source, x: 12.5, z: -7, elevation: 4, rotation: 33, rotationX: 90, mirrorX: true }]) {
      const { solid, expected } = body(placed);
      expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
      trueBounds(solid).forEach((value, index) => expect(Math.abs(value - expected.bounds[index])).toBeLessThan(0.2));
      expect(Math.abs(cad.getVolume(solid) / expected.volume - 1)).toBeLessThan(0.01);
    }
  });

  it("takes a fillet on every edge of a twisted box, a chamfer on its rims and a shell", () => {
    const { solid } = body(shape("box", { width: 20, depth: 14, height: 30, extrudeTwist: 90 }));
    const edges = cad.getSubShapes(solid, "edge");
    const filleted = cad.fillet(solid, edges, 1);
    expect(cad.isValid(filleted)).toBe(true);
    expect(cad.getVolume(filleted)).toBeLessThan(cad.getVolume(solid));
    const top = cad.getSubShapes(solid, "face").reduce((best, face) => (cad.getBoundingBox(face).ymin > cad.getBoundingBox(best).ymin ? face : best));
    const rims = cad.getSubShapes(top, "edge");
    const chamfered = cad.chamfer(solid, rims, 1);
    expect(cad.isValid(chamfered)).toBe(true);
    const shelled = shellSolid(cad, solid, 1.5, "top");
    expect(cad.isValid(shelled)).toBe(true);
    expect(cad.getVolume(shelled)).toBeLessThan(cad.getVolume(solid) * 0.6);
  });

  it("leaves a tapered sphere on the display mesh", () => {
    expect(cadModifierProfileForShape(shape("sphere", { height: 20, taperTopWidth: 10 }))).toBeNull();
    expect(cadModifierProfileForShape(shape("box", { radius: 2, taperTopWidth: 10 }))).toBeNull();
  });
});
