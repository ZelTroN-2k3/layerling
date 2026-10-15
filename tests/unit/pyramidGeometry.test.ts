import { describe, expect, it } from "vitest";
import { createPyramidGeometry, normalizePyramidTop } from "@/lib/pyramidGeometry";

type Position = {
  count: number;
  getX: (index: number) => number;
  getY: (index: number) => number;
  getZ: (index: number) => number;
};

function edgeUseCounts(position: Position) {
  const uses = new Map<string, number>();
  const keyForPoint = (index: number) => [position.getX(index), position.getY(index), position.getZ(index)]
    .map((value) => value.toFixed(5))
    .join(",");
  for (let index = 0; index + 2 < position.count; index += 3) {
    const triangle = [keyForPoint(index), keyForPoint(index + 1), keyForPoint(index + 2)];
    if (triangle[0] === triangle[1] || triangle[1] === triangle[2] || triangle[0] === triangle[2]) continue;
    for (let edge = 0; edge < 3; edge += 1) {
      const a = triangle[edge];
      const b = triangle[(edge + 1) % 3];
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      uses.set(key, (uses.get(key) ?? 0) + 1);
    }
  }
  return uses;
}

function signedVolume(position: Position) {
  let total = 0;
  for (let index = 0; index + 2 < position.count; index += 3) {
    const ax = position.getX(index), ay = position.getY(index), az = position.getZ(index);
    const bx = position.getX(index + 1), by = position.getY(index + 1), bz = position.getZ(index + 1);
    const cx = position.getX(index + 2), cy = position.getY(index + 2), cz = position.getZ(index + 2);
    total += (ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx)) / 6;
  }
  return total;
}

function bounds(position: Position) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let index = 0; index < position.count; index += 1) {
    minX = Math.min(minX, position.getX(index));
    maxX = Math.max(maxX, position.getX(index));
    minY = Math.min(minY, position.getY(index));
    maxY = Math.max(maxY, position.getY(index));
    minZ = Math.min(minZ, position.getZ(index));
    maxZ = Math.max(maxZ, position.getZ(index));
  }
  return { minX, maxX, minY, maxY, minZ, maxZ };
}

/** Wie breit und wie tief der Koerper auf der Hoehe y misst. */
function sliceAt(position: Position, y: number) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let index = 0; index < position.count; index += 1) {
    if (Math.abs(position.getY(index) - y) > 1e-6) continue;
    minX = Math.min(minX, position.getX(index));
    maxX = Math.max(maxX, position.getX(index));
    minZ = Math.min(minZ, position.getZ(index));
    maxZ = Math.max(maxZ, position.getZ(index));
  }
  return { width: maxX - minX, depth: maxZ - minZ };
}

describe("pyramid geometry", () => {
  it.each([3, 4, 5, 6, 8])("closes a pointed pyramid with %i sides", (sides) => {
    const geometry = createPyramidGeometry(24, 30, 18, sides);
    const position = geometry.getAttribute("position") as unknown as Position;

    expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);
    expect(signedVolume(position)).toBeGreaterThan(0);
    const box = bounds(position);
    expect(box.maxX - box.minX).toBeCloseTo(24, 4);
    expect(box.maxZ - box.minZ).toBeCloseTo(18, 4);
    expect(box.minY).toBeCloseTo(0, 6);
    expect(box.maxY).toBeCloseTo(30, 6);
  });

  it("keeps the four-sided base square, not a diamond", () => {
    const position = createPyramidGeometry(20, 10, 20, 4).getAttribute("position") as unknown as Position;
    // Eine Raute haette ihre Ecken auf den Achsen; ein Rechteck hat dort Kanten.
    const corners = new Set<string>();
    for (let index = 0; index < position.count; index += 1) {
      if (position.getY(index) > 1e-6) continue;
      const x = position.getX(index);
      const z = position.getZ(index);
      if (Math.abs(x) < 1e-6 && Math.abs(z) < 1e-6) continue;
      corners.add(`${x.toFixed(4)},${z.toFixed(4)}`);
    }
    expect([...corners].sort()).toEqual(["-10.0000,-10.0000", "-10.0000,10.0000", "10.0000,-10.0000", "10.0000,10.0000"]);
  });

  it.each([3, 4, 6])("cuts the top off with %i sides", (sides) => {
    const geometry = createPyramidGeometry(24, 30, 18, sides, 12, 9);
    const position = geometry.getAttribute("position") as unknown as Position;

    expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);
    expect(signedVolume(position)).toBeGreaterThan(0);
    expect(sliceAt(position, 0)).toEqual({ width: 24, depth: 18 });
    const top = sliceAt(position, 30);
    expect(top.width).toBeCloseTo(12, 4);
    expect(top.depth).toBeCloseTo(9, 4);
  });

  it("treats a vanishing top as a point", () => {
    expect(normalizePyramidTop(undefined, 20)).toBe(0);
    expect(normalizePyramidTop(0.01, 20)).toBe(0);
    expect(normalizePyramidTop(-5, 20)).toBe(0);
    expect(normalizePyramidTop(8, 20)).toBe(8);

    const position = createPyramidGeometry(20, 20, 20, 4, 0.01, 0.01).getAttribute("position") as unknown as Position;
    expect(sliceAt(position, 20)).toEqual({ width: 0, depth: 0 });
  });

  it("lets the top grow past the base into a funnel", () => {
    const position = createPyramidGeometry(10, 20, 10, 4, 24, 24).getAttribute("position") as unknown as Position;
    expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);
    expect(signedVolume(position)).toBeGreaterThan(0);
    expect(sliceAt(position, 0).width).toBeCloseTo(10, 4);
    expect(sliceAt(position, 20).width).toBeCloseTo(24, 4);
  });
});
