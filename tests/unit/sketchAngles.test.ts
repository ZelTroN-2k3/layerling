import { describe, expect, it } from "vitest";
import { applyCornerAngle, sketchCornerAt } from "@/lib/sketchAngles";
import type { SketchPoint, SketchProfile } from "@/types/layerling";

function polygon(coordinates: Array<[number, number]>): SketchProfile {
  const points: SketchPoint[] = coordinates.map(([x, z], index) => ({ id: `p${index}`, x, z }));
  return {
    points,
    segments: points.map((point, index) => ({ id: `s${index}`, kind: "line" as const, startId: point.id, endId: points[(index + 1) % points.length].id })),
  };
}

const angleAt = (profile: SketchProfile, id: string) => sketchCornerAt(profile, id)?.degrees;

describe("corner angles in a sketch", () => {
  it("reads 90 degrees at every corner of a rectangle, whichever way it was drawn", () => {
    const clockwise = polygon([[0, 0], [40, 0], [40, 20], [0, 20]]);
    const counter = polygon([[0, 0], [0, 20], [40, 20], [40, 0]]);
    for (const profile of [clockwise, counter]) {
      profile.points.forEach((point) => expect(angleAt(profile, point.id)).toBeCloseTo(90, 6));
    }
  });

  it("reads the inside of an outline: a dent is above 180 degrees", () => {
    // An L: the corner at (20, 20) points into the shape.
    const l = polygon([[0, 0], [40, 0], [40, 20], [20, 20], [20, 40], [0, 40]]);
    expect(angleAt(l, "p3")).toBeCloseTo(270, 6);
    expect(angleAt(l, "p0")).toBeCloseTo(90, 6);
    const reversed = polygon([[0, 40], [20, 40], [20, 20], [40, 20], [40, 0], [0, 0]]);
    expect(angleAt(reversed, "p2")).toBeCloseTo(270, 6);
  });

  it("reads the smaller angle on open lines, and nothing where it is not a plain corner", () => {
    const open: SketchProfile = {
      points: [{ id: "a", x: 0, z: 0 }, { id: "b", x: 10, z: 0 }, { id: "c", x: 10 + 5, z: 5 * Math.sqrt(3) }],
      segments: [{ id: "ab", kind: "line", startId: "a", endId: "b" }, { id: "bc", kind: "line", startId: "b", endId: "c" }],
    };
    expect(angleAt(open, "b")).toBeCloseTo(120, 6);
    expect(sketchCornerAt(open, "a")).toBeNull();
    const curved: SketchProfile = {
      ...open,
      segments: [open.segments[0], { id: "bc", kind: "bezier", startId: "b", endId: "c" }],
      points: open.points.map((point) => point.id === "b" ? { ...point, handleOut: { x: 12, z: 2 } } : point.id === "c" ? { ...point, handleIn: { x: 13, z: 3 } } : point),
    };
    expect(sketchCornerAt(curved, "b")).toBeNull();
    const star: SketchProfile = {
      points: [...open.points, { id: "d", x: 10, z: -10 }],
      segments: [...open.segments, { id: "bd", kind: "line", startId: "b", endId: "d" }],
    };
    expect(sketchCornerAt(star, "b")).toBeNull();
  });
});

describe("typing an angle", () => {
  const square = () => polygon([[0, 0], [40, 0], [40, 40], [0, 40]]);

  it("turns the following line about the corner and keeps its length", () => {
    const profile = square();
    const corner = sketchCornerAt(profile, "p1")!;
    const turned = applyCornerAngle(profile.points, corner, 60, "after");
    const next = { ...profile, points: turned };
    expect(angleAt(next, "p1")).toBeCloseTo(60, 6);
    const moved = turned.find((point) => point.id === corner.after.far.id)!;
    expect(Math.hypot(moved.x - 40, moved.z - 0)).toBeCloseTo(40, 6);
    // The other line did not move.
    const stay = turned.find((point) => point.id === corner.before.far.id)!;
    expect(stay).toEqual(corner.before.far);
  });

  it("can turn the line before instead, and reach a dent above 180 degrees", () => {
    const profile = square();
    const corner = sketchCornerAt(profile, "p2")!;
    const turned = applyCornerAngle(profile.points, corner, 45, "before");
    expect(angleAt({ ...profile, points: turned }, "p2")).toBeCloseTo(45, 6);
    expect(turned.find((point) => point.id === corner.after.far.id)).toEqual(corner.after.far);
    const dent = applyCornerAngle(profile.points, corner, 250, "after");
    expect(angleAt({ ...profile, points: dent }, "p2")).toBeCloseTo(250, 6);
  });

  it("refuses an angle that is none, and more than 180 degrees on an open corner", () => {
    const profile = square();
    const corner = sketchCornerAt(profile, "p1")!;
    expect(applyCornerAngle(profile.points, corner, 0, "after")).toBe(profile.points);
    expect(applyCornerAngle(profile.points, corner, Number.NaN, "after")).toBe(profile.points);
    const open: SketchProfile = {
      points: [{ id: "a", x: 0, z: 0 }, { id: "b", x: 10, z: 0 }, { id: "c", x: 10, z: 10 }],
      segments: [{ id: "ab", kind: "line", startId: "a", endId: "b" }, { id: "bc", kind: "line", startId: "b", endId: "c" }],
    };
    const openCorner = sketchCornerAt(open, "b")!;
    expect(applyCornerAngle(open.points, openCorner, 200, "after")).toBe(open.points);
    expect(angleAt({ ...open, points: applyCornerAngle(open.points, openCorner, 135, "after") }, "b")).toBeCloseTo(135, 6);
  });

  it("moves the handles that belong to the turned point along with it", () => {
    const profile = square();
    profile.points[2] = { ...profile.points[2], handleIn: { x: 40, z: 30 }, handleOut: { x: 30, z: 40 } };
    const corner = sketchCornerAt(profile, "p1")!;
    const turned = applyCornerAngle(profile.points, corner, 60, "after");
    const before = profile.points[2];
    const after = turned.find((point) => point.id === "p2")!;
    expect(after.handleIn!.x - after.x).toBeCloseTo(before.handleIn!.x - before.x, 9);
    expect(after.handleOut!.z - after.z).toBeCloseTo(before.handleOut!.z - before.z, 9);
  });
});
