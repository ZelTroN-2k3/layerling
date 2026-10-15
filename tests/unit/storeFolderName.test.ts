import { describe, expect, it } from "vitest";
import { storeFolderNameProblem, suggestStoreFolderName } from "@/lib/storeFolderName";

const existing = ["Halter", "Ersatzteile"];

describe("storeFolderNameProblem", () => {
  it("accepts an ordinary name", () => {
    expect(storeFolderNameProblem("Klemmen", existing)).toBeNull();
    expect(storeFolderNameProblem("  Klemmen  ", existing)).toBeNull();
  });

  it("refuses nothing at all", () => {
    expect(storeFolderNameProblem("", existing)).toBe("empty");
    expect(storeFolderNameProblem("   ", existing)).toBe("empty");
    expect(storeFolderNameProblem(".", existing)).toBe("empty");
    expect(storeFolderNameProblem("..", existing)).toBe("empty");
  });

  it("refuses a leading dot, which would hide the folder", () => {
    expect(storeFolderNameProblem(".versteckt", existing)).toBe("start");
  });

  it("refuses the characters a path is built from", () => {
    // The same set store.php rejects - a name that needs repairing is not one
    // we would have written.
    for (const character of ["<", ">", ":", "\"", "|", "?", "*", "/", "\\"]) {
      expect(storeFolderNameProblem(`Halt${character}er`, existing)).toBe("chars");
    }
    expect(storeFolderNameProblem("Halter\u0007", existing)).toBe("chars");
    expect(storeFolderNameProblem("x".repeat(81), existing)).toBe("chars");
  });

  it("refuses a name that is already there, whatever its case", () => {
    expect(storeFolderNameProblem("Halter", existing)).toBe("taken");
    expect(storeFolderNameProblem("halter", existing)).toBe("taken");
  });
});

describe("suggestStoreFolderName", () => {
  it("offers the plain name while it is free", () => {
    expect(suggestStoreFolderName("Neuer Ordner", existing)).toBe("Neuer Ordner");
  });

  it("counts up past the names that are taken", () => {
    expect(suggestStoreFolderName("Halter", existing)).toBe("Halter 2");
    expect(suggestStoreFolderName("Halter", ["Halter", "Halter 2", "halter 3"])).toBe("Halter 4");
  });
});
