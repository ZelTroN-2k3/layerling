import { describe, expect, it } from "vitest";
import { circleStepDegrees, clampArrayCount, moveAlongRadius, rotateAroundVertical, rowOffset, singleAxisSpacing } from "@/lib/shapeArray";

describe("shape arrays", () => {
  it("keeps the count between two pieces and a hundred", () => {
    expect(clampArrayCount(1)).toBe(2);
    expect(clampArrayCount(7.4)).toBe(7);
    expect(clampArrayCount(5000)).toBe(100);
    expect(clampArrayCount(Number.NaN)).toBe(2);
  });

  it("runs a row along X, back along Y and up along Z", () => {
    expect(rowOffset(singleAxisSpacing("x", 10), 3)).toEqual({ dx: 30, dy: 0, dz: 0 });
    // Y points to the back, which is -z in the scene.
    expect(rowOffset(singleAxisSpacing("y", 10), 2)).toEqual({ dx: 0, dy: 0, dz: -20 });
    expect(rowOffset(singleAxisSpacing("z", -4), 1)).toEqual({ dx: 0, dy: -4, dz: 0 });
  });

  it("steps along all three axes at once for a diagonal row or a staircase", () => {
    expect(rowOffset({ spacingX: 10, spacingY: 5, spacingZ: 2 }, 3)).toEqual({ dx: 30, dy: 6, dz: -15 });
    expect(rowOffset({ spacingX: 0, spacingY: 0, spacingZ: 0 }, 4)).toEqual({ dx: 0, dy: 0, dz: 0 });
  });

  it("moves a point along its line from the centre, which makes a spiral", () => {
    // 10 mm right of the centre, pushed out by 5: 15 mm right.
    const out = moveAlongRadius({ x: 10, z: 0 }, { x: 0, y: 0 }, 0, 5);
    expect(out.x).toBeCloseTo(15);
    expect(Math.abs(out.z)).toBeCloseTo(0);
    // Pulled in by 4 towards a centre at (10, 0), from 10 mm behind it (scene z -10).
    const inward = moveAlongRadius({ x: 10, z: -10 }, { x: 10, y: 0 }, 90, -4);
    expect(inward.x).toBeCloseTo(10);
    expect(inward.z).toBeCloseTo(-6);
    // A point on the centre goes the way the circle has turned: 90 degrees is towards the back (Y), scene -z.
    const fromCentre = moveAlongRadius({ x: 0, z: 0 }, { x: 0, y: 0 }, 90, 7);
    expect(fromCentre.x).toBeCloseTo(0);
    expect(fromCentre.z).toBeCloseTo(-7);
    expect(moveAlongRadius({ x: 3, z: 4 }, { x: 0, y: 0 }, 30, 0)).toEqual({ x: 3, z: 4 });
  });

  it("shares a full circle among all pieces and spans an arc end to end", () => {
    expect(circleStepDegrees(6, 360)).toBeCloseTo(60);
    expect(circleStepDegrees(5, 90)).toBeCloseTo(22.5);
    expect(circleStepDegrees(4, -360)).toBeCloseTo(-90);
  });

  it("turns counter-clockwise seen from above, around the given centre", () => {
    // A point 10 mm right of the centre (5 | 5) ends up 10 mm behind it.
    const quarter = rotateAroundVertical({ x: 15, z: -5 }, { x: 5, y: 5 }, 90);
    expect(quarter.x).toBeCloseTo(5);
    expect(quarter.z).toBeCloseTo(-15);
    const half = rotateAroundVertical({ x: 15, z: -5 }, { x: 5, y: 5 }, 180);
    expect(half.x).toBeCloseTo(-5);
    expect(half.z).toBeCloseTo(-5);
  });
});
