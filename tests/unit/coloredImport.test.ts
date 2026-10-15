import { describe, expect, it } from "vitest";
import { FALLBACK_PART_COLORS, normalizeHexColor, placeColoredParts } from "@/lib/coloredImport";
import { importedShapeFromTriangleSoup } from "@/lib/stlImport";

/** Ein Quader als Dreiecke, Y oben. */
function boxPositions([x0, y0, z0]: number[], [x1, y1, z1]: number[]) {
  const v = (i: number, j: number, k: number) => [[x0, x1][i], [y0, y1][j], [z0, z1][k]];
  const quads = [
    [v(0, 0, 0), v(1, 0, 0), v(1, 0, 1), v(0, 0, 1)],
    [v(0, 1, 0), v(0, 1, 1), v(1, 1, 1), v(1, 1, 0)],
    [v(0, 0, 0), v(0, 1, 0), v(1, 1, 0), v(1, 0, 0)],
    [v(0, 0, 1), v(1, 0, 1), v(1, 1, 1), v(0, 1, 1)],
    [v(0, 0, 0), v(0, 0, 1), v(0, 1, 1), v(0, 1, 0)],
    [v(1, 0, 0), v(1, 1, 0), v(1, 1, 1), v(1, 0, 1)],
  ];
  return quads.flatMap(([a, b, c, d]) => [...a, ...b, ...c, ...a, ...c, ...d]);
}

describe("normalizeHexColor", () => {
  it("reads the colour forms 3MF and slicers write", () => {
    expect(normalizeHexColor("#C81E1EFF")).toBe("#c81e1e");
    expect(normalizeHexColor("#fff")).toBe("#ffffff");
    expect(normalizeHexColor("161616")).toBe("#161616");
    expect(normalizeHexColor("rot")).toBeUndefined();
    expect(normalizeHexColor(null)).toBeUndefined();
  });
});

describe("placeColoredParts", () => {
  const build = (positions: number[]) => importedShapeFromTriangleSoup("teil.3mf", positions, undefined, "3mf");

  it("keeps the parts where they stood against each other", () => {
    const [plate, peg] = placeColoredParts("teil", [
      { color: "#000000", positions: boxPositions([-20, 0, -10], [20, 3, 10]) },
      { color: "#ffffff", label: "Stift", positions: boxPositions([12, 3, 2], [16, 13, 6]) },
    ], build);
    expect(peg.x - plate.x).toBeCloseTo(14, 6);
    expect(peg.z - plate.z).toBeCloseTo(4, 6);
    expect((peg.elevation ?? 0) - (plate.elevation ?? 0)).toBeCloseTo(3, 6);
    expect(peg.height).toBeCloseTo(10, 6);
    expect([plate.name, peg.name]).toEqual(["teil 1", "teil Stift"]);
    expect([plate.color, peg.color]).toEqual(["#000000", "#ffffff"]);
    expect([plate, peg].every((shape) => shape.importedMesh?.sourceFormat === "json")).toBe(true);
  });

  it("gives parts without a colour distinct fallback colours", () => {
    const parts = placeColoredParts("teil", [
      { positions: boxPositions([0, 0, 0], [1, 1, 1]) },
      { color: "#123456", positions: boxPositions([2, 0, 0], [3, 1, 1]) },
      { positions: boxPositions([4, 0, 0], [5, 1, 1]) },
    ], build);
    expect(parts.map((part) => part.color)).toEqual([FALLBACK_PART_COLORS[0], "#123456", FALLBACK_PART_COLORS[1]]);
  });
});

describe("zipHoldsDesigns", () => {
  it("tells a backup from another tool's OBJ ZIP", async () => {
    const { zipSync, strToU8 } = await import("fflate");
    const { zipHoldsDesigns } = await import("@/lib/projectBackup");
    expect(zipHoldsDesigns(zipSync({ "Entwurf.lyl": strToU8("x") }))).toBe(true);
    expect(zipHoldsDesigns(zipSync({ "tinker.obj": strToU8("v 0 0 0"), "obj.mtl": strToU8("newmtl a") }))).toBe(false);
    expect(zipHoldsDesigns(strToU8("kein zip"))).toBe(false);
  });
});
