import { describe, expect, it } from "vitest";
import { alignAxesForWorkplane, cuboidAlongAxes, cuboidCorners, pointAlongAxes, shiftAlongAxis } from "@/lib/alignFrame";
import { horizontalPlacementWorkplane } from "@/lib/placementWorkplane";
import type { PlacementWorkplane } from "@/lib/placementWorkplane";

/** A workplane standing on a face of a body turned 45° about the vertical: its x runs along the body's own edge. */
const turned45: PlacementWorkplane = {
  origin: { x: 10, y: 0, z: 5 },
  normal: { x: 0, y: 1, z: 0 },
  xAxis: { x: Math.SQRT1_2, y: 0, z: -Math.SQRT1_2 },
  zAxis: { x: Math.SQRT1_2, y: 0, z: Math.SQRT1_2 },
};

describe("align along a workplane (#232)", () => {
  it("takes no axes on the plate, so the world ones do", () => {
    expect(alignAxesForWorkplane(horizontalPlacementWorkplane())).toBeNull();
  });

  it("takes no axes on a plane that only stands higher, such as the top of a box", () => {
    expect(alignAxesForWorkplane({ ...horizontalPlacementWorkplane(), origin: { x: 5, y: 20, z: 5 } })).toBeNull();
  });

  it("takes the plane's axes once a workplane is set", () => {
    const axes = alignAxesForWorkplane(turned45);
    expect(axes?.x.x).toBeCloseTo(Math.SQRT1_2);
    expect(axes?.y).toEqual({ x: 0, y: 1, z: 0 });
  });

  it("measures a 45° square along its own edges, not by its box round it", () => {
    const axes = alignAxesForWorkplane(turned45)!;
    // A 20 x 20 square turned 45° about the vertical, centred on the origin: corners on the world axes.
    const half = 20 / Math.SQRT2;
    const corners: Array<[number, number, number]> = [[half, 0, 0], [0, 0, half], [-half, 0, 0], [0, 0, -half]];
    const box = cuboidAlongAxes(corners, axes)!;
    expect(box.maxX - box.minX).toBeCloseTo(20);
    expect(box.maxZ - box.minZ).toBeCloseTo(20);
    // The world box would be 28.3 wide.
    const world = Math.max(...corners.map((c) => c[0])) - Math.min(...corners.map((c) => c[0]));
    expect(world).toBeCloseTo(28.284, 2);
  });

  it("shifts along an axis in the world and puts a point back where it was measured", () => {
    const axes = alignAxesForWorkplane(turned45)!;
    const shift = shiftAlongAxis(axes, "x", 10);
    expect(shift.x).toBeCloseTo(7.071);
    expect(shift.z).toBeCloseTo(-7.071);
    expect(shift.y).toBeCloseTo(0);
    const point = pointAlongAxes(axes, 3, 4, 5);
    const again = cuboidAlongAxes([[point.x, point.y, point.z]], axes)!;
    expect([again.minX, again.minY, again.minZ].map((v) => Math.round(v * 1e6) / 1e6)).toEqual([3, 4, 5]);
  });

  it("gives the eight corners of a box along the axes", () => {
    const axes = alignAxesForWorkplane(turned45)!;
    const box = { minX: 0, maxX: 2, minY: 0, maxY: 1, minZ: 0, maxZ: 3 };
    expect(cuboidCorners(box, axes)).toHaveLength(8);
  });

  it("has no box for no points", () => {
    expect(cuboidAlongAxes([], alignAxesForWorkplane(turned45)!)).toBeNull();
  });
});
