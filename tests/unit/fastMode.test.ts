import { describe, expect, it } from "vitest";
import { DEFAULT_WORKPLANE_WORKSPACE, effectiveViewSettings, normalizeWorkspaceSettings, viewPixelRatio } from "@/lib/workplaneSettings";

describe("camera inertia and fast mode (#188)", () => {
  it("keeps the old behaviour by default and reads the new switches", () => {
    expect(DEFAULT_WORKPLANE_WORKSPACE.cameraInertia).toBe(true);
    expect(DEFAULT_WORKPLANE_WORKSPACE.fastMode).toBe(false);
    expect(normalizeWorkspaceSettings({ cameraInertia: false }).cameraInertia).toBe(false);
    expect(normalizeWorkspaceSettings({ fastMode: true }).fastMode).toBe(true);
    // Settings saved before these switches existed.
    expect(normalizeWorkspaceSettings({ showShadows: false }).cameraInertia).toBe(true);
    expect(normalizeWorkspaceSettings({ fastMode: "yes" }).fastMode).toBe(false);
  });

  it("turns the costly parts off together, and leaves the user's own values alone", () => {
    const own = { ...DEFAULT_WORKPLANE_WORKSPACE, showShadows: true, edgeLines: true, cameraInertia: true };
    expect(effectiveViewSettings(own)).toBe(own);
    const fast = { ...own, fastMode: true };
    const view = effectiveViewSettings(fast);
    expect(view.showShadows).toBe(false);
    expect(view.edgeLines).toBe(false);
    expect(view.cameraInertia).toBe(false);
    expect(fast.showShadows).toBe(true);
    expect(fast.edgeLines).toBe(true);
  });

  it("draws one pixel per screen pixel in fast mode, at most two otherwise", () => {
    expect(viewPixelRatio({ fastMode: true }, 2)).toBe(1);
    expect(viewPixelRatio({ fastMode: false }, 3)).toBe(2);
    expect(viewPixelRatio({ fastMode: false }, 1.25)).toBe(1.25);
    expect(viewPixelRatio({ fastMode: false }, 0)).toBe(1);
  });
});
