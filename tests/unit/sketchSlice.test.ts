import { describe, expect, it } from "vitest";
import { meshSlicePath, planeCutsMesh, type SliceVertex } from "@/lib/sketchSlice";

// An axis-aligned box as 12 triangles; `inward` turns the faces to look into the box (a cavity).
function box(minX: number, maxX: number, minH: number, maxH: number, minZ: number, maxZ: number, offset = 0, inward = false) {
  const vertices: SliceVertex[] = [];
  for (const h of [minH, maxH]) for (const z of [minZ, maxZ]) for (const x of [minX, maxX]) vertices.push({ x, h, z });
  const quads = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];
  const faces: Array<[number, number, number]> = quads.flatMap(([a, b, c, d]) => inward
    ? [[a + offset, c + offset, b + offset], [a + offset, d + offset, c + offset]] as Array<[number, number, number]>
    : [[a + offset, b + offset, c + offset], [a + offset, c + offset, d + offset]] as Array<[number, number, number]>);
  return { vertices, faces };
}

const loopsOf = (path: string | null) => (path?.match(/M /g) ?? []).length;

describe("the outline of a body where the workplane cuts it", () => {
  it("is one loop for a solid box, with the box's own size", () => {
    const solid = box(-10, 10, -5, 5, -8, 8);
    const path = meshSlicePath(solid.vertices, solid.faces);
    expect(loopsOf(path)).toBe(1);
    const numbers = (path ?? "").match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
    const xs = numbers.filter((_, index) => index % 2 === 0);
    const zs = numbers.filter((_, index) => index % 2 === 1);
    expect(Math.min(...xs)).toBeCloseTo(-10, 3);
    expect(Math.max(...xs)).toBeCloseTo(10, 3);
    expect(Math.min(...zs)).toBeCloseTo(-8, 3);
    expect(Math.max(...zs)).toBeCloseTo(8, 3);
  });

  it("is a ring for a hollow box: the wall's outline and the cavity's", () => {
    const outer = box(-10, 10, -5, 5, -8, 8);
    const cavity = box(-8, 8, -3, 5, -6, 6, 8, true);
    const path = meshSlicePath([...outer.vertices, ...cavity.vertices], [...outer.faces, ...cavity.faces]);
    expect(loopsOf(path)).toBe(2);
  });

  it("finds the cavity when the workplane lies on the cavity's floor", () => {
    // The floor is at height 0: a little above it, the walls stand and the cavity is empty.
    const outer = box(-10, 10, -2, 6, -8, 8);
    const cavity = box(-8, 8, 0, 6, -6, 6, 8, true);
    const heights = [...outer.vertices, ...cavity.vertices].map((vertex) => vertex.h);
    expect(planeCutsMesh(heights)).toBe(true);
    expect(loopsOf(meshSlicePath([...outer.vertices, ...cavity.vertices], [...outer.faces, ...cavity.faces]))).toBe(2);
  });

  it("is nothing when the body lies on one side of the plane, however close", () => {
    const below = box(-10, 10, -5, 0, -8, 8);
    expect(planeCutsMesh(below.vertices.map((vertex) => vertex.h))).toBe(false);
    expect(meshSlicePath(below.vertices, below.faces)).toBeNull();
    const above = box(-10, 10, 0, 5, -8, 8);
    expect(planeCutsMesh(above.vertices.map((vertex) => vertex.h))).toBe(false);
  });
});
