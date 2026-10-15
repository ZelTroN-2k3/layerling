import { describe, expect, it } from "vitest";
import { workplaneGridBandWidths, workplaneGridLayout, workplaneGridLines, workplaneGridPalette, workplaneThemePalette } from "@/lib/workplaneGrid";
import { DEFAULT_WORKPLANE_WORKSPACE, normalizeWorkspaceSettings } from "@/lib/workplaneSettings";

// #143: the darker grid lines every 5 or, as in similar tools, every 10 steps, in a colour of their own.
describe("grid lines that grow with the zoom (#143)", () => {
  it("lie on the plate as bands a twentieth of the step wide, twice that for the darker ones", () => {
    expect(workplaneGridBandWidths(1)).toEqual({ minor: 0.05, major: 0.1 });
    expect(workplaneGridBandWidths(5).minor).toBeCloseTo(0.25, 9);
    // Never thinner than 0.02 mm nor wider than half a millimetre, whatever the step.
    expect(workplaneGridBandWidths(0.1).minor).toBe(0.02);
    expect(workplaneGridBandWidths(25).minor).toBe(0.5);
    expect(workplaneGridBandWidths(Number.NaN).minor).toBe(0.05);
  });
});

describe("darker grid lines", () => {
  it("come every fifth step unless ten are chosen", () => {
    expect(workplaneGridLayout({ gridBlockSize: 1 }).majorInterval).toBe(5);
    expect(workplaneGridLayout({ gridBlockSize: 1, gridMajorInterval: 10 }).majorInterval).toBe(10);
    const majors = workplaneGridLines(40, workplaneGridLayout({ gridBlockSize: 1, gridMajorInterval: 10 }))
      .filter((line) => line.kind === "major")
      .map((line) => line.coordinate);
    expect(majors).toEqual([-10, 10]);
  });

  it("keep the inch layout on an inch grid", () => {
    expect(workplaneGridLayout({ gridBlockSize: 25.4 / 4, gridBlockPreset: "1/4 in", gridMajorInterval: 10 }).majorInterval).toBe(4);
  });

  it("take their own colour when one is set, in every theme", () => {
    expect(workplaneGridPalette("light", "#c8edf9", "default", "#8fcbe1").major.color).toBe("#8fcbe1");
    expect(workplaneGridPalette("dark", "#c8edf9", "graphite", "#8fcbe1").major.color).toBe("#8fcbe1");
    expect(workplaneThemePalette("light", "#ffffff", "#c8edf9", "default", "#fafafa", "#8fcbe1").grid.major.color).toBe("#8fcbe1");
    // Without one they follow the grid colour as before.
    expect(workplaneGridPalette("light", "#c8edf9").major.color).toBe("#c8edf9");
    expect(workplaneGridPalette("light", "#c8edf9", "default", "").major.color).toBe("#c8edf9");
  });

  it("load from saved settings and fall back to the old look", () => {
    const loaded = normalizeWorkspaceSettings({ ...DEFAULT_WORKPLANE_WORKSPACE, gridMajorInterval: 10, gridMajorColor: "#8fcbe1" });
    expect(loaded.gridMajorInterval).toBe(10);
    expect(loaded.gridMajorColor).toBe("#8fcbe1");
    const old = normalizeWorkspaceSettings({ width: 200, depth: 200 });
    expect(old.gridMajorInterval).toBe(5);
    expect(old.gridMajorColor).toBe("");
    const odd = normalizeWorkspaceSettings({ ...DEFAULT_WORKPLANE_WORKSPACE, gridMajorInterval: 7, gridMajorColor: "blue" });
    expect(odd.gridMajorInterval).toBe(5);
    expect(odd.gridMajorColor).toBe("");
  });
});
