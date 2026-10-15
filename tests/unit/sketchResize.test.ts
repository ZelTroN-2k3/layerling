import { describe, expect, it } from "vitest";
import { sketchBodyStretch, stretchedSketchProfile } from "@/lib/sketchResize";
import type { SketchProfile, WorkplaneShape } from "@/types/layerling";

const profile: SketchProfile = {
  points: [
    { id: "a", x: 0, z: 0 },
    { id: "b", x: 40, z: 0, handleOut: { x: 50, z: 10 } },
    { id: "c", x: 40, z: 20, handleIn: { x: 30, z: 30 } },
  ],
  segments: [
    { id: "ab", startId: "a", endId: "b", kind: "line" },
    { id: "bc", startId: "b", endId: "c", kind: "bezier" },
    { id: "ca", startId: "c", endId: "a", kind: "line" },
  ],
};

function body(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "s", name: "Sketch extrusion", kind: "mesh", color: "#d41721", x: 0, z: 0, elevation: 0, size: 40,
    width: 40, depth: 20, height: 10, rotation: 0, locked: false, hidden: false,
    sketchProfile: profile, sketchOperation: "extrude", cadBrep: "brep",
    cadBrepFrame: { width: 40, depth: 20, height: 10 } as WorkplaneShape["cadBrepFrame"],
    ...overrides,
  } as WorkplaneShape;
}

describe("resizing a sketch body (#115)", () => {
  it("notices a body resized since its exact body was built, and only then", () => {
    expect(sketchBodyStretch(body())).toBeNull();
    expect(sketchBodyStretch(body({ height: 30 }))).toEqual({ x: 1, z: 1, height: 30 });
    expect(sketchBodyStretch(body({ width: 80, depth: 10 }))).toEqual({ x: 2, z: 0.5, height: 10 });
    // A revolved sketch, a filleted body or one without its exact body is left as it is.
    expect(sketchBodyStretch(body({ height: 30, sketchOperation: "revolve" }))).toBeNull();
    expect(sketchBodyStretch(body({ height: 30, edgeTreatments: [{ kind: "fillet", amount: 1, edgeCount: 1 }] }))).toBeNull();
    expect(sketchBodyStretch(body({ height: 30, cadBrep: undefined }))).toBeNull();
  });

  it("stretches points and curve handles about the middle of the sketch", () => {
    const stretched = stretchedSketchProfile(profile, 2, 0.5);
    expect(stretched.points.map((point) => [point.x, point.z])).toEqual([[-20, 5], [60, 5], [60, 15]]);
    expect(stretched.points[1].handleOut).toEqual({ x: 80, z: 10 });
    expect(stretched.points[2].handleIn).toEqual({ x: 40, z: 20 });
    expect(stretched.segments).toEqual(profile.segments);
    // The original is left alone.
    expect(profile.points[1].x).toBe(40);
  });
});
