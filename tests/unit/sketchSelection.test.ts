import { describe, expect, it } from "vitest";
import { sketchSelectedPointIds, sketchSelectedSegmentIds, sketchSelectionCount, toggleSketchSelection } from "@/lib/sketchSelection";

describe("toggleSketchSelection (Shift+click in the sketch)", () => {
  it("selects a point or line when nothing is selected", () => {
    expect(toggleSketchSelection(null, { kind: "point", id: "a" })).toEqual({ kind: "point", id: "a" });
    expect(toggleSketchSelection(null, { kind: "segment", id: "ab" })).toEqual({ kind: "segment", id: "ab" });
  });

  it("adds a second point to a single point", () => {
    expect(toggleSketchSelection({ kind: "point", id: "a" }, { kind: "point", id: "b" })).toEqual({
      kind: "multiple",
      pointIds: ["a", "b"],
      segmentIds: [],
      imageIds: [],
    });
  });

  it("mixes points and lines", () => {
    const withLine = toggleSketchSelection({ kind: "point", id: "a" }, { kind: "segment", id: "bc" });
    expect(withLine).toEqual({ kind: "multiple", pointIds: ["a"], segmentIds: ["bc"], imageIds: [] });
    expect(toggleSketchSelection(withLine, { kind: "segment", id: "cd" })).toEqual({
      kind: "multiple",
      pointIds: ["a"],
      segmentIds: ["bc", "cd"],
      imageIds: [],
    });
  });

  it("takes an already selected entry out again", () => {
    const selected = { kind: "multiple" as const, pointIds: ["a", "b"], segmentIds: ["ab", "bc"] };
    expect(toggleSketchSelection(selected, { kind: "segment", id: "ab" })).toEqual({
      kind: "multiple",
      pointIds: ["a", "b"],
      segmentIds: ["bc"],
      imageIds: [],
    });
    expect(toggleSketchSelection(selected, { kind: "point", id: "b" })).toEqual({
      kind: "multiple",
      pointIds: ["a"],
      segmentIds: ["ab", "bc"],
      imageIds: [],
    });
  });

  it("falls back to the single kind when one entry is left", () => {
    const twoPoints = { kind: "multiple" as const, pointIds: ["a", "b"], segmentIds: [] };
    expect(toggleSketchSelection(twoPoints, { kind: "point", id: "a" })).toEqual({ kind: "point", id: "b" });
    const pointAndLine = { kind: "multiple" as const, pointIds: ["a"], segmentIds: ["bc"] };
    expect(toggleSketchSelection(pointAndLine, { kind: "point", id: "a" })).toEqual({ kind: "segment", id: "bc" });
  });

  it("clears the selection when the last entry is taken out", () => {
    expect(toggleSketchSelection({ kind: "point", id: "a" }, { kind: "point", id: "a" })).toBeNull();
    expect(toggleSketchSelection({ kind: "segment", id: "ab" }, { kind: "segment", id: "ab" })).toBeNull();
  });

  it("keeps a selected image and the entries a frame selected", () => {
    expect(toggleSketchSelection({ kind: "image", id: "img" }, { kind: "point", id: "a" })).toEqual({
      kind: "multiple",
      pointIds: ["a"],
      segmentIds: [],
      imageIds: ["img"],
    });
    const framed = { kind: "multiple" as const, pointIds: ["a"], segmentIds: [], imageIds: ["img"] };
    expect(toggleSketchSelection(framed, { kind: "point", id: "a" })).toEqual({ kind: "image", id: "img" });
  });

  it("treats a point and a line with the same id as different entries", () => {
    expect(toggleSketchSelection({ kind: "point", id: "x" }, { kind: "segment", id: "x" })).toEqual({
      kind: "multiple",
      pointIds: ["x"],
      segmentIds: ["x"],
      imageIds: [],
    });
  });

  it("does not change the selection it was given", () => {
    const selected = { kind: "multiple" as const, pointIds: ["a", "b"], segmentIds: ["ab"] };
    toggleSketchSelection(selected, { kind: "point", id: "a" });
    toggleSketchSelection(selected, { kind: "segment", id: "cd" });
    expect(selected).toEqual({ kind: "multiple", pointIds: ["a", "b"], segmentIds: ["ab"] });
  });
});

describe("sketchSelectionCount", () => {
  it("counts every selected point, line and image", () => {
    expect(sketchSelectionCount(null)).toBe(0);
    expect(sketchSelectionCount({ kind: "point", id: "a" })).toBe(1);
    expect(sketchSelectionCount({ kind: "multiple", pointIds: ["a", "b"], segmentIds: ["ab"], imageIds: ["img"] })).toBe(4);
    expect(sketchSelectionCount({ kind: "multiple", pointIds: ["a"], segmentIds: [] })).toBe(1);
  });
});

describe("the corners and lines of a selection (#283)", () => {
  const frame = { kind: "multiple", pointIds: ["a", "b", "c"], segmentIds: ["ab", "bc"] } as const;

  it("takes the points of a selection that holds lines as well", () => {
    expect(sketchSelectedPointIds(frame)).toEqual(["a", "b", "c"]);
    expect(sketchSelectedPointIds({ kind: "point", id: "a" })).toEqual(["a"]);
    expect(sketchSelectedPointIds({ kind: "multiple", pointIds: ["a", "b"], segmentIds: [] })).toEqual(["a", "b"]);
  });

  it("takes the lines of a selection that holds points as well", () => {
    expect(sketchSelectedSegmentIds(frame)).toEqual(["ab", "bc"]);
    expect(sketchSelectedSegmentIds({ kind: "segment", id: "ab" })).toEqual(["ab"]);
  });

  it("finds nothing in a selection of the wrong kind", () => {
    expect(sketchSelectedPointIds(null)).toEqual([]);
    expect(sketchSelectedPointIds({ kind: "segment", id: "ab" })).toEqual([]);
    expect(sketchSelectedSegmentIds({ kind: "point", id: "a" })).toEqual([]);
    expect(sketchSelectedSegmentIds(null)).toEqual([]);
  });

  it("leaves out a selection that holds a picture", () => {
    expect(sketchSelectedPointIds({ kind: "multiple", pointIds: ["a", "b"], segmentIds: [], imageIds: ["img"] })).toEqual([]);
    expect(sketchSelectedSegmentIds({ kind: "multiple", pointIds: [], segmentIds: ["ab", "bc"], imageIds: ["img"] })).toEqual([]);
  });
});
