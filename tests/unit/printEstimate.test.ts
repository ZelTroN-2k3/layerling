import { describe, expect, it } from "vitest";
import { meshSurfaceAreas, normalizeInfillPercent, normalizePrintMaterial, normalizeWalls, printEstimate, printEstimateWithInfill, printedVolume } from "@/lib/printEstimate";

describe("printEstimate", () => {
  it("turns a 20 mm cube into volume, PLA weight and 1.75 mm filament", () => {
    const estimate = printEstimate(8000, "pla");
    expect(estimate.volumeCm3).toBeCloseTo(8, 6);
    expect(estimate.grams).toBeCloseTo(9.92, 6);
    // 8000 mm³ / (pi * 0.875²) = 3326 mm of filament
    expect(estimate.filamentMeters).toBeCloseTo(3.326, 3);
  });

  it("weighs by the chosen material", () => {
    expect(printEstimate(1000, "abs").grams).toBeCloseTo(1.04, 6);
    expect(printEstimate(1000, "petg").grams).toBeCloseTo(1.27, 6);
  });

  it("never reports a negative or broken volume", () => {
    expect(printEstimate(-5).grams).toBe(0);
    expect(printEstimate(Number.NaN).volumeCm3).toBe(0);
  });

  it("falls back to PLA for an unknown material", () => {
    expect(normalizePrintMaterial("wood")).toBe("pla");
    expect(normalizePrintMaterial("tpu")).toBe("tpu");
  });

  describe("with walls and infill (#320)", () => {
    // A 20 mm cube: 4 sides of 400 mm2, top and bottom of 400 mm2.
    const cube = { sideMm2: 1600, flatMm2: 800 };

    it("measures the surface of a mesh, split by how much it faces up", () => {
      const vertices: Array<[number, number, number]> = [[0, 0, 0], [10, 0, 0], [0, 0, 10], [0, 10, 0]];
      // One triangle lying flat (area 50) and one standing upright (area 50).
      const areas = meshSurfaceAreas(vertices, [[0, 1, 2], [0, 1, 3]]);
      expect(areas.flatMm2).toBeCloseTo(50, 6);
      expect(areas.sideMm2).toBeCloseTo(50, 6);
    });

    it("counts the skin and a share of what lies inside", () => {
      // Two walls of 0.42 mm: 2400 mm2 of surface x 0.84 mm = 2016 mm3 of skin; 15 % of the other 5984 mm3.
      expect(printedVolume(8000, cube, 15, 2)).toBeCloseTo(2016 + 0.15 * 5984, 6);
    });

    it("is the solid volume at 100 % and only the skin at 0 %", () => {
      expect(printedVolume(8000, cube, 100, 2)).toBeCloseTo(8000, 6);
      expect(printedVolume(8000, cube, 0, 2)).toBeCloseTo(2016, 6);
    });

    it("never counts more than a thin part holds, so a part that is all skin stays solid", () => {
      // A 1 mm plate of 40 x 40: 1600 mm3 but over 3200 mm2 of surface.
      expect(printedVolume(1600, { sideMm2: 160, flatMm2: 3200 }, 15, 2)).toBeCloseTo(1600, 6);
    });

    it("gives weight and filament for both, the solid one on top", () => {
      const both = printEstimateWithInfill(8000, cube, "pla", 15, 2);
      expect(both.solid.grams).toBeCloseTo(9.92, 6);
      expect(both.printed.grams).toBeLessThan(both.solid.grams);
      expect(both.printed.grams / both.solid.grams).toBeCloseTo((2016 + 0.15 * 5984) / 8000, 6);
      expect(both.infillPercent).toBe(15);
      expect(both.walls).toBe(2);
    });

    it("takes more walls and more infill as more material", () => {
      expect(printedVolume(8000, cube, 15, 3)).toBeGreaterThan(printedVolume(8000, cube, 15, 2));
      expect(printedVolume(8000, cube, 40, 2)).toBeGreaterThan(printedVolume(8000, cube, 15, 2));
    });

    it("falls back to a usual setting for a broken one", () => {
      expect(normalizeInfillPercent("20")).toBe(20);
      expect(normalizeInfillPercent("lots")).toBe(15);
      expect(normalizeInfillPercent(140)).toBe(15);
      expect(normalizeWalls("3")).toBe(3);
      expect(normalizeWalls(0)).toBe(2);
      expect(normalizeWalls(2.5)).toBe(2);
    });
  });
});
