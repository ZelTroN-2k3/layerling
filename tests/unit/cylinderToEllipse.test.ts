import { describe, expect, it } from "vitest";
import { cylinderToEllipsePatch } from "@/lib/cylinderToEllipse";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

function shape(overrides: Partial<WorkplaneShape>): WorkplaneShape {
  return canonicalizeShape({
    id: "c1", name: "Cylinder", kind: "cylinder", color: "#d97813", x: 0, z: 0, elevation: 0,
    size: 30, width: 30, depth: 30, height: 10, rotation: 0, ...overrides,
  });
}

describe("making a cylinder an ellipse", () => {
  it("changes the kind, and the name only where it is still the palette's", () => {
    expect(cylinderToEllipsePatch(shape({}))).toEqual({ kind: "ellipse", name: "Ellipse" });
    expect(cylinderToEllipsePatch(shape({ name: "Post" }))).toEqual({ kind: "ellipse" });
  });

  it("then lets length and width differ, which the cylinder never does", () => {
    const cylinder = shape({});
    expect(canonicalizeShape({ ...cylinder, depth: 15 }).depth).toBe(cylinder.width);
    const ellipse = canonicalizeShape({ ...cylinder, ...cylinderToEllipsePatch(cylinder), depth: 15 });
    expect(ellipse.kind).toBe("ellipse");
    expect(ellipse.width).toBe(30);
    expect(ellipse.depth).toBe(15);
  });

  it("leaves other shapes and cylinders with an exact body or edges alone", () => {
    expect(cylinderToEllipsePatch(shape({ kind: "box" }))).toBeNull();
    expect(cylinderToEllipsePatch(shape({ edgeTreatments: [{ id: "e", kind: "fillet", amount: 1, edges: [] } as never] }))).toBeNull();
    expect(cylinderToEllipsePatch(shape({ cadBrep: "BREP" }))).toBeNull();
  });
});
