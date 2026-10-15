import { describe, expect, it } from "vitest";
import { placementWorkplaneCoordinates, placementWorkplanePoint } from "@/lib/placementWorkplane";
import { computeSectionPlaneVector, sectionPlacementWorkplane, type SectionPlaneAxis } from "@/lib/sectionView";

/*
 * The workplane on the cut of the section view (#154): on the plane, facing out of the body that
 * stays, so the cut's face is the face a sketch is drawn on.
 */

const AXES: SectionPlaneAxis[] = ["x", "y", "z"];

function pointOnAxis(axis: SectionPlaneAxis, value: number, along = 0, across = 0) {
  return axis === "x" ? { x: value, y: along, z: across } : axis === "y" ? { x: along, y: value, z: across } : { x: along, y: across, z: value };
}

describe("workplane on the cut of the section view", () => {
  for (const axis of AXES) {
    for (const flipped of [false, true]) {
      it(`lies on the plane of axis ${axis}, ${flipped ? "flipped" : "not flipped"}, facing the cut-away side`, () => {
        const offset = 12.5;
        const workplane = sectionPlacementWorkplane({ axis, offset, flipped });
        const kept = computeSectionPlaneVector({ axis, offset, flipped, enabled: true, showPlane: true }).normal;
        // The origin is on the plane, the normal points the way the section removes.
        expect(workplane.origin[axis]).toBeCloseTo(offset, 9);
        expect(workplane.normal.x).toBeCloseTo(-kept.x, 9);
        expect(workplane.normal.y).toBeCloseTo(-kept.y, 9);
        expect(workplane.normal.z).toBeCloseTo(-kept.z, 9);
        // Every point of the plane has height 0 on the workplane; the cut-away side is above it, the kept side below.
        for (const [along, across] of [[0, 0], [30, -7], [-18, 25]]) {
          expect(placementWorkplaneCoordinates(workplane, pointOnAxis(axis, offset, along, across)).y).toBeCloseTo(0, 9);
        }
        const direction = flipped ? 1 : -1;
        expect(placementWorkplaneCoordinates(workplane, pointOnAxis(axis, offset + direction * 5)).y).toBeGreaterThan(4.99);
        expect(placementWorkplaneCoordinates(workplane, pointOnAxis(axis, offset - direction * 5)).y).toBeLessThan(-4.99);
      });

      it(`has axes standing at right angles in the plane (${axis}, ${flipped ? "flipped" : "not flipped"})`, () => {
        const workplane = sectionPlacementWorkplane({ axis, offset: 0, flipped });
        const dot = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) => a.x * b.x + a.y * b.y + a.z * b.z;
        expect(dot(workplane.xAxis, workplane.zAxis)).toBeCloseTo(0, 9);
        expect(dot(workplane.xAxis, workplane.normal)).toBeCloseTo(0, 9);
        expect(dot(workplane.zAxis, workplane.normal)).toBeCloseTo(0, 9);
        expect(Math.hypot(workplane.xAxis.x, workplane.xAxis.y, workplane.xAxis.z)).toBeCloseTo(1, 9);
        expect(Math.hypot(workplane.zAxis.x, workplane.zAxis.y, workplane.zAxis.z)).toBeCloseTo(1, 9);
        // A sketch point stays on the plane.
        const world = placementWorkplanePoint(workplane, 9, -4);
        expect(world[axis]).toBeCloseTo(0, 9);
      });
    }
  }

  it("keeps up in the sketch up on a standing cut, as a standing face does", () => {
    // A cut across x or z stands upright: up in the sketch (the minus z direction of the workplane) is up in the world.
    for (const axis of ["x", "z"] as const) {
      for (const flipped of [false, true]) {
        const workplane = sectionPlacementWorkplane({ axis, offset: 3, flipped });
        expect(-workplane.zAxis.y).toBeCloseTo(1, 9);
      }
    }
  });

  it("is a workplane lying flat for a horizontal cut: seen from above when the lower part stays", () => {
    const workplane = sectionPlacementWorkplane({ axis: "y", offset: 20, flipped: true });
    expect(workplane.normal.y).toBeCloseTo(1, 9);
    expect(workplane.origin.y).toBeCloseTo(20, 9);
  });
});
