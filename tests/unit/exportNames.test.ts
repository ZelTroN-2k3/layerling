import { describe, expect, it } from "vitest";
import { projectExportFileName, stlNameAsksForNewFile } from "@/lib/exportNames";

describe("project export filenames", () => {
  it("uses the project name for each supported export format", () => {
    expect(projectExportFileName("Gearbox Prototype", "stl")).toBe("Gearbox Prototype.stl");
    expect(projectExportFileName("Gearbox Prototype", "obj")).toBe("Gearbox Prototype.obj");
    expect(projectExportFileName("Gearbox Prototype", "step")).toBe("Gearbox Prototype.step");
    expect(projectExportFileName("Gearbox Prototype", "svg")).toBe("Gearbox Prototype.svg");
    expect(projectExportFileName("Gearbox Prototype", "lyl")).toBe("Gearbox Prototype.lyl");
  });

  it("removes filesystem-reserved characters without discarding the project name", () => {
    expect(projectExportFileName('  enclosure: v2 / final?  ', "stl")).toBe("enclosure- v2 - final-.stl");
  });

  it("falls back to a useful name when the project name cannot be used", () => {
    expect(projectExportFileName("...", "obj")).toBe("layerling design.obj");
  });
});

describe("a name typed for an STL that is linked to a file already", () => {
  const project = "Gearbox";

  it("never asks while there is no linked file", () => {
    expect(stlNameAsksForNewFile("Liner", project, null)).toBe(false);
    expect(stlNameAsksForNewFile("Liner", project, undefined)).toBe(false);
  });

  it("keeps writing into the link while the window shows the name it started with", () => {
    expect(stlNameAsksForNewFile("Gearbox", project, "model.stl")).toBe(false);
    expect(stlNameAsksForNewFile("  Gearbox ", project, "model.stl")).toBe(false);
  });

  it("asks for a new file when another name is typed", () => {
    // The model and then its liner, one after the other: the second must not land in the file of the first.
    expect(stlNameAsksForNewFile("Liner", project, "Model.stl")).toBe(true);
  });

  it("keeps writing into the link when the name typed is the linked file's own, with or without .stl", () => {
    expect(stlNameAsksForNewFile("model", project, "Model.stl")).toBe(false);
    expect(stlNameAsksForNewFile("Model.STL", project, "Model.stl")).toBe(false);
  });
});
