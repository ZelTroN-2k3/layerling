import { beforeAll, describe, expect, it, vi } from "vitest";
import manifoldModule from "manifold-3d";
import type { WorkplaneShape } from "@/types/layerling";
import { exportSolidVolume } from "@/lib/editorBooleans";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";

/**
 * A hole is as wide as it was typed (#254): the volume of a 20 x 20 x 10 mm block with a through hole
 * says how wide the hole really is. It was 0.1 mm wider than typed (a 7.9 mm hole cut at 8.0 mm), because
 * the cutter was padded on every side to keep thin skins away.
 */
// The editor loads the 2D/3D kernel from the page's own address; here it comes from the package.
const kernel = vi.hoisted(() => ({ runtime: null as Promise<unknown> | null }));
vi.mock("@/lib/editorMeshCore", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/editorMeshCore")>()),
  getManifoldRuntime: () => kernel.runtime,
}));

beforeAll(async () => {
  kernel.runtime = manifoldModule().then((runtime) => {
    runtime.setup();
    rememberManifoldRuntime(runtime);
    return runtime;
  });
  await kernel.runtime;
});

const SIDES = 128;
const BLOCK = 20 * 20 * 10;

function block(): WorkplaneShape {
  return { id: "block", name: "Box", kind: "box", color: "#cf101b", x: 0, z: 0, elevation: 0, rotation: 0, width: 20, depth: 20, size: 20, height: 10 } as WorkplaneShape;
}

function cylinderHole(diameter: number, x: number): WorkplaneShape {
  return {
    id: "hole", name: "Cylinder", kind: "cylinder", color: "#999999", x, z: 0, elevation: -1, rotation: 0,
    width: diameter, depth: diameter, size: diameter, height: 12, sides: SIDES, hole: true,
  } as WorkplaneShape;
}

/** What a polygon of SIDES corners of this diameter takes out of the block. */
const holeVolume = (diameter: number) => ((SIDES / 2) * (diameter / 2) ** 2 * Math.sin((2 * Math.PI) / SIDES)) * 10;

describe("the size of a hole", () => {
  it.each([7.9, 6, 3.2])("a %s mm hole takes out the volume of a hole of that size", async (diameter) => {
    const { volumeMm3, unionFailed } = await exportSolidVolume([block(), cylinderHole(diameter, 0)]);
    expect(unionFailed).toBe(0);
    // Within 2 mm3, about 0.016 mm of diameter: the 0.1 mm of the old padding took 12 mm3 more out of the block.
    expect(Math.abs(BLOCK - volumeMm3 - holeVolume(diameter))).toBeLessThan(2);
  });

  it("keeps a hole that touches a wall along a line from taking a slab out of it", async () => {
    // Centre 4 mm from the left face, radius 4: the hole touches the face exactly.
    const { volumeMm3, unionFailed } = await exportSolidVolume([block(), cylinderHole(8, -6)]);
    expect(unionFailed).toBe(0);
    expect(Math.abs(BLOCK - volumeMm3 - holeVolume(8))).toBeLessThan(5);
  });

  it("cuts a notch that is flush with three faces cleanly", async () => {
    const notch = { id: "notch", name: "Box", kind: "box", color: "#999999", x: -5, z: 0, elevation: -1, rotation: 0, width: 10, depth: 20, size: 20, height: 12, hole: true } as WorkplaneShape;
    const { volumeMm3 } = await exportSolidVolume([block(), notch]);
    expect(Math.abs(volumeMm3 - BLOCK / 2)).toBeLessThan(1);
  });
});
