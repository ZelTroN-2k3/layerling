import { describe, expect, it } from "vitest";
import { planarFaceCentroid, planarFaceTriangles } from "@/lib/rotationPivot";

type Point = [number, number, number];

/** Rim of a pipe end: a circle in the plane x = `x`, centred on (x, cy, cz). */
function rim(x: number, cy: number, cz: number, radius: number, segments = 48): Point[] {
  return Array.from({ length: segments }, (_, index) => {
    const angle = (index / segments) * Math.PI * 2;
    return [x, cy + Math.cos(angle) * radius, cz + Math.sin(angle) * radius];
  });
}

/** Fan from the first rim corner - no vertex sits on the centre, like OCCT caps. */
function disc(points: Point[]): number[] {
  const triangles: number[] = [];
  for (let index = 1; index + 1 < points.length; index += 1) {
    triangles.push(...points[0], ...points[index], ...points[index + 1]);
  }
  return triangles;
}

function annulus(outer: Point[], inner: Point[]): number[] {
  const triangles: number[] = [];
  for (let index = 0; index < outer.length; index += 1) {
    const next = (index + 1) % outer.length;
    triangles.push(...outer[index], ...outer[next], ...inner[index]);
    triangles.push(...inner[index], ...outer[next], ...inner[next]);
  }
  return triangles;
}

/** The pipe wall behind the cap: connected to it, but not in its plane. */
function wall(points: Point[], length: number): number[] {
  const triangles: number[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    const a2: Point = [a[0] - length, a[1], a[2]];
    const b2: Point = [b[0] - length, b[1], b[2]];
    triangles.push(...a, ...b, ...a2, ...a2, ...b, ...b2);
  }
  return triangles;
}

describe("planarFaceCentroid", () => {
  it("finds the axis of a pipe end from any triangle of its cap", () => {
    const points = rim(40, 12, -7, 5);
    const positions = [...wall(points, 30), ...disc(points)];
    const capStart = wall(points, 30).length / 9;
    [capStart, capStart + 10, capStart + 40].forEach((hit) => {
      const centre = planarFaceCentroid(positions, hit);
      expect(centre?.x).toBeCloseTo(40, 6);
      expect(centre?.y).toBeCloseTo(12, 6);
      expect(centre?.z).toBeCloseTo(-7, 6);
    });
  });

  it("finds the axis of a hollow pipe end", () => {
    const positions = annulus(rim(0, 3, 4, 6), rim(0, 3, 4, 4));
    const centre = planarFaceCentroid(positions, 17);
    expect(centre?.y).toBeCloseTo(3, 6);
    expect(centre?.z).toBeCloseTo(4, 6);
  });

  it("keeps the two ends of a U-bend apart although they share a plane", () => {
    const left = disc(rim(10, 0, 0, 4));
    const right = disc(rim(10, 0, 30, 4));
    const positions = [...left, ...right];
    const rightCentre = planarFaceCentroid(positions, left.length / 9 + 3);
    expect(rightCentre?.z).toBeCloseTo(30, 6);
    const leftCentre = planarFaceCentroid(positions, 3);
    expect(leftCentre?.z).toBeCloseTo(0, 6);
  });

  it("rejects a hit outside the mesh or on a collapsed triangle", () => {
    expect(planarFaceCentroid([0, 0, 0, 1, 0, 0, 0, 1, 0], 1)).toBeNull();
    expect(planarFaceCentroid([0, 0, 0, 1, 0, 0, 2, 0, 0], 0)).toBeNull();
  });
});

describe("planarFaceTriangles", () => {
  // A square lying in y = 0 (two triangles) next to a square standing in x = 1 (two triangles).
  const floor = [0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1];
  const wall = [1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1];
  const positions = [...floor, ...wall];

  it("returns both triangles of the flat face that was hit and nothing of the wall", () => {
    const face = planarFaceTriangles(positions, 0);
    expect(face?.triangles.sort()).toEqual([0, 1]);
    expect(planarFaceTriangles(positions, 3)?.triangles.sort()).toEqual([2, 3]);
  });

  it("gives nothing for a triangle that is not in the mesh", () => {
    expect(planarFaceTriangles(positions, 9)).toBeNull();
  });
});
