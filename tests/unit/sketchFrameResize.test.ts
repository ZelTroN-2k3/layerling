import { describe, expect, it } from "vitest";
import { resizePointerOnGrid } from "@/lib/sketchFrameResize";

describe("stretching a sketch outline by a handle", () => {
  it("puts the edge on the grid, not the pointer", () => {
    const gap = { x: 4.17, z: 0 };
    // The pointer is where the handle is: the edge plus the gap. The edge, not the pointer, takes the step.
    const target = resizePointerOnGrid({ x: 24.6 + gap.x, z: 3.3 }, gap, 1, 100, 100);
    expect(target.x - gap.x).toBeCloseTo(25, 9);
    expect(target.z).toBe(3);
  });

  it("leaves the pointer alone with the grid off, and keeps the edge inside the plate", () => {
    expect(resizePointerOnGrid({ x: 12.345, z: -7.5 }, { x: 0, z: 0 }, 0, 100, 100)).toEqual({ x: 12.345, z: -7.5 });
    const far = resizePointerOnGrid({ x: 400, z: -400 }, { x: 5, z: 0 }, 1, 100, 50);
    expect(far.x - 5).toBe(100);
    expect(far.z).toBe(-50);
  });
});
