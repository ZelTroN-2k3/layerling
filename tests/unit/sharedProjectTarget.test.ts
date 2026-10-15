import { describe, expect, it } from "vitest";
import { sharedProjectSaveTarget } from "@/lib/sharedProjectTarget";

const binding = { fileName: "Beispielteil.lyl", revision: "6dd-abc" };

describe("sharedProjectSaveTarget", () => {
  it("writes back to the file the project came from when the caller names it", () => {
    // The regression: the automatic save passes a file name, and a file name
    // never equals a project name. Deciding by comparing the two made every
    // automatic save look like a new project, and the server refused them all.
    expect(sharedProjectSaveTarget({
      projectName: "Beispielteil",
      exportName: "Beispielteil",
      binding,
      targetFileName: "Beispielteil.lyl",
    })).toEqual({ fileName: "Beispielteil.lyl", saveBackToSource: true });
  });

  it("still writes back after the project was renamed locally", () => {
    expect(sharedProjectSaveTarget({
      projectName: "Halter v2",
      exportName: "Halter v2",
      binding,
      targetFileName: "Beispielteil.lyl",
    })).toEqual({ fileName: "Beispielteil.lyl", saveBackToSource: true });
  });

  it("makes a new file when the manual save uses a different name", () => {
    expect(sharedProjectSaveTarget({
      projectName: "Beispielteil",
      exportName: "Beispielteil Kopie",
      binding,
    })).toEqual({ fileName: "Beispielteil Kopie.lyl", saveBackToSource: false });
  });

  it("writes back when a manual save keeps the project name", () => {
    expect(sharedProjectSaveTarget({
      projectName: "Beispielteil",
      exportName: "Beispielteil",
      binding,
    })).toEqual({ fileName: "Beispielteil.lyl", saveBackToSource: true });
  });

  it("never writes back for a project that is not bound to the server", () => {
    expect(sharedProjectSaveTarget({
      projectName: "Beispielteil",
      exportName: "Beispielteil",
      binding: undefined,
      targetFileName: "Beispielteil.lyl",
    })).toEqual({ fileName: "Beispielteil.lyl", saveBackToSource: false });
  });

  it("falls back to the project name and always lands on .lyl", () => {
    expect(sharedProjectSaveTarget({
      projectName: "Beispielteil",
      exportName: "   ",
      binding: undefined,
    })).toEqual({ fileName: "Beispielteil.lyl", saveBackToSource: false });
    expect(sharedProjectSaveTarget({
      projectName: "Alt",
      exportName: "Alt.skf",
      binding: undefined,
    })).toEqual({ fileName: "Alt.lyl", saveBackToSource: false });
  });
});
