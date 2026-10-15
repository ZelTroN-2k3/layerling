import { beforeAll, describe, expect, it } from "vitest";
import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { revolveAxisOffset, revolveAxisShift } from "@/lib/revolveAxis";
import { buildSketchRevolveMesh } from "@/lib/sketchRevolve";
import type { SketchProfile, WorkplaneShape } from "@/types/layerling";

const ring: SketchProfile = {
  points: [{ id: "a", x: -5, z: 0 }, { id: "b", x: -10, z: 0 }, { id: "c", x: -10, z: 20 }, { id: "d", x: -5, z: 20 }],
  segments: [
    { id: "ab", startId: "a", endId: "b", kind: "line" },
    { id: "bc", startId: "b", endId: "c", kind: "line" },
    { id: "cd", startId: "c", endId: "d", kind: "line" },
    { id: "da", startId: "d", endId: "a", kind: "line" },
  ],
};

describe("revolve axis of a partly swept body (#176)", () => {
  let runtime: ManifoldToplevel;
  beforeAll(async () => {
    runtime = await manifoldModule();
    runtime.setup();
  });

  it("is the middle for a full turn", () => {
    expect(revolveAxisOffset(ring, { sweepAngle: 360 })).toEqual({ x: 0, z: 0 });
  });

  it.each([
    { startAngle: 0, sweepAngle: 90 },
    { startAngle: 0, sweepAngle: 180 },
    { startAngle: 30, sweepAngle: 200 },
    { startAngle: 0, sweepAngle: -120 },
    { startAngle: 300, sweepAngle: 150 },
  ])("matches the built mesh for %j", (settings) => {
    const mesh = buildSketchRevolveMesh(runtime, ring, { ...settings, sides: 360 });
    const offset = revolveAxisOffset(ring, settings);
    expect(offset.x).toBeCloseTo(mesh.axis.x, 1);
    expect(offset.z).toBeCloseTo(mesh.axis.z, 1);
  });

  it("moves the middle so the axis stays where it was", () => {
    const shape = { id: "s", kind: "mesh", x: 0, z: 0, elevation: 0, size: 1, width: 1, depth: 1, height: 1, rotation: 0 } as WorkplaneShape;
    const shift = revolveAxisShift(shape, { profile: ring, settings: { sweepAngle: 360 } }, { profile: ring, settings: { sweepAngle: 180 } });
    // A half turn from 0 degrees is a body on one side of the axis: its middle moves with it.
    const after = revolveAxisOffset(ring, { sweepAngle: 180 });
    expect(shift.x).toBeCloseTo(-after.x, 9);
    expect(shift.z).toBeCloseTo(-after.z, 9);
    expect(shift.y).toBeCloseTo(0, 9);
  });
});
