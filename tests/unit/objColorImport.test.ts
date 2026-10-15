import { describe, expect, it } from "vitest";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject } from "@/lib/lylProject";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { exportMeshesToObj, type ObjExportMesh } from "@/lib/objExport";
import { importedShapeFromObj, importedShapesFromObj, parseMtlColors } from "@/lib/objImport";

/** Ein Quader als Netz in layerlings Koordinaten (Y oben). */
function box(name: string, color: string | undefined, [cx, cy, cz]: [number, number, number], [w, h, d]: [number, number, number]): ObjExportMesh {
  const x = [cx - w / 2, cx + w / 2];
  const y = [cy, cy + h];
  const z = [cz - d / 2, cz + d / 2];
  const vertices: Array<[number, number, number]> = [];
  for (const i of [0, 1]) for (const j of [0, 1]) for (const k of [0, 1]) vertices.push([x[i], y[j], z[k]]);
  const v = (i: number, j: number, k: number) => i * 4 + j * 2 + k;
  const quads = [
    [v(0, 0, 0), v(1, 0, 0), v(1, 0, 1), v(0, 0, 1)],
    [v(0, 1, 0), v(0, 1, 1), v(1, 1, 1), v(1, 1, 0)],
    [v(0, 0, 0), v(0, 1, 0), v(1, 1, 0), v(1, 0, 0)],
    [v(0, 0, 1), v(1, 0, 1), v(1, 1, 1), v(0, 1, 1)],
    [v(0, 0, 0), v(0, 0, 1), v(0, 1, 1), v(0, 1, 0)],
    [v(1, 0, 0), v(1, 1, 0), v(1, 1, 1), v(1, 0, 1)],
  ];
  const faces = quads.flatMap(([a, b, c, e]) => [[a, b, c], [a, c, e]] as Array<[number, number, number]>);
  return { name, color, vertices, faces };
}

/** Eine OBJ mit zwei Materialien, wie andere Programme sie schreibt. */
const MATERIAL_OBJ = [
  "mtllib obj.mtl",
  "o plate",
  "v 0 0 0", "v 40 0 0", "v 40 0 20", "v 0 0 20",
  "v 0 3 0", "v 40 3 0", "v 40 3 20", "v 0 3 20",
  "usemtl color_15277357",
  "f 1 2 3 4", "f 5 8 7 6", "f 1 5 6 2", "f 2 6 7 3", "f 3 7 8 4", "f 4 8 5 1",
  "o logo",
  "v 10 3 5", "v 30 3 5", "v 30 3 15", "v 10 3 15",
  "v 10 4 5", "v 30 4 5", "v 30 4 15", "v 10 4 15",
  "usemtl color_16777215",
  "f 9 10 11 12", "f 13 16 15 14", "f 9 13 14 10", "f 10 14 15 11", "f 11 15 16 12", "f 12 16 13 9",
].join("\n");

