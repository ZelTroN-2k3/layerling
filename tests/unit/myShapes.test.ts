import { describe, expect, it } from "vitest";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import {
  cleanMyShapeName,
  myShapeNameFromFile,
  myShapesBackupFileName,
  shapesForLibrary,
  shapesFromLibrary,
  sortMyShapes,
  type MyShapeMeta,
} from "@/lib/myShapes";
import { customShapeFileName } from "@/lib/customShapesServer";
import { CUSTOM_SHAPES_BACKUP_FOLDER, packBackup, unpackBackup, unpackCustomShapes, zipHoldsDesigns } from "@/lib/projectBackup";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

function box(id: string, x: number, z: number, elevation: number, overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id, name: id, kind: "box", color: "#d41721", x, z, elevation, size: 20, width: 20, depth: 10, height: 6, rotation: 0, locked: false, hidden: false, ...overrides };
}

describe("my shapes", () => {
  it("cleans names and takes them from files", () => {
    expect(cleanMyShapeName("  Halter \n v2  ", "Meine Form")).toBe("Halter v2");
    expect(cleanMyShapeName("   ", "Meine Form")).toBe("Meine Form");
    expect(cleanMyShapeName("x".repeat(200), "f")).toHaveLength(80);
    expect(myShapeNameFromFile("Halter v2.lyl", "f")).toBe("Halter v2");
    expect(myShapeNameFromFile("old.SKF", "f")).toBe("old");
    expect(myShapesBackupFileName(new Date(2026, 9, 5))).toBe("layerling-custom-shapes-2026-10-05.zip");
  });

  it("keeps the newest last", () => {
    const meta = (id: string, createdAt: number): MyShapeMeta => ({ id, name: id, createdAt, thumbnail: "", bodyCount: 1, byteLength: 1 });
    expect(sortMyShapes([meta("b", 2), meta("a", 1), meta("c", 3)]).map((entry) => entry.id)).toEqual(["a", "b", "c"]);
  });

  it("stores bodies centred and standing on the plate, and puts them down where asked", () => {
    const parts = [box("a", 40, 10, 5), box("b", 60, 30, 5)];
    // Footprint 30..70 by 5..35, lowest point 5.
    const kept = shapesForLibrary(parts, { minX: 30, maxX: 70, minY: 5, maxY: 11, minZ: 5, maxZ: 35 });
    expect(kept.map((shape) => [shape.x, shape.z, shape.elevation])).toEqual([[-10, -10, 0], [10, 10, 0]]);
    const placed = shapesFromLibrary(kept, { x: 100, y: 2, z: -50 });
    expect(placed.map((shape) => [shape.x, shape.z, shape.elevation])).toEqual([[90, -60, 2], [110, -40, 2]]);
    // The originals are left alone.
    expect(parts[0].x).toBe(40);
  });

  it("moves a group as a whole, its parts stay relative to it", () => {
    const group = box("g", 20, 20, 0, { groupedShapes: [box("p", 3, 4, 0)] });
    const [moved] = shapesFromLibrary([group], { x: 5, y: 0, z: 5 });
    expect([moved.x, moved.z]).toEqual([25, 25]);
    expect(moved.groupedShapes?.[0].x).toBe(3);
  });

  it("survives the trip through a design package without a history", async () => {
    const kept = shapesForLibrary([box("a", 0, 0, 0), box("b", 30, 0, 0, { hole: true })], { minX: -10, maxX: 40, minY: 0, maxY: 6, minZ: -5, maxZ: 5 });
    const bytes = await exportLylProject({
      projectName: "Halter",
      createdAt: 1,
      modifiedAt: 1,
      shapes: kept,
      notes: [],
      history: [],
      historyIndex: 0,
      assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      snapGrid: DEFAULT_SNAP_GRID,
      placementElevation: 0,
    });
    const restored = await importLylProject(bytes);
    expect(restored.projectName).toBe("Halter");
    expect(restored.shapes.map((shape) => [shape.id, shape.x, shape.hole ?? false])).toEqual([["a", -15, false], ["b", 15, true]]);
  });

  it("keeps custom shapes in their own folder of a backup", () => {
    const zip = packBackup([
      { name: "Entwurf.lyl", bytes: new Uint8Array([1]) },
      { name: `${CUSTOM_SHAPES_BACKUP_FOLDER}/Halter.lyl`, bytes: new Uint8Array([2]) },
      { name: `${CUSTOM_SHAPES_BACKUP_FOLDER}/custom-shapes.json`, bytes: new TextEncoder().encode(JSON.stringify({ shapes: [{ file: "Halter.lyl", name: "Halter" }] })) },
    ]);
    expect(unpackBackup(zip).map((entry) => entry.name)).toEqual(["Entwurf.lyl"]);
    const shapes = unpackCustomShapes(zip);
    expect(shapes.entries.map((entry) => [entry.name, entry.bytes[0]])).toEqual([["Halter.lyl", 2]]);
    expect((shapes.manifest as { shapes: Array<{ name: string }> }).shapes[0].name).toBe("Halter");
    // A backup with nothing but custom shapes still counts as a backup.
    expect(zipHoldsDesigns(packBackup([{ name: `${CUSTOM_SHAPES_BACKUP_FOLDER}/Halter.lyl`, bytes: new Uint8Array([2]) }]))).toBe(true);
  });

  it("names the file on the server after the shape, safely", () => {
    expect(customShapeFileName("Halter v2")).toBe("Halter v2.lyl");
    expect(customShapeFileName('a/b:c*"d"')).toBe("a-b-c--d-.lyl");
    expect(customShapeFileName("...")).toBe("Shape.lyl");
  });
});
