import { describe, expect, it } from "vitest";
import { centeredWorkplaneGridCoordinates, inchGridPresetMm, workplaneGridLayout, workplaneGridLines } from "@/lib/workplaneGrid";
import { gridBlockForUnits, normalizeWorkspaceSettings } from "@/lib/workplaneSettings";
import { snapShapeFootprintToVisibleGrid } from "@/lib/gridSnap";
import type { WorkplaneShape } from "@/types/layerling";

describe("inch grid", () => {
  it("reads inch presets in millimetres", () => {
    expect(inchGridPresetMm("1/4 in")).toBeCloseTo(6.35, 10);
    expect(inchGridPresetMm("1 in")).toBeCloseTo(25.4, 10);
    expect(inchGridPresetMm("5 mm")).toBeNull();
    expect(inchGridPresetMm("Custom")).toBeNull();
  });

  it("draws a stronger line every fifth millimetre step and on every whole inch", () => {
    expect(workplaneGridLayout({ gridBlockSize: 5, gridBlockPreset: "5 mm", units: "Metric (Default)" })).toEqual({ step: 5, majorInterval: 5 });
    expect(workplaneGridLayout({ gridBlockSize: 6.35, gridBlockPreset: "1/4 in", units: "Imperial" })).toEqual({ step: 6.35, majorInterval: 4 });
    expect(workplaneGridLayout({ gridBlockSize: 3.175, gridBlockPreset: "1/8 in", units: "Imperial" }).majorInterval).toBe(8);
    expect(workplaneGridLayout({ gridBlockSize: 25.4, gridBlockPreset: "1 in", units: "Imperial" }).majorInterval).toBe(12);
  });

  it("draws the axis at the origin and a strong line on every whole inch", () => {
    const lines = workplaneGridLines(200, workplaneGridLayout({ gridBlockSize: 6.35, gridBlockPreset: "1/4 in", units: "Imperial" }));
    expect(lines.find((line) => line.kind === "axis")?.coordinate).toBe(0);
    const majors = lines.filter((line) => line.kind === "major").map((line) => line.coordinate);
    expect(majors).toContain(25.4);
    expect(majors).toContain(-50.8);
    expect(majors.every((value) => Math.abs(value / 25.4 - Math.round(value / 25.4)) < 1e-9)).toBe(true);
    // Lines stay inside the plate.
    expect(Math.max(...centeredWorkplaneGridCoordinates(200, 6.35).map((line) => Math.abs(line.coordinate)))).toBeLessThan(100);
  });

  it("switches the grid with the unit system and leaves a custom size alone", () => {
    expect(gridBlockForUnits("Imperial", "5 mm", 5)).toEqual({ gridBlockPreset: "1/4 in", gridBlockSize: 6.35 });
    expect(gridBlockForUnits("Metric (Default)", "1/4 in", 6.35)).toEqual({ gridBlockPreset: "5 mm", gridBlockSize: 5 });
    expect(gridBlockForUnits("Imperial", "Custom", 7)).toEqual({ gridBlockPreset: "Custom", gridBlockSize: 7 });
    expect(gridBlockForUnits("Metric (Default)", "10 mm", 10)).toEqual({ gridBlockPreset: "10 mm", gridBlockSize: 10 });
    // A design saved with Imperial and a millimetre grid opens with the inch grid.
    const loaded = normalizeWorkspaceSettings({ units: "Imperial", gridBlockPreset: "5 mm", gridBlockSize: 5 });
    expect(loaded.gridBlockPreset).toBe("1/4 in");
    expect(loaded.gridBlockSize).toBeCloseTo(6.35, 10);
  });

  it("aligns a shape to the inch grid lines through the origin", () => {
    const workspace = normalizeWorkspaceSettings({ units: "Imperial", gridBlockPreset: "1/4 in" });
    const shape = { id: "s", x: 10, z: 0 } as WorkplaneShape;
    const snapped = snapShapeFootprintToVisibleGrid(shape, { minX: 7, maxX: 13, minZ: -3, maxZ: 3 }, workspace);
    expect(snapped.x).toBeCloseTo(10 - 0.3, 6); // the right edge, 13, is nearest a line (12.7)
  });
});
