import { describe, expect, it } from "vitest";
import { packBackup, unpackBackup, zipHoldsDesigns } from "@/lib/projectBackup";
import { BUG_REPORT_FILE } from "@/lib/bugReport";

describe("the bug report as a ZIP (#234)", () => {
  const design = new TextEncoder().encode("not a real design, only bytes");
  const zip = packBackup([
    { name: "My design.lyl", bytes: design },
    { name: BUG_REPORT_FILE, bytes: new TextEncoder().encode("layerling bug report") },
  ]);

  it("is a ZIP the start page takes for a backup, as it holds a design", () => {
    expect(zipHoldsDesigns(zip)).toBe(true);
  });

  it("brings back the design and leaves the text out", () => {
    const entries = unpackBackup(zip);
    expect(entries.map((entry) => entry.name)).toEqual(["My design.lyl"]);
    expect(new TextDecoder().decode(entries[0].bytes)).toBe("not a real design, only bytes");
  });
});
