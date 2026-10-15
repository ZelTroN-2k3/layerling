import { describe, expect, it } from "vitest";
import { copySketchSelection, freeSketchPasteOffset, pasteSketchClipboard } from "@/lib/sketchClipboard";
import type { SketchProfile } from "@/types/layerling";

const square = (prefix: string, x: number, z: number, size: number): SketchProfile => ({
  points: [
    { id: `${prefix}a`, x, z, handleOut: { x: x + 1, z } },
    { id: `${prefix}b`, x: x + size, z },
    { id: `${prefix}c`, x: x + size, z: z + size },
    { id: `${prefix}d`, x, z: z + size },
  ],
  segments: [
    { id: `${prefix}ab`, startId: `${prefix}a`, endId: `${prefix}b` },
    { id: `${prefix}bc`, startId: `${prefix}b`, endId: `${prefix}c` },
    { id: `${prefix}cd`, startId: `${prefix}c`, endId: `${prefix}d` },
    { id: `${prefix}da`, startId: `${prefix}d`, endId: `${prefix}a` },
  ],
});

const image = { id: "img", name: "ref", dataUrl: "data:", mimeType: "image/png", pixelWidth: 1, pixelHeight: 1, x: 0, z: 0, width: 4, depth: 4, locked: true };

function idFactory() {
  let next = 0;
  return (prefix: string) => `${prefix}-${(next += 1)}`;
}

describe("sketch clipboard", () => {
  it("copies a selected line together with its end points", () => {
    const copied = copySketchSelection(square("", 0, 0, 4), { kind: "segment", id: "ab" });
    expect(copied?.points.map((point) => point.id)).toEqual(["a", "b"]);
    expect(copied?.segments.map((segment) => segment.id)).toEqual(["ab"]);
  });

  it("only takes lines whose ends are both copied", () => {
    const copied = copySketchSelection(square("", 0, 0, 4), { kind: "multiple", pointIds: ["a", "b", "c"], segmentIds: [] });
    expect(copied?.segments.map((segment) => segment.id)).toEqual(["ab", "bc"]);
  });

  it("returns nothing for an empty selection", () => {
    expect(copySketchSelection(square("", 0, 0, 4), null)).toBeNull();
    expect(copySketchSelection(square("", 0, 0, 4), { kind: "multiple", pointIds: [], segmentIds: [] })).toBeNull();
  });

  it("pastes moved copies with fresh ids and unlocked images", () => {
    const profile = { ...square("", 0, 0, 4), images: [image] };
    const copied = copySketchSelection(profile, { kind: "multiple", pointIds: ["a", "b", "c", "d"], segmentIds: ["ab", "bc", "cd", "da"], imageIds: ["img"] })!;
    const pasted = pasteSketchClipboard(profile, copied, { x: 10, z: 10 }, idFactory());

    expect(pasted.profile.points).toHaveLength(8);
    expect(pasted.profile.segments).toHaveLength(8);
    expect(pasted.pointIds).toHaveLength(4);
    expect(pasted.segmentIds).toHaveLength(4);
    const first = pasted.profile.points.find((point) => point.id === pasted.pointIds[0])!;
    expect(first).toMatchObject({ x: 10, z: 10, handleOut: { x: 11, z: 10 } });
    const pastedImage = pasted.profile.images?.find((entry) => entry.id === pasted.imageIds[0]);
    expect(pastedImage).toMatchObject({ x: 10, z: 10, locked: false });
    // The copies reference their own points, never the originals.
    const pastedPointIds = new Set(pasted.pointIds);
    pasted.segmentIds.forEach((id) => {
      const segment = pasted.profile.segments.find((entry) => entry.id === id)!;
      expect(pastedPointIds.has(segment.startId) && pastedPointIds.has(segment.endId)).toBe(true);
    });
  });

  it("selects every piece of a pasted line that got split at a crossing", () => {
    const profile = square("", 0, 0, 20);
    const copied = copySketchSelection(profile, { kind: "multiple", pointIds: ["a", "b", "c", "d"], segmentIds: ["ab", "bc", "cd", "da"] })!;
    const pasted = pasteSketchClipboard(profile, copied, { x: 10, z: 10 }, idFactory());

    // Two crossings, each splitting one original and one pasted line.
    expect(pasted.profile.points).toHaveLength(10);
    expect(pasted.pointIds).toHaveLength(6);
    expect(pasted.segmentIds).toHaveLength(6);
    const originalIds = new Set(["ab", "bc", "cd", "da"]);
    const pastedSegments = pasted.profile.segments.filter((segment) => pasted.segmentIds.includes(segment.id));
    expect(pastedSegments.some((segment) => originalIds.has(segment.id))).toBe(false);
    pastedSegments.forEach((segment) => {
      const start = pasted.profile.points.find((point) => point.id === segment.startId)!;
      const end = pasted.profile.points.find((point) => point.id === segment.endId)!;
      // Every pasted piece runs along the moved square's outline.
      expect(start.x === 10 || start.x === 30 || start.z === 10 || start.z === 30).toBe(true);
      expect(end.x === 10 || end.x === 30 || end.z === 10 || end.z === 30).toBe(true);
    });
  });

  describe("paste placement", () => {
    const whole = (prefix = "") => ({ kind: "multiple" as const, pointIds: ["a", "b", "c", "d"].map((id) => prefix + id), segmentIds: ["ab", "bc", "cd", "da"].map((id) => prefix + id) });
    const plate = { minX: -100, maxX: 100, minZ: -100, maxZ: 100 };

    it("puts the copy right of its source, a gap away, without joining it", () => {
      const profile = square("", 0, 0, 20);
      const copied = copySketchSelection(profile, whole())!;
      const offset = freeSketchPasteOffset(profile, copied, plate);
      expect(offset).toEqual({ x: 30, z: 0 });
      const pasted = pasteSketchClipboard(profile, copied, offset, idFactory());
      expect(pasted.profile.points).toHaveLength(8);
      expect(pasted.profile.segments).toHaveLength(8);
    });

    it("rounds the step up to the gap so the copy stays on the grid", () => {
      const profile = square("", 0, 0, 13);
      expect(freeSketchPasteOffset(profile, copySketchSelection(profile, whole())!, plate)).toEqual({ x: 30, z: 0 });
    });

    it("goes below when the spot on the right is taken", () => {
      const profile = square("", 0, 0, 20);
      // Crosses the left edge the copy would have on the right.
      const blocker = square("o", 25, 5, 10);
      const both = { points: [...profile.points, ...blocker.points], segments: [...profile.segments, ...blocker.segments] };
      expect(freeSketchPasteOffset(both, copySketchSelection(profile, whole())!, plate)).toEqual({ x: 0, z: 30 });
    });

    it("keeps repeated pastes apart from each other", () => {
      let profile = square("", 0, 0, 20);
      const copied = copySketchSelection(profile, whole())!;
      const createId = idFactory();
      const offsets = [0, 1, 2].map(() => {
        const offset = freeSketchPasteOffset(profile, copied, plate);
        profile = pasteSketchClipboard(profile, copied, offset, createId).profile;
        return offset;
      });
      expect(new Set(offsets.map((offset) => `${offset.x},${offset.z}`)).size).toBe(3);
      expect(profile.points).toHaveLength(16);
    });

    it("stays on the sketch plate", () => {
      const profile = square("", 80, 80, 20);
      const offset = freeSketchPasteOffset(profile, copySketchSelection(profile, whole())!, plate);
      expect(offset).toEqual({ x: -30, z: 0 });
    });
  });
});
