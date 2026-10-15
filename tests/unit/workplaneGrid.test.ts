import { describe, expect, it } from "vitest";
import { centeredWorkplaneGridCoordinates, workplaneGridLayout, workplaneGridLines, workplaneGridPalette, workplaneThemePalette, WORKPLANE_LINE_ELEVATION, WORKPLANE_MAJOR_GRID_INTERVAL } from "@/lib/workplaneGrid";

describe("workplane grid geometry", () => {
  it("excludes both perimeter coordinates when spacing divides the workplane", () => {
    const coordinates = centeredWorkplaneGridCoordinates(200, 5).map(({ coordinate }) => coordinate);

    expect(coordinates).not.toContain(-100);
    expect(coordinates).not.toContain(100);
    expect(coordinates).toContain(0);
    expect(coordinates.at(0)).toBe(-95);
    expect(coordinates.at(-1)).toBe(95);
  });

  it("keeps the final interior line for custom spacing", () => {
    const coordinates = centeredWorkplaneGridCoordinates(200, 30).map(({ coordinate }) => coordinate);

    expect(coordinates).toEqual([-90, -60, -30, 0, 30, 60, 90]);
  });

  it("meets the axes with the stronger lines on any plate size", () => {
    // 360 mm plate, 5 mm grid: counted from the corner the strong lines would fall 5 mm beside the axes.
    const majors = workplaneGridLines(360, workplaneGridLayout({ gridBlockSize: 5, gridBlockPreset: "5 mm", units: "Metric (Default)" }))
      .filter((line) => line.kind === "major")
      .map((line) => line.coordinate);

    expect(majors).toContain(25);
    expect(majors).not.toContain(20);
  });

  it("uses one elevation for grid and border lines", () => {
    expect(WORKPLANE_LINE_ELEVATION).toBe(0);
  });

  it("groups minor grid blocks into five-by-five major sections", () => {
    expect(WORKPLANE_MAJOR_GRID_INTERVAL).toBe(5);
  });

  it("preserves the minor, major, and axis line hierarchy", () => {
    const palette = workplaneGridPalette();

    expect(palette.minor.opacity).toBeLessThan(palette.major.opacity);
    expect(palette.major.opacity).toBeLessThan(palette.axis.opacity);
    expect(palette.minor.color).not.toBe(palette.major.color);
  });

  it("uses a complete dark viewport palette without changing the configured project background", () => {
    const configuredBackground = "#f8fbfc";
    const dark = workplaneThemePalette("dark", configuredBackground);
    const light = workplaneThemePalette("light", configuredBackground);

    expect(dark.sceneBackground).not.toBe(configuredBackground);
    expect(dark.surface.color).not.toBe(light.surface.color);
    expect(dark.grid.minor.color).not.toBe(light.grid.minor.color);
    expect(light.sceneBackground).toBe(configuredBackground);
  });

  it("takes a chosen surface colour in the light theme only", () => {
    expect(workplaneThemePalette("light", "#fbf8f0", undefined, "default", "#e0e0e0").surface.color).toBe("#e0e0e0");
    expect(workplaneThemePalette("light", "#fbf8f0").surface.color).toBe("#fdf4dd");
    expect(workplaneThemePalette("dark", "#fbf8f0", undefined, "default", "#e0e0e0").surface.color).toBe(workplaneThemePalette("dark", "#fbf8f0").surface.color);
  });

  it("applies a custom project grid color while retaining line hierarchy", () => {
    const customColor = "#c23b72";
    const palette = workplaneGridPalette("light", customColor);

    expect(palette.minor.color).toBe(customColor);
    expect(palette.major.color).toBe(customColor);
    expect(palette.axis.color).toBe(customColor);
    expect(palette.minor.opacity).toBeLessThan(palette.major.opacity);
    expect(palette.major.opacity).toBeLessThan(palette.axis.opacity);
  });

  it("draws the graphite canvas in neutral greys and keeps a custom grid colour", () => {
    const graphite = workplaneThemePalette("dark", "#f8fbfc", undefined, "graphite");
    const dark = workplaneThemePalette("dark", "#f8fbfc");
    const neutral = (hex: string) => hex.slice(1, 3) === hex.slice(3, 5) && hex.slice(3, 5) === hex.slice(5, 7);
    [graphite.sceneBackground, graphite.surface.color, graphite.grid.minor.color, graphite.grid.major.color, graphite.grid.axis.color, graphite.grid.border.color]
      .forEach((color) => expect(neutral(color)).toBe(true));
    expect(graphite.grid.minor.color).not.toBe(dark.grid.minor.color);
    expect(graphite.grid.minor.opacity).toBeLessThan(graphite.grid.major.opacity);
    expect(graphite.grid.major.opacity).toBeLessThan(graphite.grid.axis.opacity);
    expect(workplaneGridPalette("dark", "#c23b72", "graphite").minor.color).toBe("#c23b72");
    // Light mode ignores the palette.
    expect(workplaneThemePalette("light", "#f8fbfc", undefined, "graphite")).toEqual(workplaneThemePalette("light", "#f8fbfc"));
  });
});
