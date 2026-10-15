import { describe, expect, it } from "vitest";
import { strFromU8, strToU8, unzipSync } from "fflate";
import { BUG_REPORT_FILE, bugReportText, rememberBugReportEvent, type BugReportInfo } from "@/lib/bugReport";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";

const info: BugReportInfo = {
  version: "1.28.3",
  createdAt: Date.UTC(2026, 9, 3, 12, 0, 0),
  language: "de",
  userAgent: "TestBrowser/1.0",
  screen: { width: 1920, height: 1080, pixelRatio: 1.5 },
  viewport: { width: 1376, height: 808 },
  touch: false,
  webgl: "ANGLE (Test GPU)",
  unit: "mm",
  printer: "",
  shapeCount: 3,
  shapeKinds: { box: 2, sketch: 1 },
  selectedCount: 1,
  workplane: "on a face",
  openGroup: false,
  sketchActive: false,
  notices: [{ at: Date.UTC(2026, 9, 3, 11, 59, 0), text: "Skizze aktualisiert" }],
  errors: [],
};

describe("bug report", () => {
  it("keeps only the last events and skips a repeat", () => {
    let list = rememberBugReportEvent([], "eins", 1);
    list = rememberBugReportEvent(list, "eins", 2);
    list = rememberBugReportEvent(list, "  ", 3);
    expect(list).toEqual([{ at: 1, text: "eins" }]);
    for (let index = 0; index < 50; index += 1) list = rememberBugReportEvent(list, `m${index}`, index, 40);
    expect(list).toHaveLength(40);
    expect(list.at(-1)?.text).toBe("m49");
  });

  it("writes version, environment, scene and the last messages", () => {
    const text = bugReportText(info);
    expect(text).toContain("Version:      1.28.3");
    expect(text).toContain("1920 x 1080 @ 1.5x");
    expect(text).toContain("Objects:      3 (box 2, sketch 1)");
    expect(text).toContain("Workplane:    on a face");
    expect(text).toContain("2026-10-03 11:59:00  Skizze aktualisiert");
    expect(text).toContain("Errors:\n  (none)");
  });

  it("travels inside a .lyl that still opens", async () => {
    const bytes = await exportLylProject({
      projectName: "Bericht",
      createdAt: 1,
      modifiedAt: 2,
      shapes: [],
      history: [editorHistoryEntry([], [])],
      historyIndex: 0,
      assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      snapGrid: DEFAULT_SNAP_GRID,
      placementElevation: 0,
      extraFiles: { [BUG_REPORT_FILE]: strToU8(bugReportText(info)) },
    });
    expect(strFromU8(unzipSync(bytes)[BUG_REPORT_FILE])).toContain("layerling bug report");
    const restored = await importLylProject(bytes);
    expect(restored.projectName).toBe("Bericht");
  });
});
