import { describe, expect, it } from "vitest";
import { curveSketchSegment, isSegmentCurved, straightenSketchSegment } from "@/lib/sketchSegmentCurve";
import type { SketchProfile } from "@/types/layerling";

function rectangle(): SketchProfile {
  const points = [{ id: "a", x: 0, z: 0 }, { id: "b", x: 40, z: 0 }, { id: "c", x: 40, z: 20 }, { id: "d", x: 0, z: 20 }];
  return { points, segments: points.map((p, i) => ({ id: `s${i}`, kind: "line" as const, startId: p.id, endId: points[(i + 1) % 4].id })) };
}

describe("curving a straight side of a sketch (#171)", () => {
  it("bows the top side of a rectangle outwards, away from the middle", () => {
    const profile = rectangle();
    const curved = curveSketchSegment(profile, "s0")!;
    expect(curved.segments.find((s) => s.id === "s0")?.kind).toBe("bezier");
    expect(isSegmentCurved(curved, curved.segments[0])).toBe(true);
    const a = curved.points.find((p) => p.id === "a")!;
    const b = curved.points.find((p) => p.id === "b")!;
    // The top side runs along z = 0; the rectangle lies below it (larger z), so the bow goes up (smaller z).
    expect(a.handleOut!.z).toBeLessThan(0);
    expect(b.handleIn!.z).toBeLessThan(0);
    expect(a.handleOut!.x).toBeCloseTo(40 / 3, 9);
    expect(b.handleIn!.x).toBeCloseTo(40 - 40 / 3, 9);
    expect(Math.abs(a.handleOut!.z)).toBeCloseTo(10, 9);
    // The other sides stay straight, and the input is untouched.
    expect(curved.segments.filter((s) => s.kind === "line")).toHaveLength(3);
    expect(profile.points[0].handleOut).toBeUndefined();
  });

  it("bows the bottom side downwards, whichever way it was drawn", () => {
    const flipped = rectangle();
    flipped.segments[2] = { id: "s2", kind: "line", startId: "d", endId: "c" };
    const curved = curveSketchSegment(flipped, "s2")!;
    const d = curved.points.find((p) => p.id === "d")!;
    expect(d.handleOut!.z).toBeGreaterThan(20);
  });

  it("bows an open line to its left and refuses a point on itself", () => {
    const open: SketchProfile = { points: [{ id: "a", x: 0, z: 0 }, { id: "b", x: 20, z: 0 }], segments: [{ id: "s", kind: "line", startId: "a", endId: "b" }] };
    const curved = curveSketchSegment(open, "s")!;
    expect(isSegmentCurved(curved, curved.segments[0])).toBe(true);
    expect(curveSketchSegment(open, "missing")).toBeNull();
  });

  it("straightens it again and removes the handles it alone used", () => {
    const curved = curveSketchSegment(rectangle(), "s0")!;
    const straight = straightenSketchSegment(curved, "s0")!;
    expect(straight.segments.find((s) => s.id === "s0")?.kind).toBe("line");
    expect(straight.points.find((p) => p.id === "a")?.handleOut).toBeUndefined();
    expect(straight.points.find((p) => p.id === "b")?.handleIn).toBeUndefined();
    expect(straightenSketchSegment(straight, "s0")).toBeNull();
  });

  it("keeps a handle that another curve still needs", () => {
    // Two curved sides that both start at a (the left one drawn the other way round).
    const profile = rectangle();
    profile.segments[3] = { id: "s3", kind: "line", startId: "a", endId: "d" };
    const both = curveSketchSegment(curveSketchSegment(profile, "s0")!, "s3")!;
    const straight = straightenSketchSegment(both, "s0")!;
    expect(isSegmentCurved(straight, straight.segments.find((s) => s.id === "s3")!)).toBe(true);
    expect(straight.points.find((p) => p.id === "a")?.handleOut).toBeDefined();
  });
});
