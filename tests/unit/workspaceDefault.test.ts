import { describe, expect, it } from "vitest";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE, readWorkspaceDefault, saveWorkspaceDefault, WORKSPACE_DEFAULT_STORAGE_KEY } from "@/lib/workplaneSettings";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, String(value)); },
  };
}

describe("workspace default", () => {
  it("returns nothing until a default was saved", () => {
    expect(readWorkspaceDefault(memoryStorage())).toBeNull();
    expect(readWorkspaceDefault(null)).toBeNull();
  });

  it("round-trips every workspace setting and the snap grid", () => {
    const storage = memoryStorage();
    const workspace = {
      ...DEFAULT_WORKPLANE_WORKSPACE,
      width: 320,
      depth: 180,
      showShadows: false,
      showGrid: false,
      clickToPlaceShapes: false,
      selectBeforeMove: true,
      zoomSpeed: 10,
      background: "#101010",
      accuracy: 3 as const,
      historyLimit: 250,
    };
    expect(saveWorkspaceDefault(workspace, "0.5 mm", storage)).toBe(true);
    expect(readWorkspaceDefault(storage)).toEqual({ workspace, snap: "0.5 mm" });
  });

  it("ignores unreadable stored data", () => {
    const storage = memoryStorage();
    storage.setItem(WORKSPACE_DEFAULT_STORAGE_KEY, "{broken");
    expect(readWorkspaceDefault(storage)).toBeNull();
    storage.setItem(WORKSPACE_DEFAULT_STORAGE_KEY, JSON.stringify({ workspace: { zoomSpeed: 9 }, snap: "Huge" }));
    expect(readWorkspaceDefault(storage)).toEqual({
      workspace: { ...DEFAULT_WORKPLANE_WORKSPACE, zoomSpeed: 9 },
      snap: DEFAULT_SNAP_GRID,
    });
  });
});
