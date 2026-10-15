import { describe, expect, it } from "vitest";
import { placementWorkplaneFromSurface } from "@/lib/placementWorkplane";
import { movedWithEditedOutline, placeSketchExtrusion, sketchBodyAnchor } from "@/lib/sketchPlacement";
import type { WorkplaneShape } from "@/types/layerling";

function extrusion(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "sketch-extrusion-1",
    name: "Sketch extrusion",
    kind: "mesh",
    color: "#d41721",
    x: 3,
    z: -2,
    elevation: 0,
    size: 12,
    width: 12,
    depth: 8,
    height: 10,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    importedMesh: {
      positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      baseWidth: 12,
      baseDepth: 8,
      baseHeight: 10,
      triangleCount: 1,
      sourceFormat: "json",
    },
    ...overrides,
  };
}

describe("sketch extrusion placement", () => {
  it("places a new extrusion outward from a vertical face", () => {
    const workplane = placementWorkplaneFromSurface(
      { x: 20, y: 7, z: 4 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
    );
    const placed = placeSketchExtrusion(extrusion(), workplane);

    expect(placed.x).toBeCloseTo(25);
    expect(placed.elevation).toBeCloseTo(5);
    expect(placed.rotationZ).toBeCloseTo(270);
  });

  it("keeps an edited extrusion's existing world transform", () => {
    const existing = extrusion({
      x: 28,
      z: 14,
      elevation: 9,
      rotation: 18,
      rotationX: 32,
      rotationZ: -21,
    });
    const regenerated = extrusion({ width: 20 });
    const placed = placeSketchExtrusion(
      regenerated,
      placementWorkplaneFromSurface(
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
        { x: 1, y: 0, z: 0 },
      ),
      existing,
    );

    expect(placed).toEqual(expect.objectContaining({
      x: 28,
      z: 14,
      elevation: 9,
      rotation: 18,
      rotationX: 32,
      rotationZ: 339,
      width: 20,
    }));
  });
  const square = (points: Array<[number, number]>) => ({
    points: points.map(([x, z], index) => ({ id: `p${index}`, x, z, mode: "corner" as const })),
    segments: [],
  });

  it("anchors a sketch body on the middle its exact body was built with, curves included (#291)", () => {
    const profile = square([[-65, 40], [-65, 25], [-20, 25], [-20, 75], [-70, 100]]);
    const plain = extrusion({ sketchProfile: profile });
    // Without an exact body: the middle of the points.
    expect(sketchBodyAnchor(plain)).toEqual({ x: -45, z: 62.5 });
    // With one, its frame - the curve bulged out to -99.4.
    const exact = extrusion({
      sketchProfile: profile,
      cadBrep: "brep",
      width: 79.401,
      depth: 75,
      height: 10,
      cadBrepFrame: { x: -59.7, z: 62.5, elevation: 0, width: 79.401, depth: 75, height: 10 },
    });
    expect(sketchBodyAnchor(exact)).toEqual({ x: -59.7, z: 62.5 });
  });

  it("keeps what an edit left alone where it was: the body moves by as much as its outline's middle", () => {
    const existing = extrusion({ x: 10, z: -10 });
    const placed = placeSketchExtrusion(extrusion({ x: 6, z: 0, width: 32 }), placementWorkplaneFromSurface({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }), existing);
    const axes = { x: [1, 0, 0] as const, z: [0, 0, 1] as const };
    // A corner pulled out by 12: the outline's middle went from 0 to 6, so the body goes 6 along.
    const moved = movedWithEditedOutline(placed, existing, { x: 0, z: 0 }, { x: 6, z: 0 }, axes);
    expect(moved.x).toBeCloseTo(16);
    expect(moved.z).toBeCloseTo(-10);
    // Nothing moved in the sketch: nothing moves.
    expect(movedWithEditedOutline(placed, existing, { x: 0, z: 0 }, { x: 0, z: 0 }, axes)).toBe(placed);
  });

  it("turns the move into the body's own directions when it stands turned", () => {
    const existing = extrusion({ x: 10, z: 0, elevation: 4, rotation: 90 });
    // Turned a quarter about the vertical, the sketch's x points along the world's -z.
    const moved = movedWithEditedOutline(existing, existing, { x: 0, z: 0 }, { x: 5, z: 2 }, { x: [0, 0, -1], z: [1, 0, 0] });
    expect(moved.x).toBeCloseTo(12);
    expect(moved.z).toBeCloseTo(-5);
    expect(moved.elevation).toBeCloseTo(4);
  });
});
