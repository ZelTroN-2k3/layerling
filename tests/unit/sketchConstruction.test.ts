import { describe, expect, it } from "vitest";
import { constructionCrossings, constructionSegmentCount, crossingOfPieces, solidSketchProfile, withSegmentsConstruction } from "@/lib/sketchConstruction";
import { orderedPaths } from "@/lib/sketchPaths";
import { cadSketchRegions, orderedCadSketchPaths } from "@/lib/sketchCadProfile";
import type { SketchProfile } from "@/types/layerling";

const square: SketchProfile = {
  points: [
    { id: "a", x: 0, z: 0 }, { id: "b", x: 40, z: 0 }, { id: "c", x: 40, z: 40 }, { id: "d", x: 0, z: 40 },
    { id: "e", x: 20, z: -10 }, { id: "f", x: 20, z: 50 },
    { id: "g", x: -10, z: 20 }, { id: "h", x: 50, z: 20 },
  ],
  segments: [
    { id: "ab", startId: "a", endId: "b", kind: "line" },
    { id: "bc", startId: "b", endId: "c", kind: "line" },
    { id: "cd", startId: "c", endId: "d", kind: "line" },
    { id: "da", startId: "d", endId: "a", kind: "line" },
    { id: "ef", startId: "e", endId: "f", kind: "line", construction: true },
    { id: "gh", startId: "g", endId: "h", kind: "line", construction: true },
  ],
};

describe("construction lines (#229)", () => {
  it("counts them and drops them with their own points only", () => {
    expect(constructionSegmentCount(square)).toBe(2);
    const solid = solidSketchProfile(square);
    expect(solid.segments.map((segment) => segment.id)).toEqual(["ab", "bc", "cd", "da"]);
    expect(solid.points.map((point) => point.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("keeps a point that a solid line also uses", () => {
    const shared: SketchProfile = { ...square, segments: [...square.segments, { id: "ae", startId: "a", endId: "e", kind: "line", construction: true }] };
    expect(solidSketchProfile(shared).points.map((point) => point.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("leaves a profile without construction lines as the same object", () => {
    const plain: SketchProfile = { points: square.points.slice(0, 4), segments: square.segments.slice(0, 4) };
    expect(solidSketchProfile(plain)).toBe(plain);
  });

  it("does not turn a construction line into outline, region or open path", () => {
    expect(orderedPaths(square)).toHaveLength(1);
    expect(orderedPaths(square)[0].closed).toBe(true);
    const cad = orderedCadSketchPaths(square);
    expect(cad).toHaveLength(1);
    expect(cad[0].closed).toBe(true);
    expect(cadSketchRegions(square)).toHaveLength(1);
  });

  it("a sketch with only construction lines has no outline at all", () => {
    const only: SketchProfile = { points: square.points.slice(4), segments: square.segments.slice(4) };
    expect(orderedPaths(only)).toHaveLength(0);
    expect(cadSketchRegions(only)).toHaveLength(0);
  });

  it("sets and takes off the mark", () => {
    const marked = withSegmentsConstruction(square, new Set(["ab"]), true);
    expect(marked.segments.find((segment) => segment.id === "ab")?.construction).toBe(true);
    const back = withSegmentsConstruction(marked, new Set(["ab"]), false);
    expect(back.segments.find((segment) => segment.id === "ab")).toEqual({ id: "ab", startId: "a", endId: "b", kind: "line" });
    expect("construction" in (back.segments.find((segment) => segment.id === "ab") ?? {})).toBe(false);
  });

  it("finds where two pieces cross and where they do not", () => {
    expect(crossingOfPieces([{ x: 0, z: 0 }, { x: 10, z: 10 }], [{ x: 0, z: 10 }, { x: 10, z: 0 }])).toEqual({ x: 5, z: 5 });
    expect(crossingOfPieces([{ x: 0, z: 0 }, { x: 10, z: 0 }], [{ x: 0, z: 5 }, { x: 10, z: 5 }])).toBeNull();
    expect(crossingOfPieces([{ x: 0, z: 0 }, { x: 4, z: 4 }], [{ x: 0, z: 10 }, { x: 10, z: 0 }])).toBeNull();
  });

  it("snaps to the crossings of a construction line with other lines", () => {
    const crossings = constructionCrossings(square);
    // The two construction lines cross in the middle; each also crosses two sides of the square.
    expect(crossings).toContainEqual({ x: 20, z: 20 });
    expect(crossings).toContainEqual({ x: 20, z: 0 });
    expect(crossings).toContainEqual({ x: 20, z: 40 });
    expect(crossings).toContainEqual({ x: 0, z: 20 });
    expect(crossings).toContainEqual({ x: 40, z: 20 });
    expect(crossings).toHaveLength(5);
  });

  it("finds nothing without a construction line", () => {
    expect(constructionCrossings({ points: square.points.slice(0, 4), segments: square.segments.slice(0, 4) })).toEqual([]);
  });
});
