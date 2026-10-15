import { describe, expect, it } from "vitest";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import {
  createThreadGeometry,
  normalizeThreadAxialClearance,
  threadAxialClearanceLimit,
  threadBuildPlan,
  threadNaturalFootprint,
  threadProfileShape,
  threadSettings,
  widenThreadProfile,
} from "@/lib/threadGeometry";
import { cadModifierThreadForShape } from "@/lib/cadProfileExtrusion";
import { THREAD_PROFILES } from "@/lib/threadProfiles";

/*
 * Play along the axis for a nut or tapped hole (#256): the clearance works on the diameter and
 * opens the flanks only to about 0.58 of its value, so a vertical gap took a wide diameter and
 * brought a sideways slop. The new value thins each tooth of the part along the axis and leaves
 * the diameter alone.
 */

type Point = { u: number; level: number };

function levelAt(points: readonly Point[], u: number) {
  const phase = ((u % 1) + 1) % 1;
  for (let index = 0; index < points.length; index += 1) {
    const start = points[index];
    const end = index + 1 < points.length ? points[index + 1] : { u: 1, level: points[0].level };
    if (phase <= end.u) return end.u > start.u ? start.level + (end.level - start.level) * ((phase - start.u) / (end.u - start.u)) : end.level;
  }
  return points[0].level;
}

/** How much of one pitch lies at or above a level - the thickness of the cutter's tooth there. */
function widthAbove(points: readonly Point[], level: number, steps = 20000) {
  let count = 0;
  for (let index = 0; index < steps; index += 1) if (levelAt(points, (index + 0.5) / steps) >= level) count += 1;
  return count / steps;
}

describe("widening a thread profile along the axis", () => {
  it("leaves the profile as it is for no play", () => {
    for (const name of THREAD_PROFILES) {
      const base = threadProfileShape(name).points;
      expect(widenThreadProfile(base, 0)).toEqual(base.map((point) => ({ ...point })));
    }
  });

  it("makes the tooth wider by exactly the play at every level, for the straight profiles", () => {
    for (const name of ["v", "trapezoidal"] as const) {
      const base = threadProfileShape(name).points;
      const wide = widenThreadProfile(base, 0.1);
      for (const level of [0.2, 0.5, 0.8]) {
        expect(widthAbove(wide, level) - widthAbove(base, level)).toBeCloseTo(0.1, 3);
      }
    }
  });

  it("never takes anything away, for any profile", () => {
    for (const name of THREAD_PROFILES) {
      const base = threadProfileShape(name).points;
      const wide = widenThreadProfile(base, 0.08);
      for (let index = 0; index < 400; index += 1) {
        const u = index / 400;
        expect(levelAt(wide, u)).toBeGreaterThanOrEqual(levelAt(base, u) - 1e-9);
      }
    }
  });

  it("keeps a profile that starts at u = 0 on the crest and runs upwards", () => {
    for (const name of THREAD_PROFILES) {
      const wide = widenThreadProfile(threadProfileShape(name).points, 0.1);
      expect(wide[0].u).toBe(0);
      expect(wide[0].level).toBeCloseTo(1, 9);
      for (let index = 1; index < wide.length; index += 1) expect(wide[index].u).toBeGreaterThan(wide[index - 1].u);
      expect(wide[wide.length - 1].u).toBeLessThan(1);
    }
  });
});

