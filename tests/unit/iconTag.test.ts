import { describe, expect, it } from "vitest";
import manifoldModule from "manifold-3d";
import {
  ICON_TAG_LAYERS,
  iconLayerElevations,
  iconLayerProfile,
  iconLayersOf,
  iconSourceProfile,
  iconTagFitCount,
  iconTagGrid,
  isIconLayerBody,
  normalizeIconTagCount,
  scaledIconProfile,
} from "@/lib/iconTag";
import { orderedCadSketchPaths } from "@/lib/sketchCadProfile";
import { filledGrowPockets } from "@/lib/sketchStroke";
import type { SketchPoint, SketchProfile, SketchSegment, WorkplaneShape } from "@/types/layerling";

/** Closed rectangles as one sketch, each its own outline. */
function rectangles(...boxes: Array<[number, number, number, number]>): SketchProfile {
  const points: SketchPoint[] = [];
  const segments: SketchSegment[] = [];
  boxes.forEach(([x0, z0, x1, z1], box) => {
    const corners = [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
    corners.forEach(([x, z], index) => points.push({ id: `p${box}-${index}`, x, z, mode: "corner" }));
    corners.forEach((_, index) => segments.push({ id: `s${box}-${index}`, startId: `p${box}-${index}`, endId: `p${box}-${(index + 1) % 4}`, kind: "line" }));
  });
  return { points, segments };
}

const square = rectangles([-10, -10, 10, 10]);

const body = (overrides: Partial<WorkplaneShape> & { sketchProfile: SketchProfile }): WorkplaneShape => ({
  id: "b", name: "Heart", kind: "mesh", color: "#ffffff", x: 12, z: -7, elevation: 0, rotation: 30,
  width: 20, depth: 20, height: 1.2, size: 20, sketchOperation: "extrude", ...overrides,
});

const closedOutlines = (profile: SketchProfile) => orderedCadSketchPaths(profile).filter((path) => path.closed).length;

describe("icon tag", () => {
  it("starts in the name tag's layers: icon, a 1.5 mm rim, a 3 mm plate 3 mm wider without holes", () => {
    expect(ICON_TAG_LAYERS.map((layer) => [layer.grow, layer.height, Boolean(layer.silhouette)])).toEqual([
      [0, 1.2, false],
      [1.5, 1.2, false],
      [3, 3, true],
    ]);
    expect(ICON_TAG_LAYERS.map((layer) => layer.color)).toEqual(["#ffffff", "#d41721", "#2b2b2b"]);
  });

  it("builds a layer as the icon's area with a Wider line and its silhouette, nothing else", () => {
    expect(iconLayerProfile(square, ICON_TAG_LAYERS[0]).stroke).toBeUndefined();
    const rim = iconLayerProfile(square, { grow: 1.5, height: 1.2, color: "#d41721", join: "bevel" });
    expect(rim.stroke).toEqual({ width: 1.5, align: "grow", join: "bevel", cap: "flat" });
    expect(rim.silhouette).toBeUndefined();
    expect(iconLayerProfile(square, ICON_TAG_LAYERS[2])).toMatchObject({ stroke: { width: 3, align: "grow", join: "round" }, silhouette: true });
    expect(iconLayerProfile(square, ICON_TAG_LAYERS[2]).points).toHaveLength(4);
  });

  it("reads the icon without a layer's Wider line or silhouette, but keeps a line that draws it", () => {
    expect(iconSourceProfile({ ...square, stroke: { width: 2, align: "grow", join: "round", cap: "flat" }, silhouette: true })).toEqual({ points: square.points, segments: square.segments });
    expect(iconSourceProfile({ ...square, stroke: { width: 0.8, align: "center", join: "miter", cap: "flat" } }).stroke).toEqual({ width: 0.8, align: "center", join: "miter", cap: "flat" });
  });

  it("reads a stack back from its layers, top to bottom, in any order", () => {
    const top = body({ id: "top", name: "Heart 1", elevation: 4.2, height: 1.2, sketchProfile: square });
    const rim = body({ id: "rim", name: "Heart 2", color: "#d41721", elevation: 3, height: 1.2, width: 23, depth: 23, sketchProfile: iconLayerProfile(square, { grow: 1.5, height: 1.2, color: "#d41721", join: "miter" }) });
    const plate = body({ id: "plate", name: "Heart 3", color: "#2b2b2b", elevation: 0, height: 3, width: 26, depth: 26, sketchProfile: iconLayerProfile(square, ICON_TAG_LAYERS[2]) });
    const stack = iconLayersOf([plate, top, rim]);
    expect(stack?.ids).toEqual(["top", "rim", "plate"]);
    expect(stack?.layers).toEqual([
      { grow: 0, height: 1.2, color: "#ffffff" },
      { grow: 1.5, height: 1.2, color: "#d41721", join: "miter" },
      { grow: 3, height: 3, color: "#2b2b2b", silhouette: true },
    ]);
    expect(stack?.width).toBe(20);
    expect(stack?.name).toBe("Heart");
    expect(stack?.place).toEqual({ x: 12, z: -7, elevation: 0, rotation: 30, rotationX: 0, rotationZ: 0 });
    expect(stack?.source).toEqual({ points: square.points, segments: square.segments });
  });

  it("takes one sketch body as a stack of itself, and refuses parts that are not one icon", () => {
    expect(iconLayersOf([body({ sketchProfile: square })])?.layers).toEqual([{ grow: 0, height: 1.2, color: "#ffffff" }]);
    const other = body({ id: "o", sketchProfile: rectangles([0, 0, 1, 1], [2, 2, 3, 3]) });
    expect(iconLayersOf([body({ sketchProfile: square }), other])).toBeNull();
    expect(iconLayersOf([body({ sketchProfile: square, sketchOperation: "revolve" })])).toBeNull();
    expect(isIconLayerBody(body({ sketchProfile: square, kind: "text" }))).toBe(false);
    expect(iconLayersOf([])).toBeNull();
  });

  it("stacks the layers bottom up on the place's elevation", () => {
    expect(iconLayerElevations(ICON_TAG_LAYERS, 0)).toEqual([4.2, 3, 0]);
    expect(iconLayerElevations(ICON_TAG_LAYERS, 2)).toEqual([6.2, 5, 2]);
  });

  it("scales the outline about its middle to the width asked for", () => {
    const scaled = scaledIconProfile(square, 1.5);
    expect(scaled.points.map((point) => [point.x, point.z])).toEqual([[-15, -15], [15, -15], [15, 15], [-15, 15]]);
    expect(scaledIconProfile(square, 1)).toBe(square);
  });

  it("counts how many tags fit on the plate side by side, 5 mm apart, at most 100", () => {
    // A 36 x 30 mm tag on the 256 x 256 mm plate of a Bambu Lab P2S: 6 across, 7 along.
    expect(iconTagFitCount({ width: 36, depth: 30 }, { width: 256, depth: 256 })).toBe(42);
    // Exactly as wide as the room still fits: 2 x 47.5 + 5 = 100.
    expect(iconTagFitCount({ width: 47.5, depth: 47.5 }, { width: 100, depth: 100 })).toBe(4);
    expect(iconTagFitCount({ width: 10, depth: 10 }, { width: 256, depth: 256 })).toBe(100);
    expect(iconTagFitCount({ width: 300, depth: 20 }, { width: 256, depth: 256 })).toBe(0);
  });

  it("lays the tags out in rows centred on the plate's middle, as many to a row as fit", () => {
    expect(iconTagGrid(3, { width: 20, depth: 10 }, { width: 100, depth: 100 })).toEqual([
      { x: -25, z: 0 }, { x: 0, z: 0 }, { x: 25, z: 0 },
    ]);
    expect(iconTagGrid(5, { width: 20, depth: 10 }, { width: 50, depth: 100 })).toEqual([
      { x: -12.5, z: -15 }, { x: 12.5, z: -15 },
      { x: -12.5, z: 0 }, { x: 12.5, z: 0 },
      { x: -12.5, z: 15 },
    ]);
    // Wider than the plate: one to a row all the same.
    expect(iconTagGrid(2, { width: 300, depth: 10 }, { width: 256, depth: 256 })).toEqual([{ x: 0, z: -7.5 }, { x: 0, z: 7.5 }]);
  });

  it("keeps a typed count whole, from 1 to 100", () => {
    expect([0, 1, 3.6, 100, 250, Number.NaN].map(normalizeIconTagCount)).toEqual([1, 1, 4, 100, 100, 1]);
  });
});

describe("No holes with a Wider line", () => {
  // Four bars round a square, 1 mm apart at the corners: 1.5 mm wider they close into a frame.
  const frame = rectangles([0, 0, 3, 20], [17, 0, 20, 20], [4, 0, 16, 3], [4, 17, 16, 20]);
  const wider = (silhouette: boolean): SketchProfile => ({ ...frame, stroke: { width: 1.5, align: "grow", join: "round", cap: "flat" }, ...(silhouette ? { silhouette: true } : {}) });

  it("fills a pocket that closes between parts once they are wider, and only then", async () => {
    const runtime = await manifoldModule();
    runtime.setup();
    // The frame's inside closes 1.5 mm wider: the polygon stroke keeps only its outer ring.
    expect(closedOutlines(filledGrowPockets(runtime, wider(true))!)).toBe(1);
    // No pocket closes round one square: the exact build of the line does it.
    expect(filledGrowPockets(runtime, { ...rectangles([0, 0, 20, 20]), stroke: { width: 1.5, align: "grow", join: "round", cap: "flat" }, silhouette: true })).toBeNull();
    // A line of another kind keeps its inner edge: that is the line, not a pocket.
    expect(filledGrowPockets(runtime, { ...rectangles([0, 0, 20, 20]), stroke: { width: 2, align: "inside", join: "miter", cap: "flat" }, silhouette: true })).toBeNull();
    expect(filledGrowPockets(runtime, frame)).toBeNull();
  });
});

describe("finding the icon tag", () => {
  it("is in the shape library right after the name tag, and its question mark opens its section", async () => {
    const { iconTagAsset, libraryShapeAssets, toolbarShapeAssets } = await import("@/lib/shapeCatalog");
    const { guideChapterForShape, guideHref, guideSectionForShape } = await import("@/lib/guideLinks");
    const ids = libraryShapeAssets.map((asset) => asset.id);
    expect(ids.indexOf("iconTag")).toBe(ids.indexOf("nameTag") + 1);
    expect(toolbarShapeAssets.some((asset) => asset.id === iconTagAsset.id)).toBe(false);
    const tag = { kind: "mesh" as const, groupedShapes: [{}], groupOperation: "bundle", layeredIcon: true };
    expect(guideHref("en", guideChapterForShape(tag), guideSectionForShape(tag))).toBe("/guide/text.html#icon-tags");
    expect(guideHref("de", guideChapterForShape(tag), guideSectionForShape(tag))).toBe("/anleitung/text.html#symbolschilder");
  });
});
