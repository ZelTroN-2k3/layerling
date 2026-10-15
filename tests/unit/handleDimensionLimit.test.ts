import { describe, expect, it } from "vitest";
import { DEFAULT_WORKPLANE_WORKSPACE, handleDimensionLimit } from "@/lib/workplaneSettings";

const plate = (width: number, depth: number, maxDimension?: number) => ({
  ...DEFAULT_WORKPLANE_WORKSPACE,
  width,
  depth,
  shapeCustomizations: maxDimension === undefined ? {} : { box: { maxDimension } },
});

describe("how far the handles pull a body (#181)", () => {
  it("keeps the old ceilings on the standard plate", () => {
    expect(handleDimensionLimit(plate(200, 200), "box", 220, "across", 20)).toBe(220);
    expect(handleDimensionLimit(plate(200, 200), "box", 180, "height", 20)).toBe(200);
  });

  it("reaches as far as a larger plate or printer", () => {
    expect(handleDimensionLimit(plate(350, 320), "box", 220, "across", 20)).toBe(350);
    expect(handleDimensionLimit(plate(350, 320), "box", 180, "height", 20, 325)).toBe(325);
  });

  it("never shrinks a body that is already larger, typed in", () => {
    expect(handleDimensionLimit(plate(200, 200), "box", 220, "across", 265)).toBe(265);
  });

  it("lets a custom size limit win over the plate", () => {
    expect(handleDimensionLimit(plate(350, 350, 120), "box", 220, "across", 20)).toBe(120);
    expect(handleDimensionLimit(plate(350, 350, 120), "box", 220, "across", 150)).toBe(150);
  });
});
