import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { exportLylProject, importLylProject, LYL_SCHEMA_ID } from "@/lib/lylProject";
import { strFromU8, unzipSync } from "fflate";
import { DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";

// A real .skf from before the rename: version 1 layout with display edges inline
// in every state, the old schema identifier, and the old asset headers. It guards
// every one of those reading paths at once.
const LEGACY_PACKAGE = path.resolve(__dirname, "../fixtures/version-1-project.skf");

describe("an .skf package written before the rename", () => {
  it("still opens and keeps its geometry, display edges, and history", async () => {
    const restored = await importLylProject(readFileSync(LEGACY_PACKAGE));
    const edges = [{ points: [0, 0, 0, 1, 2, 3] }, { points: [4, 5, 6, 7, 8, 9] }];

    expect(restored.migratedFromVersion).toBe(1);
    expect(restored.projectName).toBe("Legacy");
    expect(restored.sourceProjectId).toBe("legacy-project");
    expect(restored.history).toHaveLength(2);
    expect(restored.historyIndex).toBe(1);
    expect(restored.shapes[0].x).toBe(9);
    expect(restored.shapes[0].cadDisplayEdges).toEqual(edges);
    expect(restored.shapes[0].cadDisplayEdgesVersion).toBe(2);
    expect(restored.shapes[0].cadBrep).toBe("ISO-10303-21;");
    expect(restored.shapes[0].importedMesh?.positions).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    expect(restored.history[0].shapes[0].x).toBe(1);
    expect(restored.history[0].shapes[0].cadDisplayEdges).toEqual(edges);
  });

  it("is saved back under the current identifier, not the one it came with", async () => {
    const restored = await importLylProject(readFileSync(LEGACY_PACKAGE));
    const saved = await exportLylProject({
      projectId: "legacy-project",
      projectName: restored.projectName,
      shapes: restored.shapes,
      history: restored.history,
      historyIndex: restored.historyIndex,
      snapGrid: "Off",
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      assets: restored.assets ?? [],
    });
    const document = JSON.parse(strFromU8(unzipSync(saved)["project.json"])) as { schema: string };

    expect(document.schema).toBe(LYL_SCHEMA_ID);
  });
});
