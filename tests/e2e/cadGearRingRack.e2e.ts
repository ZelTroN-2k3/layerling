import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as THREE from "three";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import { cadModifierHelicalGearForShape, cadModifierProfileForShape, cadProfileExpectation } from "@/lib/cadProfileExtrusion";
import { cadProfileSolidMismatch, profileExtrusionSolid } from "@/lib/cadProfileSolid";
import { cadTransformRequiresGeneralTransform } from "@/lib/cadModifierRuntime";
import { helicalGearPartSolid } from "@/lib/gearSolid";
import { BEVEL_GEAR_TOP_SCALE, createGearGeometry, gearOutlineCorners, gearSettings, MIN_GEAR_HELIX_QUALITY, MAX_GEAR_HELIX_QUALITY } from "@/lib/gearGeometry";
import { meshYawDegrees, mirrorSign } from "@/lib/workplaneShapes";
import { cad, gear, placer, displayMesh, body, area, section, outlineVolume, surfaceSides, sectionPoints } from "./helpers/gearHarness";
import type { Vec3, P2 } from "./helpers/gearHarness";

/*
 * The ring gear and the rack (#201): straight extrusions of their outlines - the rim circle
 * round the teeth of a gear turned inside out, and the toothed bar - held to the display mesh
 * in bounds, volume and shape, like the spur gear.
 */
describe("the ring gear's and the rack's exact bodies (#201)", () => {
  const rackLength = (module: number, teeth: number) => Math.PI * module * teeth;
  const cases: Array<[string, Partial<WorkplaneShape>]> = [
    ["ring gear", { gearType: "internal", gearProfile: "involute", teeth: 30, width: 71, depth: 71, size: 71, gearRim: 3, gearBacklash: 0.2 }],
    ["ring gear of 12 teeth, whose tips lie inside the base circle", { gearType: "internal", gearProfile: "involute", teeth: 12, width: 35, depth: 35, size: 35, gearRim: 3 }],
    ["oval ring gear", { gearType: "internal", gearProfile: "involute", teeth: 24, width: 60, depth: 48, size: 60, gearRim: 4 }],
    ["ring gear turned, tipped and lifted", { gearType: "internal", gearProfile: "involute", teeth: 20, width: 50, depth: 50, size: 50, gearRim: 2, rotation: 30, rotationX: 90, elevation: 4, x: 12, z: -5 }],
    ["round ring gear", { gearType: "internal", gearProfile: "round", teeth: 24, width: 44.55, depth: 44.55, size: 44.55, gearRim: 3 }],
    ["rack", { gearType: "rack", gearProfile: "involute", teeth: 12, width: rackLength(2, 12), depth: 7.5, size: rackLength(2, 12) }],
    ["rack at 30 degrees, turned and lifted", { gearType: "rack", gearProfile: "involute", teeth: 8, gearPressureAngle: 30, width: rackLength(1.5, 8), depth: 6, size: rackLength(1.5, 8), rotation: 30, elevation: 4, x: 5 }],
    ["rack of 64 teeth of module 0.5", { gearType: "rack", gearProfile: "involute", teeth: 64, width: rackLength(0.5, 64), depth: 3, size: rackLength(0.5, 64) }],
    ["round rack", { gearType: "rack", gearProfile: "round", teeth: 10, width: rackLength(2, 10), depth: 7, size: rackLength(2, 10) }],
    ["mirrored round rack", { gearType: "rack", gearProfile: "round", teeth: 10, width: rackLength(2, 10), depth: 7, size: rackLength(2, 10), mirrorX: true }],
  ];

  it.each(cases)("matches the drawn %s", (_name, extra) => {
    const shape = gear({ centerHoleSize: 0, ...extra });
    const solid = body(shape);
    expect(cad.isValid(solid)).toBe(true);
    const expected = displayMesh(shape);
    expect(cadProfileSolidMismatch(cad, solid, expected)).toBeNull();
    const box = cad.getBoundingBox(solid);
    [box.xmin, box.ymin, box.zmin, box.xmax, box.ymax, box.zmax].forEach((value, index) => expect(Math.abs(value - expected.bounds[index])).toBeLessThan(0.02));
    const volume = cad.getVolume(solid);
    expect(Math.abs(expected.volume - volume) / volume).toBeLessThan(0.01);
  });

  it("takes a fillet on the ring gear's and the rack's top edges", () => {
    for (const extra of [cases[0][1], cases[4][1], cases[5][1], cases[8][1]]) {
      const shape = gear({ centerHoleSize: 0, ...extra });
      const solid = profileExtrusionSolid(cad, cadModifierProfileForShape(shape)!);
      const bounds = cad.getBoundingBox(solid);
      const up = bounds.ymax - bounds.ymin < bounds.zmax - bounds.zmin ? "y" : "z";
      const edges = cad.getSubShapes(solid, "edge").filter((edge) => {
        const edgeBox = cad.getBoundingBox(edge);
        return up === "y"
          ? edgeBox.ymax - edgeBox.ymin < 1e-6 && Math.abs(edgeBox.ymax - bounds.ymax) < 1e-6
          : edgeBox.zmax - edgeBox.zmin < 1e-6 && Math.abs(edgeBox.zmax - bounds.zmax) < 1e-6;
      });
      expect(edges.length).toBeGreaterThanOrEqual(10);
      const rounded = cad.fillet(solid, edges, 0.3);
      expect(cad.isValid(rounded)).toBe(true);
      expect(cad.getVolume(rounded)).toBeLessThan(cad.getVolume(solid));
    }
  });
});
