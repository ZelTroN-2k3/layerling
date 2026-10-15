import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { backupEntryNames, backupFileName, packBackup, unpackBackup } from "@/lib/projectBackup";

describe("backing up all designs", () => {
  it("names the backup after the day", () => {
    expect(backupFileName(new Date(2026, 8, 28, 23, 59))).toBe("layerling-backup-2026-09-28.zip");
  });

  it("gives every design a safe, unique file name", () => {
    expect(backupEntryNames(["Halter", "Halter", "halter", "a/b: c?", "  ", "..versteckt"], "Entwurf")).toEqual([
      "Halter.lyl",
      "Halter (2).lyl",
      "halter (3).lyl",
      "a-b- c-.lyl",
      "Entwurf.lyl",
      "versteckt.lyl",
    ]);
  });

  it("brings back exactly what was packed", () => {
    const entries = [
      { name: "Eins.lyl", bytes: new Uint8Array([1, 2, 3]) },
      { name: "Zwei.lyl", bytes: new Uint8Array([4, 5]) },
    ];
    const restored = unpackBackup(packBackup(entries));
    expect(restored.map((entry) => entry.name)).toEqual(["Eins.lyl", "Zwei.lyl"]);
    expect([...restored[0].bytes]).toEqual([1, 2, 3]);
    expect([...restored[1].bytes]).toEqual([4, 5]);
  });

  it("reads designs from folders and ignores other files", () => {
    const zip = zipSync({ "Ordner/Alt.skf": new Uint8Array([9]), "liesmich.txt": strToU8("hallo") });
    expect(unpackBackup(zip).map((entry) => entry.name)).toEqual(["Alt.skf"]);
  });
});
