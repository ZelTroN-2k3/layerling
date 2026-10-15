import { describe, expect, it } from "vitest";
import {
  customThreadProfile,
  defaultThreadDepth,
  normalizeThreadDepth,
  normalizeThreadFlankAngle,
  threadBuildPlan,
  threadDepthLimits,
  threadFootprintPatch,
  threadNaturalFootprint,
  threadSettings,
} from "@/lib/threadGeometry";
import { isThreadProfile } from "@/lib/threadProfiles";

describe("the own thread profile", () => {
  it("is a symmetric trapezoid: flat crest and root of equal width, flanks that take depth x tan(half the angle)", () => {
    const profile = customThreadProfile(2, 1, 60);
    const [crestStart, crestEnd, rootStart, rootEnd] = profile.points;
    expect(profile.depthPerPitch).toBeCloseTo(0.5, 10);
    expect([crestStart.level, crestEnd.level, rootStart.level, rootEnd.level]).toEqual([1, 1, 0, 0]);
    const flank = (1 * Math.tan(Math.PI / 6)) / 2;
    expect(rootStart.u - crestEnd.u).toBeCloseTo(flank, 10);
    expect(1 - rootEnd.u).toBeCloseTo(flank, 10);
    // Crest, flank, root, flank add up to one pitch.
    expect((crestEnd.u - crestStart.u) + flank + (rootEnd.u - rootStart.u) + flank).toBeCloseTo(1, 10);
    expect(crestEnd.u - crestStart.u).toBeCloseTo(rootEnd.u - rootStart.u, 10);
  });

  it("takes the V thread's depth at 60 degrees when nothing is set", () => {
    const settings = threadSettings({ threadProfile: "custom", threadDiameter: 6, threadPitch: 1 });
    expect(settings.flankAngle).toBe(60);
    expect(settings.depth).toBeCloseTo(defaultThreadDepth(1), 10);
    expect(settings.depth).toBeCloseTo(0.5413, 3);
  });

  it("clamps the angle to 10-90 degrees and the depth to what the pitch, the angle and the diameter allow", () => {
    expect(normalizeThreadFlankAngle(5)).toBe(10);
    expect(normalizeThreadFlankAngle(120)).toBe(90);
    expect(normalizeThreadFlankAngle(undefined)).toBe(60);
    const limits = threadDepthLimits(1, 6, 60);
    // Both flanks together may take at most nine tenths of the pitch: 2 x depth x tan 30 = 0.9.
    expect(limits.max).toBeCloseTo(0.9 / (2 * Math.tan(Math.PI / 6)), 10);
    expect(limits.min).toBeCloseTo(0.1, 10);
    expect(normalizeThreadDepth(5, 1, 6, 60)).toBeCloseTo(limits.max, 10);
    expect(normalizeThreadDepth(0.001, 1, 6, 60)).toBeCloseTo(0.1, 10);
    // A flatter angle leaves more room, but never more than 40 % of the diameter.
    expect(threadDepthLimits(10, 6, 10).max).toBeCloseTo(2.4, 10);
  });

  it("cuts the thread to its own depth: the core diameter is the diameter minus twice the depth", () => {
    const plan = threadBuildPlan({ width: 6, depth: 6, height: 10, threadRole: "screw", threadProfile: "custom", threadDiameter: 6, threadPitch: 1, threadDepth: 0.4, threadFlankAngle: 90, threadBoltClearance: 0 });
    expect(plan.major - plan.minor).toBeCloseTo(0.4, 10);
    expect(plan.profile.depthPerPitch).toBeCloseTo(0.4, 10);
  });

  it("is a profile of its own and knows nothing of the others' depth", () => {
    expect(isThreadProfile("custom")).toBe(true);
    const v = threadBuildPlan({ width: 6, depth: 6, height: 10, threadRole: "screw", threadProfile: "v", threadDiameter: 6, threadPitch: 1, threadDepth: 0.4, threadFlankAngle: 90, threadBoltClearance: 0 });
    expect(v.major - v.minor).toBeCloseTo(0.5413, 3);
  });

  it("follows a resize: the depth scales with the diameter and the angle stays", () => {
    const shape = { threadProfile: "custom" as const, threadDiameter: 6, threadPitch: 1, threadDepth: 0.7, threadFlankAngle: 45 };
    const natural = threadNaturalFootprint(threadSettings(shape));
    const patch = threadFootprintPatch({ ...shape, width: natural.width * 2, depth: natural.depth * 2 });
    expect(patch.threadFlankAngle).toBe(45);
    expect(patch.threadDiameter).toBeCloseTo(12, 6);
    expect(patch.threadDepth).toBeCloseTo(1.4, 6);
  });
});
