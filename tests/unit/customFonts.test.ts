import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { strFromU8, unzipSync } from "fflate";
import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import {
  checkedTypefaceData,
  contoursFromCommands,
  CustomFontError,
  customFontId,
  isCustomFontId,
  normalizeGlyphContours,
  typefaceFromFontFile,
  typefaceSubset,
} from "@/lib/customFonts";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { exportLylProject, importLylProject, type LylProjectDocumentV1 } from "@/lib/lylProject";
import { createTextGeometry } from "@/lib/textGeometry";
import { customFontEntry, customFontList, loadTextFonts, registerCustomFont, resetCustomFontsForTests, textFont, textFontLabel } from "@/lib/textFonts";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * Fonts of one's own for the text shape: a font file read into the typeface format, its outlines
 * turned the way three.js expects and overlaps merged, and a design that keeps only the letters
 * its texts use. The two font files are free ones that come with the packages: Noto Sans (OFL,
 * with Next.js) and kenpixel (CC0, with three.js).
 */

const modules = join(process.cwd(), "node_modules");
const notoPath = join(modules, "next/dist/compiled/@vercel/og/noto-sans-v27-latin-regular.ttf");
const pixelPath = join(modules, "three/examples/fonts/ttf/kenpixel.ttf");
const fileBytes = (path: string) => {
  const buffer = readFileSync(path);
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
};

let runtime: ManifoldToplevel;

beforeAll(async () => {
  runtime = await manifoldModule();
  runtime.setup();
  await loadTextFonts();
});

beforeEach(() => resetCustomFontsForTests());

function signedArea(points: Array<{ x: number; y: number }>) {
  return points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0) / 2;
}

const square = (x: number, y: number, size: number, clockwise: boolean) => {
  const corners = [[x, y], [x + size, y], [x + size, y + size], [x, y + size]];
  const ordered = clockwise ? [...corners].reverse() : corners;
  return [
    { type: "M", x: ordered[0][0], y: ordered[0][1] },
    ...ordered.slice(1).map(([px, py]) => ({ type: "L", x: px, y: py })),
    { type: "Z" },
  ];
};

