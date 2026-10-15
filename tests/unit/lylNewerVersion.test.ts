import { describe, expect, it } from "vitest";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject, isNewerLayerlingVersion, LYL_CREATED_WITH_VERSION, type LylProjectDocumentV1 } from "@/lib/lylProject";
import { localizedError } from "@/lib/userErrors";
import { setLanguage } from "@/lib/i18n";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * A design saved by a newer layerling: what it holds may be new to this version - a shape, a
 * setting, fonts of one's own. Where that keeps it from opening, the reason names both versions
 * and the way out; where it opens, the editor is told so it can say the same.
 */

const box: WorkplaneShape = { id: "b", name: "Box", kind: "box", color: "#123456", x: 0, z: 0, size: 20, width: 20, depth: 20, height: 10, rotation: 0 };

async function design() {
  return exportLylProject({
    projectName: "Newer",
    createdAt: 1_700_000_000_000,
    modifiedAt: 1_700_000_100_000,
    shapes: [box],
    history: [editorHistoryEntry([box], [])],
    historyIndex: 0,
    assets: [],
    workspace: DEFAULT_WORKPLANE_WORKSPACE,
    snapGrid: DEFAULT_SNAP_GRID,
    placementElevation: 0,
  });
}

function rewrite(bytes: Uint8Array, change: (document: LylProjectDocumentV1) => void) {
  const files = unzipSync(bytes);
  const document = JSON.parse(strFromU8(files["project.json"])) as LylProjectDocumentV1;
  change(document);
  files["project.json"] = strToU8(JSON.stringify(document));
  return zipSync(files);
}

describe("designs from a newer layerling", () => {
  it("compares version numbers part by part", () => {
    expect(isNewerLayerlingVersion("1.58.0", "1.57.0")).toBe(true);
    expect(isNewerLayerlingVersion("1.57.10", "1.57.9")).toBe(true);
    expect(isNewerLayerlingVersion("2.0.0", "1.99.99")).toBe(true);
    expect(isNewerLayerlingVersion("1.57.0", "1.57.0")).toBe(false);
    expect(isNewerLayerlingVersion("1.56.2", "1.57.0")).toBe(false);
    expect(isNewerLayerlingVersion("nonsense", "1.57.0")).toBe(false);
    expect(isNewerLayerlingVersion(undefined, "1.57.0")).toBe(false);
  });

  it("explains a design it cannot open by both versions, in the user's language", async () => {
    const bytes = rewrite(await design(), (document) => {
      document.createdWithVersion = "99.0.0";
      (document.states[0] as unknown as { nodes: Array<{ definition: { kind: string } }> }).nodes[0].definition.kind = "warpDrive";
    });
    let message = "";
    try {
      await importLylProject(bytes);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/^This design was saved with layerling 99\.0\.0, newer than this layerling/);
    expect(message).toMatch(/warpDrive/);
    setLanguage("de");
    expect(localizedError(message)).toContain(`mit layerling 99.0.0 gespeichert, du hast ${LYL_CREATED_WITH_VERSION}`);
    setLanguage("en");
    expect(localizedError(message)).toContain(`saved with layerling 99.0.0, and you have ${LYL_CREATED_WITH_VERSION}`);
  });

  it("keeps the plain reason for a broken design from this or an older version", async () => {
    const bytes = rewrite(await design(), (document) => {
      (document.states[0] as unknown as { nodes: Array<{ definition: { kind: string } }> }).nodes[0].definition.kind = "warpDrive";
    });
    await expect(importLylProject(bytes)).rejects.toThrow(/unknown shape type 'warpDrive'/);
  });

  it("opens a newer design it can read, and says it is newer", async () => {
    const newer = await importLylProject(rewrite(await design(), (document) => {
      document.createdWithVersion = "99.0.0";
    }));
    expect(newer.savedWithNewerVersion).toBe("99.0.0");
    expect(newer.shapes).toHaveLength(1);
    const same = await importLylProject(await design());
    expect(same.savedWithNewerVersion).toBeUndefined();
  });
});
