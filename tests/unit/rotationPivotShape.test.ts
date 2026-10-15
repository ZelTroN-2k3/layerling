import { describe, expect, it } from "vitest";
import { carryShapePivot, shapePivotFromWorld, shapePivotWorld } from "@/lib/rotationPivot";
import type { WorkplaneShape } from "@/types/layerling";

function box(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "box",
    name: "Box",
    kind: "box",
    color: "#ff9e2c",
    x: 0,
    z: 0,
    elevation: 0,
    size: 60,
    width: 60,
    depth: 10,
    height: 6,
    rotation: 0,
    locked: false,
    hidden: false,
    ...overrides,
  };
}

function expectPoint(actual: { x: number; y: number; z: number } | null, expected: { x: number; y: number; z: number }) {
  expect(actual).not.toBeNull();
  expect(actual!.x).toBeCloseTo(expected.x, 6);
  expect(actual!.y).toBeCloseTo(expected.y, 6);
  expect(actual!.z).toBeCloseTo(expected.z, 6);
}

describe("a pivot kept with its body", () => {
  it("is absent until one is set", () => {
    expect(shapePivotWorld(box())).toBeNull();
  });

  it("comes back where it was set", () => {
    const shape = box({ x: 12, z: -4, elevation: 2, rotation: 30, rotationX: 15 });
    const point = { x: -10, y: 5, z: 3 };
    expectPoint(shapePivotWorld({ ...shape, rotationPivot: shapePivotFromWorld(shape, point) }), point);
  });

  it("moves with the body", () => {
    const shape = box();
    const rotationPivot = shapePivotFromWorld(shape, { x: -25, y: 3, z: 0 });
    expectPoint(shapePivotWorld({ ...shape, x: 20, rotationPivot }), { x: -5, y: 3, z: 0 });
  });

  it("turns with the body about its centre", () => {
    const shape = box();
    const rotationPivot = shapePivotFromWorld(shape, { x: -25, y: 3, z: 0 });
    expectPoint(shapePivotWorld({ ...shape, rotation: 90, rotationPivot }), { x: 0, y: 3, z: 25 });
  });

  it("scales with the body", () => {
    const shape = box();
    const rotationPivot = shapePivotFromWorld(shape, { x: -25, y: 3, z: 0 });
    expectPoint(shapePivotWorld({ ...shape, width: 120, rotationPivot }), { x: -50, y: 3, z: 0 });
  });

  it("stays on its spot when the body is rebuilt in a new frame", () => {
    const turned = box({ rotation: 90 });
    const withPivot = { ...turned, rotationPivot: shapePivotFromWorld(turned, { x: 0, y: 3, z: 25 }) };
    // The same body with the turn baked in: no rotation, width and depth swapped.
    const baked = box({ width: 10, depth: 60, size: 60 });
    expectPoint(shapePivotWorld(carryShapePivot(withPivot, baked)), { x: 0, y: 3, z: 25 });
  });
});
