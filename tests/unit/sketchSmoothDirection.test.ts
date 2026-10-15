import { describe, expect, it } from "vitest";
import { orderedSketchPaths, withSmoothSketchHandles } from "@/lib/sketchSmoothHandles";
import { curveControls } from "@/lib/sketchPaths";
import type { SketchProfile } from "@/types/layerling";

/**
 * Every curved stretch must leave its start towards its end and arrive from its start: both
 * controls on the inner side. Reversed handles made a loop at every point of a smooth curve (#199).
 */
function controlsFaceEachOther(profile: SketchProfile) {
  const results: boolean[] = [];
  orderedSketchPaths(profile).forEach((path) => path.steps.forEach((step) => {
    const { first, second } = curveControls(step);
    if (!first || !second) return;
    const dx = step.to.x - step.from.x;
    const dz = step.to.z - step.from.z;
    results.push((first.x - step.from.x) * dx + (first.z - step.from.z) * dz > 0);
    results.push((second.x - step.to.x) * -dx + (second.z - step.to.z) * -dz > 0);
  }));
  return results;
}

const chain = (ids: string[], points: Array<[number, number]>, reversedSegments = false): SketchProfile => ({
  points: ids.map((id, index) => ({ id, x: points[index][0], z: points[index][1], mode: "smooth" as const })),
  segments: ids.slice(1).map((id, index) => reversedSegments
    ? { id: `s${index}`, startId: id, endId: ids[index], kind: "smooth" as const }
    : { id: `s${index}`, startId: ids[index], endId: id, kind: "smooth" as const }),
});

describe("smooth curve handles point along the curve (#199)", () => {
  it("for a chain drawn point after point, whichever end the walk starts from", () => {
    const zigzag: Array<[number, number]> = [[0, 0], [20, -20], [40, 0], [60, -20], [80, 0]];
    for (const reversed of [false, true]) {
      const profile = withSmoothSketchHandles(chain(["a", "b", "c", "d", "e"], zigzag, reversed));
      const checks = controlsFaceEachOther(profile);
      expect(checks.length).toBe(8);
      expect(checks.every(Boolean)).toBe(true);
    }
  });

  it("for a closed smooth outline", () => {
    const square: Array<[number, number]> = [[0, 0], [30, 0], [30, 30], [0, 30]];
    const profile = chain(["a", "b", "c", "d"], square);
    profile.segments.push({ id: "close", startId: "d", endId: "a", kind: "smooth" });
    const checks = controlsFaceEachOther(withSmoothSketchHandles(profile));
    expect(checks.length).toBe(8);
    expect(checks.every(Boolean)).toBe(true);
  });

  it("for the Smooth button on single points of a line chain", () => {
    const profile = chain(["a", "b", "c"], [[0, 0], [20, -20], [40, 0]]);
    profile.segments.forEach((segment) => { segment.kind = "bezier"; });
    const checks = controlsFaceEachOther(withSmoothSketchHandles(profile, new Set(["a", "b", "c"])));
    expect(checks.every(Boolean)).toBe(true);
  });
});
