import { describe, expect, it } from "vitest";
import { DEFAULT_LIGHT_AZIMUTH, DEFAULT_LIGHT_ELEVATION, fillLightPosition, keyLightPosition, sceneLightLevels, shadowBlurRadius } from "@/lib/workplaneGrid";
import { DEFAULT_WORKPLANE_WORKSPACE, normalizeWorkspaceSettings } from "@/lib/workplaneSettings";

describe("shading contrast and shadow strength", () => {
  it("start as the lighting layerling always had", () => {
    expect(DEFAULT_WORKPLANE_WORKSPACE.shadeContrast).toBe(0);
    expect(DEFAULT_WORKPLANE_WORKSPACE.shadowStrength).toBe(100);
    expect(sceneLightLevels(0)).toEqual({ ambient: 2.1, key: 3.1, fill: 1.2 });
  });

  it("moves light from the even ambient to the key light for more contrast, and back for less", () => {
    const punchy = sceneLightLevels(100);
    const soft = sceneLightLevels(-100);
    expect(punchy.ambient).toBeLessThan(2.1);
    expect(punchy.key).toBeGreaterThan(3.1);
    expect(soft.ambient).toBeGreaterThan(2.1);
    expect(soft.key).toBeLessThan(3.1);
    expect(sceneLightLevels(500)).toEqual(punchy);
    expect(sceneLightLevels(Number.NaN)).toEqual(sceneLightLevels(0));
  });

  it("keeps what was chosen, within range, and takes older settings as the defaults", () => {
    expect(normalizeWorkspaceSettings({ shadeContrast: 40, shadowStrength: 60 })).toMatchObject({ shadeContrast: 40, shadowStrength: 60 });
    expect(normalizeWorkspaceSettings({ shadeContrast: 900, shadowStrength: -5 })).toMatchObject({ shadeContrast: 100, shadowStrength: 0 });
    expect(normalizeWorkspaceSettings({ gridColor: "#c08a12" })).toMatchObject({ shadeContrast: 0, shadowStrength: 100 });
  });
});

describe("sketch colour settings", () => {
  it("start as the sketch always looked, keep a chosen colour and refuse a broken one", () => {
    expect(DEFAULT_WORKPLANE_WORKSPACE.sketchBackground).toBe("#fcfbf8");
    expect(normalizeWorkspaceSettings({ sketchBackground: "#ffffff", sketchGridColor: "#0e69f1" })).toMatchObject({ sketchBackground: "#ffffff", sketchGridColor: "#0e69f1" });
    expect(normalizeWorkspaceSettings({ sketchBackground: "white", sketchGridColor: 3 })).toMatchObject({
      sketchBackground: DEFAULT_WORKPLANE_WORKSPACE.sketchBackground,
      sketchGridColor: DEFAULT_WORKPLANE_WORKSPACE.sketchGridColor,
    });
  });
});

describe("shadow softness and light direction (#143)", () => {
  it("start where the light always stood, with crisp shadows", () => {
    expect(DEFAULT_WORKPLANE_WORKSPACE).toMatchObject({ shadowSoftness: 0, lightAzimuth: DEFAULT_LIGHT_AZIMUTH, lightElevation: DEFAULT_LIGHT_ELEVATION });
    const start = keyLightPosition(DEFAULT_LIGHT_AZIMUTH, DEFAULT_LIGHT_ELEVATION);
    // The old fixed position was (70, 130, 75).
    expect(Math.abs(start.x - 70)).toBeLessThan(1);
    expect(Math.abs(start.y - 130)).toBeLessThan(1);
    expect(Math.abs(start.z - 75)).toBeLessThan(1);
    expect(shadowBlurRadius(0)).toBe(1);
    expect(shadowBlurRadius(100)).toBeGreaterThan(shadowBlurRadius(50));
  });

  it("turns round the plate and lifts to straight above, held just off the vertical", () => {
    const right = keyLightPosition(90, 45);
    expect(right.x).toBeGreaterThan(100);
    expect(Math.abs(right.z)).toBeLessThan(1e-9);
    const above = keyLightPosition(0, 90);
    expect(above.y).toBeCloseTo(165, 0);
    expect(above.z).toBeGreaterThan(0);
  });

  it("reaches darker at the punchy end than before, and keeps the soft side", () => {
    expect(sceneLightLevels(100).ambient).toBeLessThan(1);
    expect(sceneLightLevels(100).fill).toBeLessThan(1.2);
    const soft = sceneLightLevels(-100);
    expect(soft.ambient).toBeCloseTo(3.15, 9);
    expect(soft.key).toBeCloseTo(1.55, 9);
    expect(soft.fill).toBe(1.2);
  });

  it("keeps chosen values within range", () => {
    expect(normalizeWorkspaceSettings({ shadowSoftness: 150, lightAzimuth: -400, lightElevation: 5 })).toMatchObject({ shadowSoftness: 100, lightAzimuth: -180, lightElevation: 10 });
  });
});

describe("fill light", () => {
  it("stands where it always stood with the light at its default, and turns along with it", () => {
    expect(fillLightPosition(DEFAULT_LIGHT_AZIMUTH)).toEqual({ x: -95, y: 45, z: -60 });
    const turned = fillLightPosition(DEFAULT_LIGHT_AZIMUTH + 180);
    expect(turned.x).toBeCloseTo(95, 6);
    expect(turned.z).toBeCloseTo(60, 6);
  });
});
