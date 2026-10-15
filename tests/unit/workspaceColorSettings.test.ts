import { describe, expect, it } from "vitest";
import { DEFAULT_WORKPLANE_WORKSPACE, normalizeWorkspaceSettings } from "@/lib/workplaneSettings";

describe("background, workplane and edge line settings", () => {
  it("start as the look layerling always had: cream, no extra edge lines, black when switched on", () => {
    expect(DEFAULT_WORKPLANE_WORKSPACE.background).toBe("#fbf8f0");
    expect(DEFAULT_WORKPLANE_WORKSPACE.surfaceColor).toBe("#fdf4dd");
    expect(DEFAULT_WORKPLANE_WORKSPACE.edgeLines).toBe(false);
    expect(DEFAULT_WORKPLANE_WORKSPACE.edgeColor).toBe("#000000");
  });

  it("keeps what was chosen", () => {
    const settings = normalizeWorkspaceSettings({ background: "#ffffff", surfaceColor: "#e0e0e0", edgeLines: true, edgeColor: "#333333" });
    expect(settings).toMatchObject({ background: "#ffffff", surfaceColor: "#e0e0e0", edgeLines: true, edgeColor: "#333333" });
  });

  it("takes settings saved before they existed as the defaults, and refuses a colour that is none", () => {
    const old = normalizeWorkspaceSettings({ gridColor: "#c08a12" });
    expect(old.surfaceColor).toBe("#fdf4dd");
    expect(old.edgeLines).toBe(false);
    const broken = normalizeWorkspaceSettings({ surfaceColor: "red", edgeColor: "#12", edgeLines: "yes" });
    expect(broken.surfaceColor).toBe("#fdf4dd");
    expect(broken.edgeColor).toBe("#000000");
    expect(broken.edgeLines).toBe(false);
  });
});
