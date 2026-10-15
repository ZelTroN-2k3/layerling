import { describe, expect, it } from "vitest";
import { cadSketchRegions } from "@/lib/sketchCadProfile";
import { addLineIntersectionPoints, onlyMovesPoints } from "@/lib/sketchPointRefinement";
import { closedPathRegions, orderedPaths } from "@/lib/sketchPaths";
import { polygonInside } from "@/lib/sketchContainment";
import type { SketchProfile } from "@/types/layerling";

/*
 * Two shapes pushed over each other (#239, DrJones): they are two bodies and the sketch shows
 * them so - no hole where they overlap - and moving them does not weld them together.
 */

function square(prefix: string, x: number, z: number, size: number) {
  const points = [[x, z], [x + size, z], [x + size, z + size], [x, z + size]].map(([px, pz], index) => ({ id: `${prefix}p${index}`, x: px, z: pz }));
  const segments = points.map((point, index) => ({ id: `${prefix}s${index}`, startId: point.id, endId: points[(index + 1) % 4].id }));
  return { points, segments };
}

function profileOf(...squares: ReturnType<typeof square>[]): SketchProfile {
  return { points: squares.flatMap((entry) => entry.points), segments: squares.flatMap((entry) => entry.segments) };
}

describe("overlapping outlines", () => {
  it("are bodies side by side, not a hole, in the preview and in the body", () => {
    const profile = profileOf(square("a", 0, 0, 20), square("b", 12, 8, 20));
    const preview = closedPathRegions(orderedPaths(profile));
    expect(preview).toHaveLength(2);
    expect(preview.every((region) => region.holes.length === 0)).toBe(true);
    const body = cadSketchRegions(profile);
    expect(body).toHaveLength(2);
    expect(body.every((region) => region.holes.length === 0)).toBe(true);
  });

  it("stay bodies when the lines are cut where they cross", () => {
    let count = 0;
    const welded = addLineIntersectionPoints(profileOf(square("a", 0, 0, 20), square("b", 12, 8, 20)), (prefix) => `${prefix}-${++count}`);
    expect(welded.points.length).toBe(10);
    const regions = closedPathRegions(orderedPaths(welded));
    expect(regions).toHaveLength(2);
    expect(regions.every((region) => region.holes.length === 0)).toBe(true);
  });

  it("are a hole when one lies wholly inside the other", () => {
    const profile = profileOf(square("a", 0, 0, 40), square("b", 10, 10, 10));
    const regions = closedPathRegions(orderedPaths(profile));
    expect(regions).toHaveLength(1);
    expect(regions[0].holes).toHaveLength(1);
    expect(cadSketchRegions(profile)[0].holes).toHaveLength(1);
  });

  it("are a hole inside the island of a hole, nested three deep", () => {
    const regions = closedPathRegions(orderedPaths(profileOf(square("a", 0, 0, 60), square("b", 10, 10, 40), square("c", 20, 20, 20))));
    expect(regions).toHaveLength(2);
    expect(regions.map((region) => region.holes.length).sort()).toEqual([0, 1]);
  });

  it("an outline that shares a corner with the one around it is still inside", () => {
    const inner = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 10 }, { x: 0, z: 10 }];
    const outer = [{ x: 0, z: 0 }, { x: 40, z: 0 }, { x: 40, z: 40 }, { x: 0, z: 40 }];
    expect(polygonInside(inner, outer)).toBe(true);
    expect(polygonInside(outer, inner)).toBe(false);
  });
});

describe("moving shapes", () => {
  const before = profileOf(square("a", 0, 0, 20), square("b", 40, 0, 20));

  it("is told from drawing: the same points and lines in other places", () => {
    const moved = { ...before, points: before.points.map((point) => point.id.startsWith("b") ? { ...point, x: point.x - 28, z: point.z + 8 } : point) };
    expect(onlyMovesPoints(before, moved)).toBe(true);
    expect(onlyMovesPoints(before, before)).toBe(true);
  });

  it("is not a move when a line or a point is added, removed or joined to another", () => {
    expect(onlyMovesPoints(before, { ...before, points: before.points.slice(1) })).toBe(false);
    expect(onlyMovesPoints(before, { ...before, segments: before.segments.slice(1) })).toBe(false);
    const joined = { ...before, segments: before.segments.map((segment) => segment.id === "bs0" ? { ...segment, startId: "ap0" } : segment) };
    expect(onlyMovesPoints(before, joined)).toBe(false);
    const construction = { ...before, segments: before.segments.map((segment) => segment.id === "bs0" ? { ...segment, construction: true } : segment) };
    expect(onlyMovesPoints(before, construction)).toBe(false);
  });
});
