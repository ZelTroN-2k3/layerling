import { describe, expect, it } from "vitest";
import {
  applySketchChamfer,
  applySketchCorners,
  applySketchFillet,
  canApplySketchCornerTreatment,
  getCornerGeometryInfo,
} from "@/lib/sketchFilletChamfer";
import type { SketchProfile } from "@/types/layerling";

function createSquareProfile(): SketchProfile {
  return {
    points: [
      { id: "p1", x: 0, z: 0, mode: "corner" },
      { id: "p2", x: 20, z: 0, mode: "corner" },
      { id: "p3", x: 20, z: 20, mode: "corner" },
      { id: "p4", x: 0, z: 20, mode: "corner" },
    ],
    segments: [
      { id: "s1", startId: "p1", endId: "p2", kind: "line" },
      { id: "s2", startId: "p2", endId: "p3", kind: "line" },
      { id: "s3", startId: "p3", endId: "p4", kind: "line" },
      { id: "s4", startId: "p4", endId: "p1", kind: "line" },
    ],
  };
}

let counter = 0;
const idFactory = (prefix: string) => `${prefix}-${++counter}`;

describe("sketchFilletChamfer", () => {
  it("identifies valid corner points and rejects collinear/isolated points", () => {
    const profile = createSquareProfile();
    expect(canApplySketchCornerTreatment(profile, "p2")).toBe(true);

    // Isolated point
    const withIsolated: SketchProfile = {
      ...profile,
      points: [...profile.points, { id: "p-iso", x: 50, z: 50 }],
    };
    expect(canApplySketchCornerTreatment(withIsolated, "p-iso")).toBe(false);

    // Collinear point along line
    const withCollinear: SketchProfile = {
      points: [
        { id: "a", x: 0, z: 0 },
        { id: "b", x: 10, z: 0 },
        { id: "c", x: 20, z: 0 },
      ],
      segments: [
        { id: "s-ab", startId: "a", endId: "b", kind: "line" },
        { id: "s-bc", startId: "b", endId: "c", kind: "line" },
      ],
    };
    expect(canApplySketchCornerTreatment(withCollinear, "b")).toBe(false);
  });

  it("applies a 2D chamfer to a 90-degree corner", () => {
    const profile = createSquareProfile();
    const result = applySketchChamfer(profile, "p2", 5, idFactory);
    expect(result).not.toBeNull();
    const next = result!.profile;

    // Corner p2 is removed, replaced by two new points
    expect(next.points.some((p) => p.id === "p2")).toBe(false);
    expect(next.points.length).toBe(profile.points.length + 1); // 4 - 1 + 2 = 5
    expect(next.segments.length).toBe(profile.segments.length + 1); // 4 + 1 = 5

    // The two new points are at distance 5 from (20, 0) along the edges
    const [idA, idB] = result!.newPointIds;
    const ptA = next.points.find((p) => p.id === idA)!;
    const ptB = next.points.find((p) => p.id === idB)!;

    // From (20,0) towards (0,0): (15, 0)
    // From (20,0) towards (20,20): (20, 5)
    const pts = [ptA, ptB].sort((l, r) => l.x - r.x);
    expect(pts[0].x).toBeCloseTo(15, 4);
    expect(pts[0].z).toBeCloseTo(0, 4);
    expect(pts[1].x).toBeCloseTo(20, 4);
    expect(pts[1].z).toBeCloseTo(5, 4);

    // New segment connects them as a line
    const chamferSeg = next.segments.find(
      (s) => (s.startId === idA && s.endId === idB) || (s.startId === idB && s.endId === idA),
    )!;
    expect(chamferSeg.kind).toBe("line");
  });

  it("applies a 2D fillet to a 90-degree corner", () => {
    const profile = createSquareProfile();
    const result = applySketchFillet(profile, "p2", 4, idFactory);
    expect(result).not.toBeNull();
    const next = result!.profile;

    expect(next.points.some((p) => p.id === "p2")).toBe(false);
    expect(next.points.length).toBe(5);
    expect(next.segments.length).toBe(5);

    const [idA, idB] = result!.newPointIds;
    const ptA = next.points.find((p) => p.id === idA)!;
    const ptB = next.points.find((p) => p.id === idB)!;

    // Setback t = 4 for 90° corner
    const pts = [ptA, ptB].sort((l, r) => l.x - r.x);
    expect(pts[0].x).toBeCloseTo(16, 4);
    expect(pts[0].z).toBeCloseTo(0, 4);
    expect(pts[1].x).toBeCloseTo(20, 4);
    expect(pts[1].z).toBeCloseTo(4, 4);

    // Connecting segment is a bezier curve
    const filletSeg = next.segments.find(
      (s) => (s.startId === idA && s.endId === idB) || (s.startId === idB && s.endId === idA),
    )!;
    expect(filletSeg.kind).toBe("bezier");

    // Tangent handles point towards the former corner (20, 0)
    expect(ptA.handleOut || ptA.handleIn).toBeDefined();
    expect(ptB.handleOut || ptB.handleIn).toBeDefined();
  });

  it("clamps setback when requested radius exceeds segment lengths", () => {
    const profile = createSquareProfile();
    // Square side length is 20, max setback is 20 * 0.9 = 18
    const result = applySketchFillet(profile, "p2", 50, idFactory);
    expect(result).not.toBeNull();
    const [idA, idB] = result!.newPointIds;
    const ptA = result!.profile.points.find((p) => p.id === idA)!;
    const ptB = result!.profile.points.find((p) => p.id === idB)!;

    const distA = Math.hypot(ptA.x - 20, ptA.z - 0);
    const distB = Math.hypot(ptB.x - 20, ptB.z - 0);
    expect(distA).toBeLessThanOrEqual(18.01);
    expect(distB).toBeLessThanOrEqual(18.01);
  });
  it("leaves corners on a curve alone", () => {
    const profile: SketchProfile = {
      points: [
        { id: "a", x: 0, z: 0 },
        { id: "b", x: 10, z: 0, mode: "corner" },
        { id: "c", x: 10, z: 10, handleIn: { x: 14, z: 6 } },
      ],
      segments: [
        { id: "ab", startId: "a", endId: "b", kind: "line" },
        { id: "bc", startId: "b", endId: "c", kind: "bezier" },
      ],
    } as SketchProfile;
    expect(canApplySketchCornerTreatment(profile, "b")).toBe(false);
  });
});

