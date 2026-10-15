import { describe, expect, it } from "vitest";
import { boundsOverlap, exportColorGroups, meshBounds, overlappingExportClusters, type ExportBounds } from "@/lib/exportUnion";

/*
 * Magnetron hat gemeldet, dass zwei sich durchdringende Koerper als zwei
 * Huellen in der STL landen - CGAL bricht daran ab. Hier wird die Frage
 * geprueft, die darueber entscheidet: was gehoert zusammen und was nicht.
 * Buendig aneinander stossende Teile sollen zwei Teile bleiben.
 */

const kasten = (minX: number, maxX: number, minY = 0, maxY = 10, minZ = 0, maxZ = 10): ExportBounds =>
  ({ minX, maxX, minY, maxY, minZ, maxZ });

describe("meshBounds", () => {
  it("umfasst alle Ecken", () => {
    expect(meshBounds([[0, 0, 0], [2, 5, -3], [-1, 1, 4]])).toEqual({
      minX: -1, minY: 0, minZ: -3, maxX: 2, maxY: 5, maxZ: 4,
    });
  });

  it("gibt ohne Punkte nichts zurueck", () => {
    expect(meshBounds([])).toBeNull();
  });

  it("uebergeht kaputte Zahlen, statt alles zu verlieren", () => {
    expect(meshBounds([[0, 0, 0], [Number.NaN, 1, 1], [3, 3, 3]])).toEqual({
      minX: 0, minY: 0, minZ: 0, maxX: 3, maxY: 3, maxZ: 3,
    });
  });
});

describe("boundsOverlap", () => {
  it("erkennt echtes Durchdringen", () => {
    expect(boundsOverlap(kasten(0, 10), kasten(5, 15))).toBe(true);
  });

  it("nimmt buendig anstossende Teile mit - die geteilte Flaeche ist genauso kaputt", () => {
    expect(boundsOverlap(kasten(0, 10), kasten(10, 20))).toBe(true);
  });

  it("trennt, was wirklich Luft dazwischen hat", () => {
    expect(boundsOverlap(kasten(0, 10), kasten(10.001, 20))).toBe(false);
  });

  it("erkennt den eingeschlossenen Koerper", () => {
    expect(boundsOverlap(kasten(0, 10), kasten(2, 4, 2, 4, 2, 4))).toBe(true);
  });

  it("prueft alle drei Achsen", () => {
    expect(boundsOverlap(kasten(0, 10, 0, 10, 0, 10), kasten(0, 10, 20, 30, 0, 10))).toBe(false);
  });
});

describe("overlappingExportClusters", () => {
  it("laesst getrennte Koerper getrennt", () => {
    expect(overlappingExportClusters([kasten(0, 10), kasten(20, 30), kasten(40, 50)])).toEqual([[0], [1], [2]]);
  });

  it("fasst gestapelte Quader zusammen, die sich eine Flaeche teilen", () => {
    const unten = { minX: 0, maxX: 20, minY: 0, maxY: 10, minZ: 0, maxZ: 20 };
    const oben = { minX: 0, maxX: 20, minY: 10, maxY: 20, minZ: 0, maxZ: 20 };
    expect(overlappingExportClusters([unten, oben])).toEqual([[0, 1]]);
  });

  it("fasst zwei sich durchdringende zusammen", () => {
    expect(overlappingExportClusters([kasten(0, 10), kasten(5, 15), kasten(40, 50)])).toEqual([[0, 1], [2]]);
  });

  it("reicht die Zugehoerigkeit durch: A trifft B, B trifft C", () => {
    expect(overlappingExportClusters([kasten(0, 10), kasten(30, 40), kasten(8, 32)])).toEqual([[0, 1, 2]]);
  });

  it("behaelt die Reihenfolge der Eingabe", () => {
    expect(overlappingExportClusters([kasten(60, 70), kasten(0, 10), kasten(5, 15)])).toEqual([[0], [1, 2]]);
  });

  it("laesst eine Form ohne Punkte allein stehen", () => {
    expect(overlappingExportClusters([kasten(0, 10), null, kasten(5, 15)])).toEqual([[0, 2], [1]]);
  });

  it("kommt mit einer leeren Szene zurecht", () => {
    expect(overlappingExportClusters([])).toEqual([]);
  });
});

describe("exportColorGroups", () => {
  // Discussion #79: ein weisses Logo in einer schwarzen Platte darf in der 3MF
  // nicht mit der Platte verschmelzen.
  it("keeps colours apart and groups the same colour regardless of case", () => {
    expect(exportColorGroups(["#222222", "#FFFFFF", "#222222", "#ffffff", undefined, "#ff0000"])).toEqual([[0, 2], [1, 3], [4], [5]]);
  });

  it("returns one group when everything has one colour", () => {
    expect(exportColorGroups(["#D97813", "#d97813"])).toEqual([[0, 1]]);
  });
});
