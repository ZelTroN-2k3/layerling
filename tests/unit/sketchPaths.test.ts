import { describe, expect, it } from "vitest";
import { closedPathAt, orderedPaths } from "@/lib/sketchPaths";
import type { SketchPoint, SketchProfile, SketchSegment } from "@/types/layerling";

function square(prefix: string, minX: number, minZ: number, size: number): SketchProfile {
  const corners = [[minX, minZ], [minX + size, minZ], [minX + size, minZ + size], [minX, minZ + size]];
  const points: SketchPoint[] = corners.map(([x, z], index) => ({ id: `${prefix}-p${index}`, x, z }));
  const segments: SketchSegment[] = points.map((point, index) => ({
    id: `${prefix}-s${index}`,
    startId: point.id,
    endId: points[(index + 1) % points.length].id,
    kind: "line",
  }));
  return { points, segments };
}

function merge(...profiles: SketchProfile[]): SketchProfile {
  return { points: profiles.flatMap((profile) => profile.points), segments: profiles.flatMap((profile) => profile.segments) };
}

function segmentIds(profile: SketchProfile, point: { x: number; z: number }) {
  return closedPathAt(point, orderedPaths(profile))?.steps.map((step) => step.segment.id).sort() ?? null;
}

describe("sketch paths", () => {
  it("finds the closed shape around a click with all its points and lines", () => {
    const shape = closedPathAt({ x: 5, z: 5 }, orderedPaths(square("a", 0, 0, 10)));
    expect(shape?.points.map((point) => point.id).sort()).toEqual(["a-p0", "a-p1", "a-p2", "a-p3"]);
    expect(shape?.steps.map((step) => step.segment.id).sort()).toEqual(["a-s0", "a-s1", "a-s2", "a-s3"]);
  });

  it("finds nothing outside every shape or inside an open path", () => {
    const closed = square("a", 0, 0, 10);
    expect(closedPathAt({ x: 15, z: 5 }, orderedPaths(closed))).toBeNull();
    const open = { points: closed.points, segments: closed.segments.slice(0, 3) };
    expect(closedPathAt({ x: 5, z: 5 }, orderedPaths(open))).toBeNull();
  });

  it("picks the innermost shape when shapes are nested", () => {
    const profile = merge(square("outer", 0, 0, 20), square("hole", 5, 5, 10));
    expect(segmentIds(profile, { x: 10, z: 10 })).toEqual(["hole-s0", "hole-s1", "hole-s2", "hole-s3"]);
    expect(segmentIds(profile, { x: 2, z: 10 })).toEqual(["outer-s0", "outer-s1", "outer-s2", "outer-s3"]);
  });

  it("follows the curve of a bezier outline, not its straight chords", () => {
    // A half disc: a straight base from (-10, 0) to (10, 0) closed by a curve bulging up to z = 7.5.
    const profile: SketchProfile = {
      points: [
        { id: "l", x: -10, z: 0, handleOut: { x: -10, z: 10 } },
        { id: "r", x: 10, z: 0, handleIn: { x: 10, z: 10 } },
        { id: "m", x: 0, z: -0.001 },
      ],
      segments: [
        { id: "arc", startId: "l", endId: "r", kind: "bezier" },
        { id: "base-r", startId: "r", endId: "m", kind: "line" },
        { id: "base-l", startId: "m", endId: "l", kind: "line" },
      ],
    };
    expect(segmentIds(profile, { x: 0, z: 6 })).toEqual(["arc", "base-l", "base-r"]);
    expect(segmentIds(profile, { x: 0, z: 8 })).toBeNull();
  });
});
