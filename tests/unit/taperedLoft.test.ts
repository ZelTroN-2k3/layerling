import { describe, expect, it } from "vitest";
import { cadModifierProfileForShape } from "@/lib/cadProfileExtrusion";
import { validateCadProfile } from "@/lib/cadProfileSolid";
import type { CadModifierProfilePart } from "@/lib/cadModifierTypes";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * Tapered and leaning prisms are ruled lofts between their bottom and top
 * section. These tests hold the two sections against the taper and lean the
 * display applies (transformMesh: scale by bottom/top size, shift by the top
 * offset); tests/e2e/cadTaperedBodies.e2e.ts builds them in the kernel.
 */

function shape(kind: WorkplaneShape["kind"], extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: `t-${kind}`, name: kind, kind, x: 0, z: 0, elevation: 0, size: 20, width: 20, depth: 20, height: 10, rotation: 0, color: "#888888", ...extra } as WorkplaneShape;
}

const corners = (loop: CadModifierProfilePart["loops"][number]) => [loop, ...loop.segments.slice(0, -1)].map((point) => [point.x, point.z]);

describe("tapered and leaning prisms as lofts", () => {
  it("gives a tapered, leaning box its bottom and top rectangle", () => {
    const part = cadModifierProfileForShape(shape("box", { width: 30, depth: 20, taperBottomWidth: 28, taperBottomDepth: 18, taperTopWidth: 12, taperTopDepth: 8, extrudeTopOffsetX: 4, extrudeTopOffsetZ: -2 })) as CadModifierProfilePart;
    expect(part.kind).toBe("loft");
    expect(part.height).toBe(10);
    expect(corners(part.loops[0]).sort()).toEqual([[-14, -9], [-14, 9], [14, -9], [14, 9]].sort());
    corners(part.topLoops![0]).forEach(([x, z]) => {
      expect(Math.abs(x - 4)).toBeCloseTo(6, 9);
      expect(Math.abs(z + 2)).toBeCloseTo(4, 9);
    });
  });

  it("turns a tapered round cylinder into two ellipses, and a few-sided one into its polygon", () => {
    const round = cadModifierProfileForShape(shape("cylinder", { taperTopWidth: 8, taperTopDepth: 14 })) as CadModifierProfilePart;
    expect(round.loops[0].segments[0]).toMatchObject({ kind: "arc", rx: 10, rz: 10 });
    expect(round.topLoops![0].segments[0]).toMatchObject({ kind: "arc", rx: 4, rz: 7 });
    const hexagon = cadModifierProfileForShape(shape("cylinder", { sides: 6, taperTopWidth: 10, taperTopDepth: 10 })) as CadModifierProfilePart;
    expect(hexagon.loops[0].segments).toHaveLength(6);
    expect(hexagon.topLoops![0].segments).toHaveLength(6);
  });

  it("keeps the tube's opening as a second loop at both ends", () => {
    const part = cadModifierProfileForShape(shape("tube", { width: 30, depth: 30, bevel: 3, taperTopWidth: 18, taperTopDepth: 18 })) as CadModifierProfilePart;
    expect(part.loops).toHaveLength(2);
    expect(part.topLoops).toHaveLength(2);
    expect(part.topLoops![1].segments[0]).toMatchObject({ rx: 12 * (18 / 30), rz: 12 * (18 / 30) });
  });

  it("lofts a twist with its centre and lean (#184)", () => {
    const part = cadModifierProfileForShape(shape("box", { extrudeTwist: 15, extrudeTopOffsetX: 4 })) as CadModifierProfilePart;
    expect(part).toMatchObject({ kind: "loft", twist: 15, twistLean: { x: 4, z: 0 } });
    expect(part.twistCenter?.x).toBeCloseTo(0, 9);
    expect(cadModifierProfileForShape(shape("cylinder", { extrudeTwist: 15, taperTopWidth: 10 }))?.kind).toBe("loft");
  });

  it("leaves a deformed round body and a deformed text on the display mesh", () => {
    expect(cadModifierProfileForShape(shape("sphere", { taperTopWidth: 10 }))).toBeNull();
    expect(cadModifierProfileForShape(shape("cone", { extrudeTopOffsetX: 3 }))).toBeNull();
    expect(cadModifierProfileForShape(shape("text", { text: "A", taperTopWidth: 10 }))).toBeNull();
  });

  it("leaves an undeformed box to its primitive", () => {
    expect(cadModifierProfileForShape(shape("box"))).toBeNull();
  });

  it("refuses a top that is not the bottom's partner", () => {
    const part = cadModifierProfileForShape(shape("box", { taperTopWidth: 10 })) as CadModifierProfilePart;
    expect(() => validateCadProfile(part)).not.toThrow();
    expect(() => validateCadProfile({ ...part, topLoops: [] })).toThrow(/does not match/);
    const round = cadModifierProfileForShape(shape("cylinder", { taperTopWidth: 10 })) as CadModifierProfilePart;
    expect(() => validateCadProfile({ ...part, topLoops: round.topLoops })).toThrow(/does not match/);
  });
});