describe("OBJ import with colours (Discussion #79)", () => {
  it("brings layerling's own coloured OBJ back as one body per colour, in place", () => {
    const obj = exportMeshesToObj([
      box("Halter", "#1a1a1a", [0, 0, 0], [40, 3, 20]),
      box("Logo", "#ffffff", [5, 3, 0], [20, 1, 10]),
    ]);
    const result = importedShapesFromObj("jubal.obj", obj);
    expect(result.split).toBe(true);
    expect(result.missingMaterialColors).toBe(false);
    const [plate, logo] = result.shapes;
    expect(plate.color).toBe("#1a1a1a");
    expect(logo.color).toBe("#ffffff");
    expect(plate.width).toBeCloseTo(40, 6);
    expect(logo.width).toBeCloseTo(20, 6);
    // Lage zueinander bleibt: das Logo 5 mm rechts der Plattenmitte, auf ihr.
    expect(logo.x - plate.x).toBeCloseTo(5, 6);
    expect(logo.z - plate.z).toBeCloseTo(0, 6);
    expect((logo.elevation ?? 0) - (plate.elevation ?? 0)).toBeCloseTo(3, 6);
    // Die Teile tragen ihr Netz selbst, damit eine .lyl sie nicht aus der ganzen Datei neu baut.
    expect(result.shapes.every((shape) => shape.importedMesh?.sourceFormat === "json")).toBe(true);
  });

  it("re-imports its own OBJ upright, as it was exported", () => {
    const obj = exportMeshesToObj([box("Platte", undefined, [0, 0, 0], [40, 3, 20])]);
    const [plate] = importedShapesFromObj("platte.obj", obj).shapes;
    expect(plate.width).toBeCloseTo(40, 6);
    expect(plate.height).toBeCloseTo(3, 6);
    expect(plate.depth).toBeCloseTo(20, 6);
  });

  it("takes the colours from the .mtl", () => {
    const mtl = "newmtl color_15277357\nKd 0.9 0.4 0.1\nnewmtl color_16777215\nKd 1 1 1\n";
    const result = importedShapesFromObj("tinker.obj", MATERIAL_OBJ, [mtl]);
    expect(result.shapes.map((shape) => shape.color)).toEqual(["#e6661a", "#ffffff"]);
    expect(result.shapes[1].elevation).toBeCloseTo(3, 6);
  });

  it("reads the colour from the material name when the .mtl is missing", () => {
    const result = importedShapesFromObj("tinker.obj", MATERIAL_OBJ);
    expect(result.shapes.map((shape) => shape.color)).toEqual(["#e91d2d", "#ffffff"]);
    expect(result.missingMaterialColors).toBe(false);
  });

  it("still splits by material without any colour, and says the colours are missing", () => {
    const plain = MATERIAL_OBJ.replace("color_15277357", "Holz").replace("color_16777215", "Lack");
    const result = importedShapesFromObj("teil.obj", plain);
    expect(result.split).toBe(true);
    expect(result.missingMaterialColors).toBe(true);
    expect(result.shapes.map((shape) => shape.name)).toEqual(["teil Holz", "teil Lack"]);
    expect(new Set(result.shapes.map((shape) => shape.color)).size).toBe(2);
  });

  it("keeps a single-colour OBJ from elsewhere as one body that the project file rebuilds from the source", () => {
    const single = MATERIAL_OBJ.split("\n").slice(0, 16).join("\n");
    const result = importedShapesFromObj("platte.obj", single);
    expect(result.split).toBe(false);
    expect(result.shapes).toHaveLength(1);
    expect(result.shapes[0].color).toBe("#e91d2d");
    expect(result.shapes[0].importedMesh?.sourceFormat).toBe("obj");
  });

  it("lets its own single-colour OBJ carry the mesh, so older projects keep their reading", () => {
    const obj = exportMeshesToObj([box("Teil", "#2f9e44", [0, 0, 0], [10, 4, 20])]);
    const [shape] = importedShapesFromObj("teil.obj", obj).shapes;
    expect(shape.color).toBe("#2f9e44");
    expect(shape.height).toBeCloseTo(4, 6);
    expect(shape.importedMesh?.sourceFormat).toBe("json");
    // Was eine .lyl aus einer mitgespeicherten Quelle nachbaut, bleibt wie es war.
    expect(importedShapeFromObj("teil.obj", obj, true).height).toBeCloseTo(20, 6);
  });

  it("leaves an OBJ without colours as it was", () => {
    const obj = exportMeshesToObj([box("Teil", undefined, [0, 0, 0], [10, 10, 10])]);
    const result = importedShapesFromObj("teil.obj", obj);
    expect(result.split).toBe(false);
    expect(result.shapes[0].color).toBe("#0098c7");
  });

  it("reads Kd in 0..1 and 0..255", () => {
    expect(parseMtlColors("newmtl a\nKd 1 0.5 0\nnewmtl b\nKd 255 128 0\n")).toEqual(new Map([["a", "#ff8000"], ["b", "#ff8000"]]));
  });

  it("survives saving and opening the design", async () => {
    const obj = exportMeshesToObj([
      box("Halter", "#1a1a1a", [0, 0, 0], [40, 3, 20]),
      box("Logo", "#ffffff", [5, 3, 0], [20, 1, 10]),
    ]);
    const { shapes } = importedShapesFromObj("jubal.obj", obj);
    const bytes = await exportLylProject({
      projectName: "Jubal",
      createdAt: 1,
      modifiedAt: 2,
      shapes,
      history: [editorHistoryEntry(shapes, [])],
      historyIndex: 0,
      assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      snapGrid: DEFAULT_SNAP_GRID,
      placementElevation: 0,
    });
    const restored = await importLylProject(bytes);
    expect(restored.shapes.map((shape) => shape.color)).toEqual(["#1a1a1a", "#ffffff"]);
    restored.shapes.forEach((shape, index) => {
      expect(shape.importedMesh?.positions).toEqual(shapes[index].importedMesh?.positions);
      expect(shape.elevation ?? 0).toBeCloseTo(shapes[index].elevation ?? 0, 9);
    });
  });
});
