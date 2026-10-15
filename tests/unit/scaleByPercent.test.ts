import { describe, expect, it } from "vitest";
import { scaleShapesByPercent } from "@/lib/scaleByPercent";
import type { WorkplaneShape } from "@/types/layerling";

function box(id: string, x: number, z: number, size = 10, elevation = 0, extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id, name: id, kind: "box", color: "#888888", x, z, elevation, size, width: size, depth: size, height: size, rotation: 0, ...extra } as WorkplaneShape;
}

const noLimit = () => 10_000;
const patchOf = (result: ReturnType<typeof scaleShapesByPercent>, id: string) => {
  if (!result.ok) throw new Error(result.reason);
  return result.patches.find((entry) => entry.id === id)!.patch;
};

describe("scaling by percent (#179)", () => {
  it("makes a single part larger in every direction and keeps its bottom on the plate", () => {
    const patch = patchOf(scaleShapesByPercent([box("a", 5, -3)], 120, "together", noLimit), "a");
    expect(patch.width).toBeCloseTo(12, 9);
    expect(patch.depth).toBeCloseTo(12, 9);
    expect(patch.height).toBeCloseTo(12, 9);
    expect(patch.x).toBeCloseTo(5, 9);
    expect(patch.z).toBeCloseTo(-3, 9);
    expect(patch.elevation).toBeCloseTo(0, 9);
  });

  it("together: the layout grows around the common centre", () => {
    // Two boxes 20 mm apart, centre to centre; at 150 % they are 30 mm apart.
    const result = scaleShapesByPercent([box("a", -10, 0), box("b", 10, 0)], 150, "together", noLimit);
    expect(patchOf(result, "a").x).toBeCloseTo(-15, 9);
    expect(patchOf(result, "b").x).toBeCloseTo(15, 9);
    expect(patchOf(result, "b").width).toBeCloseTo(15, 9);
  });

  it("together: a part on top of another rises with it, the lowest bottom stays", () => {
    const result = scaleShapesByPercent([box("base", 0, 0), box("top", 0, 0, 10, 10)], 200, "together", noLimit);
    expect(patchOf(result, "base").elevation).toBeCloseTo(0, 9);
    expect(patchOf(result, "top").elevation).toBeCloseTo(20, 9);
  });

  it("each: every part grows where it stands, a raised one keeps its bottom", () => {
    const result = scaleShapesByPercent([box("a", -10, 0), box("b", 10, 0, 10, 5)], 150, "each", noLimit);
    expect(patchOf(result, "a").x).toBeCloseTo(-10, 9);
    expect(patchOf(result, "b").x).toBeCloseTo(10, 9);
    expect(patchOf(result, "b").elevation).toBeCloseTo(5, 9);
  });

  it("scales a cone's base radius and a taper with it", () => {
    const cone = box("c", 0, 0, 20, 0, { kind: "cone", baseRadius: 10 });
    expect(patchOf(scaleShapesByPercent([cone], 50, "together", noLimit), "c").baseRadius).toBeCloseTo(5, 9);
  });

  it("refuses percentages out of range and sizes beyond the limit", () => {
    expect(scaleShapesByPercent([box("a", 0, 0)], 0, "together", noLimit)).toEqual({ ok: false, reason: "percent" });
    expect(scaleShapesByPercent([box("a", 0, 0)], Number.NaN, "together", noLimit)).toEqual({ ok: false, reason: "percent" });
    expect(scaleShapesByPercent([box("a", 0, 0)], 300, "together", () => 25)).toEqual({ ok: false, reason: "tooLarge", name: "a" });
  });
});