describe("fonts of one's own", () => {
  it("reads a TrueType file into a typeface: its name, its letters, a stable id", async () => {
    const typeface = await typefaceFromFontFile(fileBytes(notoPath), "noto.ttf", runtime);
    expect(typeface.name).toMatch(/Noto Sans/);
    expect(isCustomFontId(typeface.id)).toBe(true);
    expect((await typefaceFromFontFile(fileBytes(notoPath), "again.ttf", runtime)).id).toBe(typeface.id);
    const glyphs = typeface.data.glyphs as Record<string, { o: string; ha: number }>;
    for (const character of "AaOoäÄß€0") expect(glyphs[character]?.o.length, character).toBeGreaterThan(0);
    // The three.js loader takes it, and an "o" comes out as one ring with its hole.
    const font = new FontLoader().parse(typeface.data);
    const shapes = font.generateShapes("o", 10);
    expect(shapes).toHaveLength(1);
    expect(shapes[0].holes).toHaveLength(1);
    const ring = font.generateShapes("B", 10);
    expect(ring).toHaveLength(1);
    expect(ring[0].holes).toHaveLength(2);
  });

  it("gives the same id over http, where the browser has no crypto.subtle", async () => {
    const bytes = fileBytes(pixelPath);
    const secure = await customFontId(bytes);
    const subtle = globalThis.crypto.subtle;
    Object.defineProperty(globalThis.crypto, "subtle", { value: undefined, configurable: true });
    try {
      expect(await customFontId(bytes)).toBe(secure);
    } finally {
      Object.defineProperty(globalThis.crypto, "subtle", { value: subtle, configurable: true });
    }
  });

  it("turns PostScript-style outlines (outer counter-clockwise) the way three.js wants them", () => {
    // An outer square drawn counter-clockwise with a clockwise hole, as CFF fonts draw them.
    const contours = normalizeGlyphContours(contoursFromCommands([...square(0, 0, 100, false), ...square(30, 30, 40, true)]));
    const areas = contours.map((contour) => signedArea([contour.start, ...contour.segments.map((segment) => ({ x: segment.x, y: segment.y }))]));
    expect(areas[0]).toBeLessThan(0);
    expect(areas[1]).toBeGreaterThan(0);
    // Curves turn with them: a quadratic contour reversed keeps its control point.
    const curve = contoursFromCommands([{ type: "M", x: 0, y: 0 }, { type: "Q", x1: 50, y1: 100, x: 100, y: 0 }, { type: "Z" }]);
    const turned = normalizeGlyphContours(curve);
    expect(turned[0].segments.some((segment) => segment.type === "Q" && segment.x1 === 50 && segment.y1 === 100)).toBe(true);
  });

  it("merges contours that overlap into one outline, as a variable or script font draws strokes", () => {
    const overlapping = contoursFromCommands([...square(0, 0, 100, true), ...square(50, 0, 100, true)]);
    const merged = normalizeGlyphContours(overlapping, runtime);
    expect(merged).toHaveLength(1);
    const points = [merged[0].start, ...merged[0].segments.map((segment) => ({ x: segment.x, y: segment.y }))];
    expect(signedArea(points)).toBeCloseTo(-150 * 100, 6);
    // One contour crossing itself, a figure of eight as an ampersand in a variable font draws it:
    // both loops stay solid, turned the same way.
    const eight = normalizeGlyphContours(contoursFromCommands([
      { type: "M", x: 0, y: 0 }, { type: "L", x: 100, y: 100 }, { type: "L", x: 100, y: 0 }, { type: "L", x: 0, y: 100 }, { type: "Z" },
    ]), runtime);
    expect(eight).toHaveLength(2);
    eight.forEach((contour) => expect(signedArea([contour.start, ...contour.segments.map((segment) => ({ x: segment.x, y: segment.y }))])).toBeLessThan(0));
    // Without an overlap nothing is merged, and curves stay curves.
    const apart = normalizeGlyphContours(contoursFromCommands([...square(0, 0, 100, true), ...square(200, 0, 100, true)]), runtime);
    expect(apart).toHaveLength(2);
  });

  it("refuses WOFF2 and font collections with a reason, and a file that is no font", async () => {
    const withSignature = (signature: string) => new TextEncoder().encode(signature + "\u0000".repeat(60)).buffer as ArrayBuffer;
    await expect(typefaceFromFontFile(withSignature("wOF2"), "a.woff2")).rejects.toThrow(CustomFontError);
    await expect(typefaceFromFontFile(withSignature("wOF2"), "a.woff2")).rejects.toThrow("font-woff2");
    await expect(typefaceFromFontFile(withSignature("ttcf"), "a.ttc")).rejects.toThrow("font-collection");
    await expect(typefaceFromFontFile(withSignature("nope"), "a.ttf")).rejects.toThrow("font-unreadable");
  });

  it("draws a text in its own font, and the letters it lacks from Sans", async () => {
    const typeface = await typefaceFromFontFile(fileBytes(pixelPath), "kenpixel.ttf", runtime);
    registerCustomFont(typeface, true);
    expect(textFontLabel(typeface.id)).toBe(typeface.name);
    expect(textFontLabel("custom:0123456789abcdef")).toBeNull();
    const shape = { id: "t", name: "Text", kind: "text", color: "#000", x: 0, z: 0, size: 40, width: 40, depth: 10, height: 3, rotation: 0, text: "Hi €", font: typeface.id } as WorkplaneShape;
    const geometry = createTextGeometry(shape);
    expect(geometry.getAttribute("position").count).toBeGreaterThan(0);
    // An unknown font draws in Multilanguage rather than failing.
    expect(textFont("custom:0123456789abcdef")).toBe(textFont("Multilanguage"));
  });

  it("keeps only the letters a design uses, and brings the font back when the design opens", async () => {
    const typeface = await typefaceFromFontFile(fileBytes(notoPath), "noto.ttf", runtime);
    registerCustomFont(typeface, true);
    const text = (id: string, value: string): WorkplaneShape => ({ id, name: "Text", kind: "text", color: "#000", x: 0, z: 0, size: 40, width: 40, depth: 10, height: 3, rotation: 0, text: value, font: typeface.id } as WorkplaneShape);
    const first = [text("a", "Abc")];
    const second = [text("a", "Abc"), text("b", "Zug")];
    const bytes = await exportLylProject({
      projectName: "Fonts",
      createdAt: 1_700_000_000_000,
      modifiedAt: 1_700_000_100_000,
      shapes: second,
      history: [editorHistoryEntry(first, []), editorHistoryEntry(second, [])],
      historyIndex: 1,
      assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE,
      snapGrid: DEFAULT_SNAP_GRID,
      placementElevation: 0,
    });
    const document = JSON.parse(strFromU8(unzipSync(bytes)["project.json"])) as LylProjectDocumentV1;
    expect(document.fonts).toHaveLength(1);
    const kept = Object.keys((document.fonts![0].typeface as { glyphs: object }).glyphs).sort();
    // Every letter of every state, the space, and nothing else - not the whole font.
    expect(kept).toEqual([" ", "A", "Z", "b", "c", "g", "u"]);
    expect(document.fonts![0].name).toBe(typeface.name);

    resetCustomFontsForTests();
    expect(customFontList()).toHaveLength(0);
    const restored = await importLylProject(bytes);
    expect(restored.shapes.map((shape) => shape.font)).toEqual([typeface.id, typeface.id]);
    const entry = customFontEntry(typeface.id);
    expect(entry?.complete).toBe(false);
    expect(Object.keys(entry!.data.glyphs as object).sort()).toEqual(kept);
    // The full font, added later in this browser, takes over from the design's letters.
    registerCustomFont(typeface, true);
    expect(customFontEntry(typeface.id)?.complete).toBe(true);
    registerCustomFont({ ...typeface, data: typefaceSubset(typeface.data, ["A"]) }, false);
    expect(customFontEntry(typeface.id)?.complete).toBe(true);
  });

  it("refuses a design whose font outline holds anything but outline commands", () => {
    const good = { resolution: 1000, boundingBox: { xMin: 0, yMin: 0, xMax: 1, yMax: 1 }, underlineThickness: 50, glyphs: { A: { ha: 600, x_min: 0, x_max: 500, o: "m 0 0 l 10 0 l 10 10" } } };
    expect(() => checkedTypefaceData(good, "font")).not.toThrow();
    expect(() => checkedTypefaceData({ ...good, glyphs: { A: { ha: 600, o: "m 0 0 <script>" } } }, "font")).toThrow();
    expect(() => checkedTypefaceData({ ...good, glyphs: { AB: { ha: 600, o: "" } } }, "font")).toThrow();
    expect(() => checkedTypefaceData({ ...good, resolution: -1 }, "font")).toThrow();
  });
});

// Keeps the THREE import from being dropped as unused when the loader is tree-shaken in tests.
void THREE;
