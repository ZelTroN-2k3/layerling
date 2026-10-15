import { describe, expect, it } from "vitest";
import { openSurfaceEdgeCount } from "@/lib/editorBooleans";
import type { WorkplaneShape } from "@/types/layerling";

/** A cube of 10 mm as 12 triangles, counter-clockwise seen from outside. */
const CUBE: number[][][] = (() => {
  const v = (x: number, y: number, z: number) => [x * 10, y * 10, z * 10];
  const quad = (a: number[], b: number[], c: number[], d: number[]) => [[a, b, c], [a, c, d]];
  return [
    ...quad(v(0, 0, 0), v(0, 0, 1), v(1, 0, 1), v(1, 0, 0)),
    ...quad(v(1, 0, 0), v(1, 0, 1), v(1, 1, 1), v(1, 1, 0)),
    ...quad(v(1, 1, 0), v(1, 1, 1), v(0, 1, 1), v(0, 1, 0)),
    ...quad(v(0, 1, 0), v(0, 1, 1), v(0, 0, 1), v(0, 0, 0)),
    ...quad(v(0, 0, 1), v(0, 1, 1), v(1, 1, 1), v(1, 0, 1)),
    ...quad(v(0, 0, 0), v(1, 0, 0), v(1, 1, 0), v(0, 1, 0)),
  ];
})();

function meshShape(triangles: number[][][]): WorkplaneShape {
  const positions = triangles.flat(2);
  return {
    id: "mesh-1",
    name: "Part",
    kind: "mesh",
    color: "#0098c7",
    x: 0,
    z: 0,
    size: 10,
    width: 10,
    depth: 10,
    height: 10,
    rotation: 0,
    importedMesh: { positions, baseWidth: 10, baseDepth: 10, baseHeight: 10, triangleCount: triangles.length, sourceFormat: "step" },
  } as unknown as WorkplaneShape;
}

describe("the gaps in an imported surface (#346)", () => {
  it("finds none in a closed mesh", () => {
    expect(openSurfaceEdgeCount([meshShape(CUBE)])).toBe(0);
  });

  it("counts the edges around a missing pair of triangles", () => {
    // The bottom is gone: its four edges now belong to one triangle only.
    const withoutBottom = CUBE.slice(0, 10);
    expect(openSurfaceEdgeCount([meshShape(withoutBottom)])).toBe(4);
  });

  it("counts a single missing triangle by its three edges", () => {
    expect(openSurfaceEdgeCount([meshShape(CUBE.slice(1))])).toBeGreaterThanOrEqual(3);
  });
});
