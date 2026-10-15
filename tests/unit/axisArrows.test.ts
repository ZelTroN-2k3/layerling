import { describe, expect, it } from "vitest";
import { AXIS_ARROW_COLORS, axisArrowLayout } from "@/lib/workplaneGrid";
import { DEFAULT_WORKPLANE_WORKSPACE, normalizeWorkspaceSettings } from "@/lib/workplaneSettings";

describe("axis arrows", () => {
  it("stand at the plate's front left corner, as long as the plate allows", () => {
    expect(axisArrowLayout(200, 200)).toEqual({ x: -100, z: 100, length: 24 });
    const small = axisArrowLayout(60, 40);
    expect(small.x).toBe(-30);
    expect(small.z).toBe(20);
    // A small plate still gets arrows long enough to read.
    expect(small.length).toBe(6);
    // Never longer than a fifth of the smaller side on a plate big enough to say so.
    expect(axisArrowLayout(400, 300).length).toBe(24);
    expect(axisArrowLayout(100, 100).length).toBe(12);
  });

  it("use the colours of the slicers: X red, Y green, Z blue", () => {
    expect(AXIS_ARROW_COLORS).toEqual({ x: "#e5484d", y: "#3fae5a", z: "#3b82f6" });
  });

  it("are on by default, can be switched off, and old settings take the default", () => {
    expect(DEFAULT_WORKPLANE_WORKSPACE.showAxes).toBe(true);
    expect(normalizeWorkspaceSettings({ showAxes: false }).showAxes).toBe(false);
    expect(normalizeWorkspaceSettings({ gridColor: "#c08a12" }).showAxes).toBe(true);
    expect(normalizeWorkspaceSettings({ showAxes: "no" }).showAxes).toBe(true);
  });
});
