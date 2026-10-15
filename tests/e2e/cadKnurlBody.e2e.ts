import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import { cadModifierHelicalGearForShape, cadModifierProfileForShape } from "@/lib/cadProfileExtrusion";
import { profileExtrusionSolid } from "@/lib/cadProfileSolid";
import { createKnurlGeometry } from "@/lib/knurlGeometry";

/*
 * Straight knurling as an exact body: its groove ring pushed up, held to the
 * volume of the mesh the editor draws. Crossed knurling stays a mesh - built
 * as the common part of two counter-turned helical rings it took the kernel
 * 7 s with 12 grooves, 43 s with 30 and failed with 60 (05.10.2026).
 */

let cad: OcctKernel;

beforeAll(async () => {
  const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
  cad = await OcctKernel.init({ wasm });
});

function knurl(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "k", name: "Knurl", kind: "knurl", color: "#888888", x: 0, z: 0, elevation: 0, rotation: 0,
    width: 20, depth: 20, size: 20, height: 12, knurlCount: 30, knurlDepth: 0.6, knurlAngle: 30,
    ...extra,
  } as WorkplaneShape;
}

function meshVolume(shape: WorkplaneShape) {
  const p = createKnurlGeometry(shape).getAttribute("position").array as Float32Array;
  let volume = 0;
  for (let i = 0; i < p.length; i += 9) {
    volume += (p[i] * (p[i + 4] * p[i + 8] - p[i + 5] * p[i + 7]) - p[i + 1] * (p[i + 3] * p[i + 8] - p[i + 5] * p[i + 6]) + p[i + 2] * (p[i + 3] * p[i + 7] - p[i + 4] * p[i + 6])) / 6;
  }
  return volume;
}

describe("exact knurling bodies", () => {
  it("builds straight knurling as a profile with the mesh's volume", () => {
    const shape = knurl({ knurlPattern: "straight" });
    expect(cadModifierHelicalGearForShape(shape)).toBeNull();
    const part = cadModifierProfileForShape(shape);
    expect(part).not.toBeNull();
    const solid = profileExtrusionSolid(cad, part!);
    expect(cad.isValid(solid)).toBe(true);
    expect(Math.abs(cad.getVolume(solid))).toBeCloseTo(meshVolume(shape), 1);
  });

  it("chamfers straight knurling exactly, close to the chamfered mesh", () => {
    const shape = knurl({ knurlPattern: "straight", knurlChamfer: 1 });
    const part = cadModifierProfileForShape(shape);
    expect(part?.capChamfer).toEqual({ radius: 10, size: 1 });
    const solid = profileExtrusionSolid(cad, part!);
    expect(cad.isValid(solid)).toBe(true);
    const exact = Math.abs(cad.getVolume(solid));
    expect(Math.abs(exact - meshVolume(shape)) / exact).toBeLessThan(0.005);
    const box = cad.getBoundingBox(solid);
    expect(box.ymax - box.ymin).toBeCloseTo(12, 3);
  });

  it("builds round knurling from true arcs, with and without its chamfer, close to the mesh (#201)", () => {
    for (const knurlChamfer of [0, 1]) {
      const shape = knurl({ knurlPattern: "round", knurlCount: 18, knurlDepth: 1, knurlChamfer });
      const part = cadModifierProfileForShape(shape);
      expect(part).not.toBeNull();
      expect(part!.loops[0].segments.every((segment) => segment.kind === "arc")).toBe(true);
      expect(part!.loops[0].segments).toHaveLength(36);
      const solid = profileExtrusionSolid(cad, part!);
      expect(cad.isValid(solid)).toBe(true);
      const exact = Math.abs(cad.getVolume(solid));
      expect(Math.abs(exact - meshVolume(shape)) / exact).toBeLessThan(0.005);
      const box = cad.getBoundingBox(solid);
      expect(Math.max(box.xmax - box.xmin, box.zmax - box.zmin)).toBeLessThanOrEqual(20 + 1e-6);
    }
  });

  it("leaves crossed knurling a mesh: the kernel's common of the two turned rings is far too slow", () => {
    expect(cadModifierHelicalGearForShape(knurl({ knurlPattern: "diamond" }))).toBeNull();
    expect(cadModifierProfileForShape(knurl({ knurlPattern: "diamond" }))).toBeNull();
  });
});
