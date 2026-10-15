import { describe, expect, it } from "vitest";
import { sketchPrimitiveGeometry } from "@/lib/sketchPrimitives";
import { withSegmentHandles, withSmoothSketchHandles } from "@/lib/sketchSmoothHandles";
import type { SketchProfile } from "@/types/layerling";

let counter = 0;
const makeId = (prefix: string) => `${prefix}-${(counter += 1)}`;

describe("smooth sketch handles", () => {
  it("leaves a circle and a line alone when a smooth curve is added elsewhere", () => {
    const circle = sketchPrimitiveGeometry("circle", { x: 0, z: 0 }, makeId);
    const line: SketchProfile = {
      points: [
        { id: "l1", x: 50, z: 0, mode: "corner" },
        { id: "l2", x: 50, z: 30, mode: "corner" },
      ],
      segments: [{ id: "ls", startId: "l1", endId: "l2", kind: "line" }],
    };
    const smooth: SketchProfile = {
      points: [
        { id: "s1", x: -50, z: 0, mode: "smooth" },
        { id: "s2", x: -40, z: 20, mode: "smooth" },
        { id: "s3", x: -30, z: 0, mode: "smooth" },
      ],
      segments: [
        { id: "ss1", startId: "s1", endId: "s2", kind: "smooth" },
        { id: "ss2", startId: "s2", endId: "s3", kind: "smooth" },
      ],
    };
    const before: SketchProfile = {
      points: [...circle.points, ...line.points, ...smooth.points],
      segments: [...circle.segments, ...line.segments, ...smooth.segments],
    };
    const after = withSmoothSketchHandles(before);
    for (const point of [...circle.points, ...line.points]) {
      const next = after.points.find((entry) => entry.id === point.id);
      expect(next).toEqual(point);
    }
    const middle = after.points.find((entry) => entry.id === "s2");
    expect(middle?.handleIn).toBeDefined();
    expect(middle?.handleOut).toBeDefined();
    expect(middle!.handleIn!.x + middle!.handleOut!.x).toBeCloseTo(middle!.x * 2);
    expect(Math.abs(middle!.handleOut!.x - middle!.x)).toBeGreaterThan(0);
  });

  it("still smooths the curve that was drawn", () => {
    const profile: SketchProfile = {
      points: [
        { id: "a", x: 0, z: 0 },
        { id: "b", x: 10, z: 10 },
        { id: "c", x: 20, z: 0 },
      ],
      segments: [
        { id: "s1", startId: "a", endId: "b", kind: "smooth" },
        { id: "s2", startId: "b", endId: "c", kind: "smooth" },
      ],
    };
    const after = withSmoothSketchHandles(profile);
    expect(after.points.every((point) => point.mode === "smooth" && point.handleIn && point.handleOut)).toBe(true);
  });
});

describe("the point button 'smooth' (#171)", () => {
  const square = (): SketchProfile => {
    const points = [{ id: "a", x: 0, z: 0 }, { id: "b", x: 40, z: 0 }, { id: "c", x: 40, z: 40 }, { id: "d", x: 0, z: 40 }];
    return { points, segments: points.map((p, i) => ({ id: `s${i}`, kind: "line" as const, startId: p.id, endId: points[(i + 1) % 4].id })) };
  };

  it("gives the chosen point its handles even though its lines are not smooth curves yet", () => {
    const profile = square();
    const next = withSmoothSketchHandles(profile, new Set(["b"]));
    const b = next.points.find((point) => point.id === "b")!;
    expect(b.handleIn && b.handleOut).toBeTruthy();
    expect(b.mode).toBe("smooth");
    // The others keep what they had.
    expect(next.points.find((point) => point.id === "a")).toEqual(profile.points[0]);
  });

  it("gives the curved segments around it the handles they lack at their other ends", () => {
    const profile = square();
    profile.segments = profile.segments.map((segment) => ({ ...segment, kind: segment.startId === "b" || segment.endId === "b" ? "bezier" as const : "line" as const }));
    const next = withSegmentHandles(withSmoothSketchHandles(profile, new Set(["b"])), new Set(["s0", "s1"]));
    const byId = (id: string) => next.points.find((point) => point.id === id)!;
    // s0 runs a -> b and s1 b -> c: a needs its out handle, c its in handle.
    expect(byId("a").handleOut).toEqual({ x: 40 / 3, z: 0 });
    expect(byId("c").handleIn).toEqual({ x: 40, z: 40 - 40 / 3 });
    // A handle that is there is not replaced, and a line segment is left alone.
    expect(byId("b").handleOut).toBeDefined();
    expect(byId("d").handleIn).toBeUndefined();
  });
});
