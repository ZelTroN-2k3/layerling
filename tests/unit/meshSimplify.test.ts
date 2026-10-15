import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { simplifyTrianglePositions } from "@/lib/meshSimplify";
import { validateClosedSolidTriangleSoup } from "@/lib/svgImport";

/** A finely divided, closed sphere as the triangle soup an STL import produces. */
function sphereSoup(radius = 10) {
  return Array.from(new THREE.IcosahedronGeometry(radius, 20).getAttribute("position").array as ArrayLike<number>);
}

function bounds(positions: number[]) {
  const box = new THREE.Box3().setFromArray(positions);
  return box.getSize(new THREE.Vector3());
}

describe("simplifying an imported mesh", () => {
  it("reduces the triangle count to about the target", async () => {
    const source = sphereSoup();
    const sourceTriangles = source.length / 9;
    const result = await simplifyTrianglePositions(source, sourceTriangles / 4);

    expect(result.triangleCount).toBe(result.positions.length / 9);
    expect(result.triangleCount).toBeLessThanOrEqual(Math.ceil(sourceTriangles / 4));
    expect(result.triangleCount).toBeGreaterThan(sourceTriangles / 8);
  });

  it("keeps the body closed and about its size", async () => {
    const source = sphereSoup();
    const result = await simplifyTrianglePositions(source, source.length / 9 / 4);

    expect(() => validateClosedSolidTriangleSoup(result.positions)).not.toThrow();
    const before = bounds(source);
    const after = bounds(result.positions);
    expect(after.x).toBeGreaterThan(before.x * 0.97);
    expect(after.y).toBeGreaterThan(before.y * 0.97);
    expect(after.z).toBeGreaterThan(before.z * 0.97);
    expect(after.x).toBeLessThanOrEqual(before.x + 1e-9);
  });

  it("only uses corners the mesh already had", async () => {
    const source = sphereSoup();
    const known = new Set<string>();
    for (let index = 0; index < source.length; index += 3) known.add(source.slice(index, index + 3).join(","));
    const result = await simplifyTrianglePositions(source, 500);
    for (let index = 0; index < result.positions.length; index += 3) {
      expect(known.has(result.positions.slice(index, index + 3).join(","))).toBe(true);
    }
  });

  it("returns the mesh as it is when the target is not below its count", async () => {
    const source = sphereSoup();
    const result = await simplifyTrianglePositions(source, source.length / 9);
    expect(result.positions).toEqual(source);
  });
});