describe("several corners at once (#269)", () => {
  /** A 40 x 20 rectangle. */
  const rectangle = (): SketchProfile => ({
    points: [
      { id: "p1", x: 0, z: 0, mode: "corner" },
      { id: "p2", x: 40, z: 0, mode: "corner" },
      { id: "p3", x: 40, z: 20, mode: "corner" },
      { id: "p4", x: 0, z: 20, mode: "corner" },
    ],
    segments: [
      { id: "s1", startId: "p1", endId: "p2", kind: "line" },
      { id: "s2", startId: "p2", endId: "p3", kind: "line" },
      { id: "s3", startId: "p3", endId: "p4", kind: "line" },
      { id: "s4", startId: "p4", endId: "p1", kind: "line" },
    ],
  });

  it("rounds all four corners in one go, every one with the same radius", () => {
    const result = applySketchCorners(rectangle(), ["p1", "p2", "p3", "p4"], "fillet", 3, idFactory)!;
    expect(result.applied).toBe(4);
    expect(result.skipped).toBe(0);
    // Each corner became two points and a curve between them: eight points, eight sides.
    expect(result.profile.points).toHaveLength(8);
    expect(result.profile.segments).toHaveLength(8);
    expect(result.profile.segments.filter((segment) => segment.kind === "bezier")).toHaveLength(4);
  });

  it("shares a side fairly when the radius is larger than two corners can have", () => {
    // 15 mm would want 15 mm of every side; the 20 mm side is shared by two corners, so each gets 45 % of it, 9 mm, and a sliver stays between them.
    const result = applySketchCorners(rectangle(), ["p1", "p2", "p3", "p4"], "chamfer", 15, idFactory)!;
    const points = result.profile.points;
    const corner = (x: number, z: number) => points.filter((point) => Math.hypot(point.x - x, point.z - z) < 9.01);
    // At the corner (0,0): its two new points lie 9 mm along each side.
    const near = corner(0, 0);
    expect(near).toHaveLength(2);
    expect(near.map((point) => Math.round(Math.hypot(point.x, point.z) * 100) / 100).sort()).toEqual([9, 9]);
    // And the same at the opposite corner, not 15 at one and a few millimetres at the other.
    const far = points.filter((point) => Math.hypot(point.x - 40, point.z - 20) < 9.01);
    expect(far).toHaveLength(2);
    expect(far.map((point) => Math.round(Math.hypot(point.x - 40, point.z - 20) * 100) / 100).sort()).toEqual([9, 9]);
  });

  it("treats the corners it can and counts the others", () => {
    const profile = rectangle();
    profile.points.push({ id: "alone", x: 100, z: 100 });
    const result = applySketchCorners(profile, ["p1", "p3", "alone"], "fillet", 2, idFactory)!;
    expect(result.applied).toBe(2);
    expect(result.skipped).toBe(1);
  });

  it("does nothing when none of the points is a corner", () => {
    const profile = rectangle();
    profile.points.push({ id: "alone", x: 100, z: 100 });
    expect(applySketchCorners(profile, ["alone"], "fillet", 2, idFactory)).toBeNull();
  });

  it("gives one corner what a single corner gets", () => {
    const one = applySketchFillet(rectangle(), "p1", 3, idFactory)!;
    const viaMany = applySketchCorners(rectangle(), ["p1"], "fillet", 3, idFactory)!;
    expect(viaMany.applied).toBe(1);
    const strip = (profile: SketchProfile) => profile.points.map((point) => `${point.x.toFixed(4)},${point.z.toFixed(4)}`).sort();
    expect(strip(viaMany.profile)).toEqual(strip(one.profile));
  });
});