describe("axial clearance of a thread", () => {
  it("is limited to a fifth of the pitch and to 1 mm", () => {
    expect(threadAxialClearanceLimit(1)).toBeCloseTo(0.2, 9);
    expect(threadAxialClearanceLimit(2)).toBeCloseTo(0.4, 9);
    expect(threadAxialClearanceLimit(12)).toBe(1);
    expect(normalizeThreadAxialClearance(5, 1)).toBeCloseTo(0.2, 9);
    expect(normalizeThreadAxialClearance(-1, 1)).toBe(0);
    expect(normalizeThreadAxialClearance(undefined, 1)).toBe(0);
    expect(threadSettings({ threadPitch: 1, threadAxialClearance: 0.15 }).axialClearance).toBeCloseTo(0.15, 9);
  });

  it("changes a nut and a tapped hole, not a rod or a screw", () => {
    const base = { width: 10, depth: 10, height: 6, threadDiameter: 6, threadPitch: 1 };
    for (const threadRole of ["nut", "bore"] as const) {
      const plain = threadBuildPlan({ ...base, threadRole });
      const play = threadBuildPlan({ ...base, threadRole, threadAxialClearance: 0.2 });
      expect(plain.axialPlay).toBe(false);
      expect(play.axialPlay).toBe(true);
      expect(play.major).toBeCloseTo(plain.major, 9);
      expect(play.minor).toBeCloseTo(plain.minor, 9);
      expect(widthAbove(play.profile.points, 0.5)).toBeGreaterThan(widthAbove(plain.profile.points, 0.5) + 0.19);
    }
    for (const threadRole of ["rod", "screw"] as const) {
      const plan = threadBuildPlan({ ...base, threadRole, threadAxialClearance: 0.2 });
      expect(plan.axialPlay).toBe(false);
    }
  });

  it("builds a closed nut with play, for the profiles that close without it", () => {
    // The round profile leaves a few odd edges even with no play; it is only checked for sane numbers.
    for (const threadProfile of THREAD_PROFILES) {
      const settings = threadSettings({ threadRole: "nut", threadDiameter: 8, threadPitch: 1.25, threadProfile, threadAxialClearance: 0.25 });
      const footprint = threadNaturalFootprint(settings);
      const geometry = createThreadGeometry({ width: footprint.width, depth: footprint.depth, height: 7, threadRole: "nut", threadDiameter: 8, threadPitch: 1.25, threadProfile, threadAxialClearance: 0.25 });
      const position = geometry.getAttribute("position");
      expect(position.count).toBeGreaterThan(1000);
      for (let index = 0; index < position.count; index += 1) {
        expect(Number.isFinite(position.getX(index) + position.getY(index) + position.getZ(index))).toBe(true);
      }
      const uses = new Map<string, number>();
      const key = (index: number) => [position.getX(index), position.getY(index), position.getZ(index)].map((value) => value.toFixed(5)).join(",");
      for (let index = 0; index + 2 < position.count; index += 3) {
        const corners = [key(index), key(index + 1), key(index + 2)];
        for (let edge = 0; edge < 3; edge += 1) {
          const a = corners[edge];
          const b = corners[(edge + 1) % 3];
          const id = a < b ? `${a}:${b}` : `${b}:${a}`;
          uses.set(id, (uses.get(id) ?? 0) + 1);
        }
      }
      if (threadProfile !== "round") expect([...uses.values()].every((count) => count === 2)).toBe(true);
    }
  });

  it("gives the exact body the same widened profile, and no true arcs for a widened Whitworth thread", () => {
    const shape = makeShapeFromAsset(toolbarShapeAssets.find((asset) => asset.kind === "thread")!, { x: 0, z: 0 }, {
      threadRole: "nut", threadProfile: "whitworth", threadDiameter: 8, threadPitch: 1.25, threadAxialClearance: 0.2,
    });
    const part = cadModifierThreadForShape(canonicalizeShape(shape));
    expect(part).not.toBeNull();
    expect(part!.curve).toBeUndefined();
    const plain = cadModifierThreadForShape(canonicalizeShape({ ...shape, threadAxialClearance: 0 }));
    expect(plain!.curve?.kind).toBe("whitworth");
    expect(part!.profile.length).not.toBe(plain!.profile.length);
  });

  it("is kept in a saved project and a new thread starts with none", async () => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "thread")!;
    expect(makeShapeFromAsset(asset, { x: 0, z: 0 }).threadAxialClearance).toBe(0);
    const shape = canonicalizeShape(makeShapeFromAsset(asset, { x: 4, z: 6 }, { threadRole: "nut", threadDiameter: 8, threadPitch: 1.25, threadAxialClearance: 0.2 }));
    expect(shape.threadAxialClearance).toBeCloseTo(0.2, 9);
    const shapes = [shape];
    const bytes = await exportLylProject({
      projectId: "project-thread",
      projectName: "Gewinde",
      createdAt: 1_700_000_000_000,
      modifiedAt: 1_700_000_100_000,
      shapes,
      history: [editorHistoryEntry(shapes, [])],
      historyIndex: 0,
      assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      snapGrid: DEFAULT_SNAP_GRID,
      placementElevation: 0,
    });
    const restored = await importLylProject(bytes);
    expect(restored.shapes[0].threadAxialClearance).toBeCloseTo(0.2, 9);
  });
});
