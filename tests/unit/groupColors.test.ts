import { describe, expect, it } from "vitest";
import { canToggleGroupColors, groupShowsPartColors } from "@/lib/groupColors";
import type { WorkplaneShape } from "@/types/layerling";

function shape(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "shape",
    name: "Shape",
    kind: "box",
    color: "#ff5a47",
    x: 0,
    z: 0,
    elevation: 0,
    size: 20,
    width: 20,
    depth: 20,
    height: 20,
    rotation: 0,
    locked: false,
    hidden: false,
    ...overrides,
  };
}

const parts = [shape({ id: "a" }), shape({ id: "b", color: "#2f7fd8" })];
const cutMesh: WorkplaneShape["importedMesh"] = {
  positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
  baseWidth: 1,
  baseDepth: 1,
  baseHeight: 1,
  triangleCount: 1,
  sourceFormat: "json",
};

describe("groupShowsPartColors", () => {
  it("is off for a plain shape", () => {
    expect(groupShowsPartColors(shape())).toBe(false);
  });

  it("keeps what a group showed before the switch existed", () => {
    expect(groupShowsPartColors(shape({ kind: "mesh", groupedShapes: parts }))).toBe(true);
    expect(groupShowsPartColors(shape({ kind: "mesh", groupedShapes: parts, importedMesh: cutMesh }))).toBe(false);
  });

  it("follows the switch once it is set", () => {
    expect(groupShowsPartColors(shape({ kind: "mesh", groupedShapes: parts, multicolor: false }))).toBe(false);
    expect(groupShowsPartColors(shape({ kind: "mesh", groupedShapes: parts, importedMesh: cutMesh, multicolor: true }))).toBe(true);
  });

  it("always shows a bundle in its parts' colours", () => {
    expect(groupShowsPartColors(shape({ kind: "mesh", groupedShapes: parts, groupOperation: "bundle", multicolor: false }))).toBe(true);
  });
});

describe("canToggleGroupColors", () => {
  it("offers the switch on groups only, not on bundles or holes", () => {
    expect(canToggleGroupColors(shape())).toBe(false);
    expect(canToggleGroupColors(shape({ kind: "mesh", groupedShapes: parts }))).toBe(true);
    expect(canToggleGroupColors(shape({ kind: "mesh", groupedShapes: parts, groupOperation: "bundle" }))).toBe(false);
    expect(canToggleGroupColors(shape({ kind: "mesh", groupedShapes: parts, hole: true }))).toBe(false);
  });
});
