import { describe, expect, it } from "vitest";
import { sectionMeasurement, sectionPointToWorld, snapSectionPoint } from "@/lib/sectionMeasure";
import { projectSectionPoint, sliceMeshContours, type SectionLoop } from "@/lib/sectionSvg";

type V = [number, number, number];

/** A square tube: 20 x 20 outside, 2 mm walls, 10 high, standing on the plate. */
function squareTube() {
  const vertices: V[] = [];
  const faces: V[] = [];
  const ring = (half: number, y: number) => {
    const start = vertices.length;
    [[-half, -half], [half, -half], [half, half], [-half, half]].forEach(([x, z]) => vertices.push([x, y, z]));
    return start;
  };
  const outerBottom = ring(10, 0);
  const outerTop = ring(10, 10);
  const innerBottom = ring(8, 0);
  const innerTop = ring(8, 10);
  for (let i = 0; i < 4; i += 1) {
    const j = (i + 1) % 4;
    faces.push([outerBottom + i, outerBottom + j, outerTop + j], [outerBottom + i, outerTop + j, outerTop + i]);
    faces.push([innerBottom + i, innerTop + j, innerBottom + j], [innerBottom + i, innerTop + i, innerTop + j]);
    faces.push([outerTop + i, outerTop + j, innerTop + j], [outerTop + i, innerTop + j, innerTop + i]);
    faces.push([outerBottom + i, innerBottom + j, outerBottom + j], [outerBottom + i, innerBottom + i, innerBottom + j]);
  }
  return { vertices, faces };
}

describe("sectionPointToWorld", () => {
  it.each(["x", "y", "z"] as const)("undoes projectSectionPoint for a %s cut", (axis) => {
    const world: V = axis === "x" ? [4, 7, -3] : axis === "y" ? [5, 4, -2] : [-6, 3, 4];
    // Each test point lies on its plane at 4
    const back = sectionPointToWorld(projectSectionPoint(world, axis), axis, 4);
    back.forEach((value, index) => expect(value).toBeCloseTo(world[index], 9));
  });
});

describe("snapSectionPoint", () => {
  const loops: SectionLoop[] = sliceMeshContours(squareTube(), "y", 5);

  it("cuts the tube into an outer and an inner square", () => {
    expect(loops).toHaveLength(2);
    expect(loops.every((loop) => loop.closed)).toBe(true);
  });

  it("puts a click near a wall onto the wall", () => {
    const snap = snapSectionPoint({ u: 9.7, v: 3 }, loops, 1);
    expect(snap.kind).toBe("outline");
    expect(snap.point.u).toBeCloseTo(10, 9);
    expect(snap.point.v).toBeCloseTo(3, 9);
  });

  it("prefers a corner close by", () => {
    const snap = snapSectionPoint({ u: 9.8, v: 9.7 }, loops, 1);
    expect(snap.kind).toBe("corner");
    expect(snap.point).toEqual({ u: 10, v: 10 });
  });

  it("leaves a click away from every wall where it is", () => {
    expect(snapSectionPoint({ u: 0, v: 0 }, loops, 1).kind).toBe("free");
  });

  it("measures the wall thickness square to the wall, wherever the second click lands near it", () => {
    const first = snapSectionPoint({ u: 10.2, v: 2 }, loops, 1).point;
    // The second click is a little off along the inner wall
    const second = snapSectionPoint({ u: 8.3, v: 2.6 }, loops, 1, first);
    expect(second.kind).toBe("perpendicular");
    const measured = sectionMeasurement(first, second.point, "y", 5);
    expect(measured.distance).toBeCloseTo(2, 9);
    expect(measured.deltaX).toBeCloseTo(-2, 9);
    expect(measured.deltaHeight).toBe(0);
  });
});

describe("snapSectionPoint across a wall", () => {
  const loops: SectionLoop[] = sliceMeshContours(squareTube(), "y", 5);

  it("finds the thickness from anywhere along the opposite wall", () => {
    const first = snapSectionPoint({ u: 10.2, v: 2 }, loops, 1).point;
    const second = snapSectionPoint({ u: 8.4, v: 6.5 }, loops, 1, first);
    expect(second.kind).toBe("perpendicular");
    expect(second.point.u).toBeCloseTo(8, 9);
    expect(second.point.v).toBeCloseTo(2, 9);
  });

  it("still takes a corner the cursor is right on", () => {
    const first = snapSectionPoint({ u: 10.2, v: 2 }, loops, 1).point;
    expect(snapSectionPoint({ u: 8.1, v: 7.9 }, loops, 1, first).kind).toBe("corner");
  });
});

describe("sectionMeasurement", () => {
  it("names the parts like the position fields: depth is the scene's z, height its y", () => {
    // A Y cut (depth, scene axis z): the sheet shows X across and height up
    const measured = sectionMeasurement({ u: 0, v: 0 }, { u: 3, v: -4 }, "z", 7);
    expect(measured.distance).toBeCloseTo(5, 9);
    expect(measured.deltaX).toBeCloseTo(3, 9);
    expect(measured.deltaHeight).toBeCloseTo(4, 9);
    expect(measured.deltaDepth).toBe(0);
  });
});
