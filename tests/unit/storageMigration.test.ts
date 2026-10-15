import { describe, expect, it } from "vitest";
import { migrateLegacyStorageKeys, shouldCarryOverProjectRecord } from "@/lib/storageMigration";

function fakeStorage(entries: Record<string, string> = {}) {
  const map = new Map(Object.entries(entries));
  const storage = {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    clear: () => map.clear(),
    key: (index: number) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
  // Object.keys() over a real Storage lists its keys; the fake needs the same.
  return new Proxy(storage, {
    ownKeys: () => [...map.keys()],
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
  });
}

describe("storage keys from before the rename", () => {
  it("carries a setting across and keeps the old key as a safety net", () => {
    const storage = fakeStorage({ "sketchForge.theme": "dark" });
    migrateLegacyStorageKeys(storage);
    expect(storage.getItem("layerling.theme")).toBe("dark");
    expect(storage.getItem("sketchForge.theme")).toBe("dark");
  });

  it("does not overwrite a choice already made under the new name", () => {
    const storage = fakeStorage({ "sketchForge.language": "de", "layerling.language": "en" });
    migrateLegacyStorageKeys(storage);
    expect(storage.getItem("layerling.language")).toBe("en");
    expect(storage.getItem("sketchForge.language")).toBe("de");
  });

  it("moves the per-workspace defaults, whatever they are called", () => {
    const storage = fakeStorage({
      "sketchForge.workspaceDefault.project-a": "{}",
      "sketchForge.workspaceDefault.project-b": "{\"grid\":1}",
    });
    migrateLegacyStorageKeys(storage);
    expect(storage.getItem("layerling.workspaceDefault.project-a")).toBe("{}");
    expect(storage.getItem("layerling.workspaceDefault.project-b")).toBe("{\"grid\":1}");
    expect(storage.getItem("sketchForge.workspaceDefault.project-a")).toBe("{}");
  });

  it("also handles the lower-case key the editor identity used", () => {
    const storage = fakeStorage({ "sketchforge.mcp.editorIdentity": "{\"editorNumber\":42}" });
    migrateLegacyStorageKeys(storage);
    expect(storage.getItem("layerling.mcp.editorIdentity")).toBe("{\"editorNumber\":42}");
  });

  it("does not treat the database name as a setting - the projects move on their own path", () => {
    const storage = fakeStorage({ "sketchForge.projectShapes": "keep" });
    migrateLegacyStorageKeys(storage);
    expect(storage.getItem("sketchForge.projectShapes")).toBe("keep");
  });

  it("does nothing when there is nothing to move", () => {
    const storage = fakeStorage({ "layerling.theme": "light" });
    expect(() => migrateLegacyStorageKeys(storage)).not.toThrow();
    expect(storage.getItem("layerling.theme")).toBe("light");
  });
});

describe("which project record wins when the old database is copied over", () => {
  const legacy = { id: "p1", revision: 100, skfPackage: { byteLength: 146137 } };

  it("copies a project the new database does not have yet", () => {
    expect(shouldCarryOverProjectRecord(legacy, undefined)).toBe(true);
  });

  it("leaves a project that was edited after the copy alone", () => {
    expect(shouldCarryOverProjectRecord(legacy, { id: "p1", revision: 200, lylPackage: { byteLength: 752 } })).toBe(false);
  });

  it("repairs an empty save written over the copy at the same revision", () => {
    // What a build that read the package under the wrong field name left behind:
    // same revision, but an empty project in place of the real one.
    expect(shouldCarryOverProjectRecord(legacy, { id: "p1", revision: 100, lylPackage: { byteLength: 752 } })).toBe(true);
  });

  it("does not overwrite a copy that is already complete", () => {
    expect(shouldCarryOverProjectRecord(legacy, { id: "p1", revision: 100, skfPackage: { byteLength: 146137 } })).toBe(false);
  });

  it("counts a plain shape list as content too", () => {
    const inline = { id: "p2", revision: 5, shapes: [{}, {}, {}] };
    expect(shouldCarryOverProjectRecord(inline, { id: "p2", revision: 5, shapes: [] })).toBe(true);
    expect(shouldCarryOverProjectRecord(inline, { id: "p2", revision: 5, shapes: [{}, {}, {}] })).toBe(false);
  });
});
