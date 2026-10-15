import { describe, expect, it } from "vitest";
import { DEFAULT_WORKPLANE_WORKSPACE, normalizeWorkspaceSettings } from "@/lib/workplaneSettings";

describe("the grid lines' growth while zooming (#240)", () => {
  it("is on by default and is kept when switched off", () => {
    expect(DEFAULT_WORKPLANE_WORKSPACE.gridLinesGrow).toBe(true);
    expect(normalizeWorkspaceSettings({ gridLinesGrow: false }).gridLinesGrow).toBe(false);
    expect(normalizeWorkspaceSettings({ gridColor: "#c08a12" }).gridLinesGrow).toBe(true);
    expect(normalizeWorkspaceSettings({ gridLinesGrow: "no" }).gridLinesGrow).toBe(true);
  });
});
