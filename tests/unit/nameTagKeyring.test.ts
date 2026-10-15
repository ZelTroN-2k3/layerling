import manifoldModule, { type CrossSection, type ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
// @ts-expect-error - the bridge is plain JavaScript without types.
import { tools } from "../../scripts/layerling-mcp-tools.mjs";
import { editorHistoryEntry } from "@/lib/editorHistory";
import { rememberManifoldRuntime } from "@/lib/manifoldHandle";
import { exportLylProject, importLylProject, type LylProjectDocumentV1, type LylProjectExportInput } from "@/lib/lylProject";
import { NAME_TAG_LAYERS, textLetterSizePatch } from "@/lib/nameTag";
import { textFillComponents, textHasFill } from "@/lib/textFill";
import { loadTextFonts } from "@/lib/textFonts";
import { textGlyphShapes } from "@/lib/textGeometry";
import { DEFAULT_TEXT_LAYERS, layerTextKeyringArgument, layerTextLayersError, normalizeTextLayers, textLayerShapes, textLayersOf, type NameTagKeyring, type TextLayer } from "@/lib/textLayers";
import { DEFAULT_SNAP_GRID, DEFAULT_WORKPLANE_WORKSPACE } from "@/lib/workplaneSettings";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { TextKeyringSide, WorkplaneShape } from "@/types/layerling";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

// #215: the key ring hole and the corners of each layer, in the layer code, the MCP action and the .lyl check.
let runtime: ManifoldToplevel;

beforeAll(async () => {
  runtime = await manifoldModule();
  runtime.setup();
  // The hole is placed from the plate's real outline, with the 2D kernel the editor has loaded.
  rememberManifoldRuntime(runtime);
  await loadTextFonts();
});

const text = (overrides: Partial<WorkplaneShape> = {}): WorkplaneShape => ({
  id: "t", name: "Text", kind: "text", color: "#ffffff", x: 0, z: 0, elevation: 0, rotation: 0,
  width: 60, depth: 20, height: 1.2, size: 60, text: "Name", font: "Sans", ...overrides,
});
const sized = (shape: WorkplaneShape, size: number) => ({ ...shape, ...textLetterSizePatch(shape, size) });

/** A layer's outline in the world's x/z, as Manifold sees it: the fill path where it has one, else the glyphs. */
function outline(shape: WorkplaneShape, made: CrossSection[]): CrossSection {
  const keep = (section: CrossSection) => {
    made.push(section);
    return section;
  };
  let rings: [number, number][][];
  if (textHasFill(shape)) {
    rings = textFillComponents(runtime, shape)!.flatMap(({ outer, holes }) => [outer, ...holes]).map((ring) => ring.map((point) => [point.x, point.z] as [number, number]));
  } else {
    const glyphs = textGlyphShapes(shape)!;
    rings = glyphs.glyphs.flatMap(({ glyph, map }) => {
      const sampled = glyph.extractPoints(glyphs.curveSegments);
      return [sampled.shape, ...sampled.holes].map((ring) => ring.map((point) => map(point)).map((point) => [point.x, point.z] as [number, number]));
    });
  }
  return keep(keep(new runtime.CrossSection(rings, "EvenOdd")).translate([shape.x, shape.z]));
}

/** The round hole of a layer's outline, measured: the hole ring of about the area of a disc, its middle and width. */
function measuredHole(shape: WorkplaneShape) {
  const rings = textFillComponents(runtime, shape)!.flatMap(({ holes }) => holes);
  const round = rings.map((ring) => {
    const xs = ring.map((point) => point.x);
    const zs = ring.map((point) => point.z);
    return { x: shape.x + (Math.min(...xs) + Math.max(...xs)) / 2, z: shape.z + (Math.min(...zs) + Math.max(...zs)) / 2, width: Math.max(...xs) - Math.min(...xs), depth: Math.max(...zs) - Math.min(...zs) };
  }).filter((hole) => Math.abs(hole.width - hole.depth) < 0.05);
  expect(round).toHaveLength(1);
  return round[0];
}

const disc = (x: number, z: number, radius: number, made: CrossSection[]) => {
  const section = runtime.CrossSection.circle(radius, 96).translate([x, z]);
  made.push(section);
  return section;
};
const covered = (region: CrossSection, part: CrossSection, made: CrossSection[]) => {
  const common = region.intersect(part);
  made.push(common);
  return common.area() / part.area();
};

function boundsOf(section: CrossSection) {
  const { min, max } = section.bounds();
  return { minX: min[0], maxX: max[0], minZ: min[1], maxZ: max[1], midX: (min[0] + max[0]) / 2, midZ: (min[1] + max[1]) / 2 };
}

/**
 * A key ring tab measured on the geometry (#215), along the tab (s, outwards) and across it (v):
 * the hole; where the plate - the bottom layer of the same stack without a key ring, so without
 * the tab - reaches furthest in the tab's band (the hole and a 1.75 mm wall either side of the
 * hole's middle), where the tab's flat end sits; how far the tab reaches; and its width halfway
 * between that flat end and the hole's middle.
 */
function tabMeasures(withRing: WorkplaneShape, plain: WorkplaneShape, side: TextKeyringSide, diameter: number, made: CrossSection[]) {
  const keep = (section: CrossSection) => {
    made.push(section);
    return section;
  };
  const along = (x: number, z: number) => (side === "right" ? x : side === "left" ? -x : -z);
  const across = (x: number, z: number) => (side === "top" ? x : z);
  const hole = measuredHole(withRing);
  const holeAlong = along(hole.x, hole.z);
  const holeAcross = across(hole.x, hole.z);
  const half = diameter / 2 + 1.75;
  const band = keep(side === "top" ? runtime.CrossSection.square([2 * half, 1000]).translate([hole.x - half, -500]) : runtime.CrossSection.square([1000, 2 * half]).translate([-500, hole.z - half]));
  const furthest = (section: CrossSection) => {
    const box = boundsOf(keep(section.intersect(band)));
    return side === "right" ? box.maxX : side === "left" ? -box.minX : -box.minZ;
  };
  const bottom = outline(withRing, made);
  const edge = furthest(outline(plain, made));
  const tip = furthest(bottom);
  // A thin cut across the tab halfway along its straight part, a little wider than the band.
  const at = (edge + holeAlong) / 2;
  const span = 2 * half + 2;
  const cut = keep(side === "top"
    ? runtime.CrossSection.square([span, 0.02]).translate([holeAcross - span / 2, -at - 0.01])
    : runtime.CrossSection.square([0.02, span]).translate([side === "right" ? at - 0.01 : -at - 0.01, holeAcross - span / 2]));
  const slice = keep(bottom.intersect(cut)).bounds();
  const [low, high] = side === "top" ? [slice.min[0], slice.max[0]] : [slice.min[1], slice.max[1]];
  return { hole, holeAlong, holeAcross, edge, tip, low: low - holeAcross, high: high - holeAcross, width: high - low, along };
}

describe("the key ring hole (#215)", () => {
  it.each(["left", "right", "top"] as TextKeyringSide[])("goes through the bottom layer on the %s, in an ear round it, measured", (side) => {
    const made: CrossSection[] = [];
    const parts = textLayerShapes(sized(text({ x: 7, z: -3 }), 12), DEFAULT_TEXT_LAYERS, [], { side, diameter: 4 });
    const letters = boundsOf(outline(parts[0], made));
    const bottom = outline(parts[2], made);
    const hole = measuredHole(parts[2]);
    expect(hole.width).toBeCloseTo(4, 1);
    // Outside the letters on its side, centred on them the other way.
    if (side === "left") expect(hole.x).toBeLessThan(letters.minX - 2);
    if (side === "right") expect(hole.x).toBeGreaterThan(letters.maxX + 2);
    if (side === "top") expect(hole.z).toBeLessThan(letters.minZ - 2);
    if (side === "top") expect(hole.x).toBeCloseTo(letters.midX, 2);
    else expect(hole.z).toBeCloseTo(letters.midZ, 2);
    // Nothing of the bottom layer inside the hole; all of a ring round it is the ear.
    expect(covered(bottom, disc(hole.x, hole.z, 1.9, made), made)).toBeLessThan(1e-6);
    const ring = disc(hole.x, hole.z, 3.7, made).subtract(disc(hole.x, hole.z, 2.1, made));
    made.push(ring);
    expect(covered(bottom, ring, made)).toBeGreaterThan(0.999);
    // The ear holds on to the plate: one piece.
    expect(textFillComponents(runtime, parts[2])).toHaveLength(1);
    // The layers above do not reach that far and stay as they were.
    expect(parts[0].textKeyring).toBeUndefined();
    expect(parts[1].textKeyring).toBeUndefined();
    made.forEach((section) => section.delete());
  });

  it("goes through every layer it touches", () => {
    const made: CrossSection[] = [];
    // A middle layer 12 mm wider reaches well past the hole, whose edge is 2 mm beyond the 3 mm plate: it gets the hole too, but no tab.
    const layers: TextLayer[] = [{ grow: 0, height: 1, color: "#ffffff" }, { grow: 12, height: 1, color: "#d41721" }, { grow: 3, height: 2, color: "#2b2b2b", silhouette: true }];
    const parts = textLayerShapes(sized(text(), 12), layers, [], { side: "right", diameter: 4 });
    expect(parts[1].textKeyring).toMatchObject({ side: "right", diameter: 4 });
    expect(parts[1].textKeyring?.ear).toBeUndefined();
    const hole = measuredHole(parts[2]);
    expect(covered(outline(parts[1], made), disc(hole.x, hole.z, 1.9, made), made)).toBeLessThan(1e-6);
    made.forEach((section) => section.delete());
  });

  it("moves with a longer text and a bigger letter size", () => {
    const made: CrossSection[] = [];
    const measure = (words: string, size: number) => {
      const source = sized(text({ text: words }), size);
      const parts = textLayerShapes(source, DEFAULT_TEXT_LAYERS, [], { side: "left", diameter: 4 });
      const letters = boundsOf(outline(parts[0], made));
      return { letters, ...tabMeasures(parts[2], textLayerShapes(source, DEFAULT_TEXT_LAYERS)[2], "left", 4, made) };
    };
    const short = measure("Name", 12);
    const long = measure("Alexandra", 12);
    const big = measure("Name", 20);
    // Further out with the longer word and the bigger letters ...
    expect(long.hole.x).toBeLessThan(short.hole.x - 10);
    expect(big.hole.x).toBeLessThan(short.hole.x - 5);
    // ... always with its edge 2 mm beyond the plate and in the letters' middle.
    for (const { letters, hole, holeAlong, edge } of [short, long, big]) {
      expect(Math.abs(holeAlong - 2 - edge - 2)).toBeLessThan(0.05);
      expect(hole.z).toBeCloseTo(letters.midZ, 2);
    }
    made.forEach((section) => section.delete());
  });

  it("is read back from the stack and built again the same", () => {
    const parts = textLayerShapes(sized(text({ x: 4, z: 9, rotation: 25 }), 12), DEFAULT_TEXT_LAYERS, [], { side: "top", diameter: 5 });
    const read = textLayersOf([parts[1], parts[2], parts[0]])!;
    expect(read.keyring).toEqual({ side: "top", diameter: 5 });
    expect(textLayerShapes(read.source, read.layers, read.ids, read.keyring)).toEqual(parts);
  });
});

describe("the key ring tab as plazmabokor's printed one (#215)", () => {
  // The printed tab: 6.5 mm wide, a 3 mm hole in the middle of the half circle at its end; its
  // edge 2 mm beyond the plate, so 6.75 mm of the tab stick out (the printed 8 mm, 1.25 mm of it in the plate). "Arany" at 9 mm on a name tag's layers: its A
  // slants and its y hangs below, so the plate's box is no measure of where its edge is.
  const cases = (["left", "right", "top"] as TextKeyringSide[]).flatMap((side) => [3, 5].map((diameter) => [side, diameter] as const));
  it.each(cases)("\"Arany\", Sans, letter size 9, name tag layers, on the %s, hole %s mm: width, reach, hole and its distance, measured", (side, diameter) => {
    const made: CrossSection[] = [];
    const source = sized(text({ text: "Arany", font: "Sans" }), 9);
    const plain = textLayerShapes(source, NAME_TAG_LAYERS);
    const parts = textLayerShapes(source, NAME_TAG_LAYERS, [], { side, diameter });
    const tab = tabMeasures(parts[2], plain[2], side, diameter, made);
    // 3 mm: 6.5 mm wide, 6.75 mm out, the hole's edge 2 mm from the plate. 5 mm: 8.5 mm wide, 8.75 mm out.
    const [width, out] = diameter === 3 ? [6.5, 6.75] : [8.5, 8.75];
    expect(Math.abs(tab.width - width)).toBeLessThan(0.05);
    expect(Math.abs(tab.tip - tab.edge - out)).toBeLessThan(0.05);
    expect(Math.abs(tab.hole.width - diameter)).toBeLessThan(0.05);
    expect(Math.abs(tab.hole.depth - diameter)).toBeLessThan(0.05);
    expect(Math.abs(tab.holeAlong - diameter / 2 - tab.edge - 2)).toBeLessThan(0.05);
    // On the plate's 3 mm: the tab is the bottom layer.
    expect(parts[2].height).toBe(3);
    expect(parts[2].textKeyring?.ear).toBe(true);
    // In the middle of its side, and the letters stay where they were.
    const letters = boundsOf(outline(plain[0], made));
    if (side === "top") expect(tab.hole.x).toBeCloseTo(letters.midX, 1);
    else expect(Math.abs(tab.hole.z - (plain[0].z ?? 0))).toBeLessThan(1e-3);
    const withHole = boundsOf(outline(parts[0], made));
    expect(withHole.minX).toBeCloseTo(letters.minX, 6);
    expect(withHole.minZ).toBeCloseTo(letters.minZ, 6);
    expect(textFillComponents(runtime, parts[2])).toHaveLength(1);
    made.forEach((section) => section.delete());
  });
});

describe("the key ring tab's shape (#215)", () => {
  const cases = (["left", "right", "top"] as TextKeyringSide[]).flatMap((side) => [3, 5].map((diameter) => [side, diameter] as const));
  it.each(cases)("%s, hole %s mm: parallel sides, half circle round the hole, one piece, measured", (side, diameter) => {
    const made: CrossSection[] = [];
    const source = sized(text(), 12);
    const plain = textLayerShapes(source, DEFAULT_TEXT_LAYERS);
    const parts = textLayerShapes(source, DEFAULT_TEXT_LAYERS, [], { side, diameter });
    const half = diameter / 2 + 1.75;
    const tab = tabMeasures(parts[2], plain[2], side, diameter, made);
    expect(tab.hole.width).toBeCloseTo(diameter, 2);
    expect(Math.abs(tab.holeAlong - diameter / 2 - tab.edge - 2)).toBeLessThan(0.05);
    // Straight, parallel sides the hole and a 1.75 mm wall either side apart, centred on the hole, wherever cut between plate and hole.
    const bottom = outline(parts[2], made);
    for (const share of [0.25, 0.5, 0.75]) {
      const at = tab.edge + share * (tab.holeAlong - tab.edge);
      const span = 2 * half + 2;
      const cut = side === "top"
        ? runtime.CrossSection.square([span, 0.02]).translate([tab.holeAcross - span / 2, -at - 0.01])
        : runtime.CrossSection.square([0.02, span]).translate([side === "right" ? at - 0.01 : -at - 0.01, tab.holeAcross - span / 2]);
      made.push(cut);
      const slice = bottom.intersect(cut);
      made.push(slice);
      const { min, max } = slice.bounds();
      const low = side === "top" ? min[0] : min[1];
      const high = side === "top" ? max[0] : max[1];
      expect(high - low).toBeCloseTo(diameter + 3.5, 2);
      expect(low - tab.holeAcross).toBeCloseTo(-half, 2);
      expect(high - tab.holeAcross).toBeCloseTo(half, 2);
    }
    // Beyond the hole's middle the outline is a half circle round it, half the tab's width out.
    const tip = textFillComponents(runtime, parts[2])!.flatMap(({ outer }) => outer)
      .map((point) => ({ x: point.x + parts[2].x, z: point.z + parts[2].z }))
      .filter((point) => tab.along(point.x, point.z) > tab.holeAlong + 1e-3);
    expect(tip.length).toBeGreaterThan(10);
    tip.forEach((point) => expect(Math.hypot(point.x - tab.hole.x, point.z - tab.hole.z)).toBeCloseTo(half, 3));
    expect(tab.tip - tab.holeAlong).toBeCloseTo(half, 2);
    expect(textFillComponents(runtime, parts[2])).toHaveLength(1);
    made.forEach((section) => section.delete());
  });
});

describe("the corners of each layer (#215)", () => {
  const plate = (join?: TextLayer["join"]): TextLayer[] => [{ grow: 0, height: 1, color: "#ffffff" }, { grow: 3, height: 2, color: "#2b2b2b", ...(join ? { join } : {}) }];

  it("round, bevel and sharp give different outlines, measured at a corner of the letters", () => {
    const made: CrossSection[] = [];
    const corner = (join?: TextLayer["join"]) => {
      const parts = textLayerShapes(sized(text({ text: "H" }), 12), plate(join));
      const wide = outline(parts[1], made);
      const box = boundsOf(wide);
      // A 0.4 mm square right in the corner of the box the 3 mm widening reaches.
      const square = runtime.CrossSection.square([0.4, 0.4]).translate([box.minX, box.minZ]);
      made.push(square);
      return { area: wide.area(), inCorner: covered(wide, square, made), stroke: parts[1].textStroke };
    };
    const round = corner();
    const bevel = corner("bevel");
    const sharp = corner("miter");
    expect(round.stroke?.join).toBe("round");
    expect(bevel.stroke?.join).toBe("bevel");
    expect(sharp.stroke?.join).toBe("miter");
    // Only the sharp corner reaches into the corner of the box; the round one passes it by 3 mm × (√2 - 1).
    expect(sharp.inCorner).toBeGreaterThan(0.99);
    expect(round.inCorner).toBeLessThan(1e-6);
    expect(bevel.inCorner).toBeLessThan(1e-6);
    // The bevel is cut square a full widening off the corner (Manifold's Square join), so it keeps more
    // than the round corner and less than the sharp one: the areas in that order.
    expect(sharp.area).toBeGreaterThan(bevel.area + 1);
    expect(bevel.area).toBeGreaterThan(round.area + 1);
    made.forEach((section) => section.delete());
  });

  it("old layers without a corner come out exactly as before: round", () => {
    const parts = textLayerShapes(sized(text(), 12), DEFAULT_TEXT_LAYERS);
    expect(parts[0].textStroke).toBeUndefined();
    expect(parts[1].textStroke).toEqual({ width: 1.5, align: "grow", join: "round", cap: "flat" });
    expect(parts[2].textStroke).toEqual({ width: 3, align: "grow", join: "round", cap: "flat" });
    parts.forEach((part) => expect(part.textKeyring).toBeUndefined());
    // Read back, a round layer stays without the field, so a stack saved before reads as it did.
    expect(textLayersOf(parts)!.layers).toEqual(DEFAULT_TEXT_LAYERS);
    expect(normalizeTextLayers([{ grow: 2, height: 1, color: "#ffffff", join: "round" }])).toEqual([{ grow: 2, height: 1, color: "#ffffff" }]);
    expect(textLayersOf(textLayerShapes(sized(text(), 12), plate("bevel")))!.layers[1].join).toBe("bevel");
  });
});

describe("layerling_layer_text's new arguments (#215)", () => {
  it("takes a key ring hole, keeps it when left out, refuses bad values", () => {
    expect(layerTextKeyringArgument(undefined)).toBeUndefined();
    expect(layerTextKeyringArgument(false)).toEqual({ keyring: null });
    expect(layerTextKeyringArgument(null)).toEqual({ keyring: null });
    expect(layerTextKeyringArgument(true)).toEqual({ keyring: { side: "left", diameter: 3 } });
    expect(layerTextKeyringArgument({ side: "top", diameter: 5.5 })).toEqual({ keyring: { side: "top", diameter: 5.5 } });
    expect(layerTextKeyringArgument({})).toEqual({ keyring: { side: "left", diameter: 3 } });
    expect(layerTextKeyringArgument({ side: "bottom" })).toEqual({ error: "keyring.side must be left, right or top" });
    expect(layerTextKeyringArgument({ diameter: 0.5 })).toEqual({ error: "keyring.diameter must be 1 to 20 mm" });
    expect(layerTextKeyringArgument({ diameter: 25 })).toEqual({ error: "keyring.diameter must be 1 to 20 mm" });
    expect(layerTextKeyringArgument({ diameter: "4" })).toHaveProperty("error");
    expect(layerTextKeyringArgument("left")).toHaveProperty("error");
  });

  it("takes a corner per layer, old layer lists the same as before, refuses an unknown corner", () => {
    const old = [{ grow: 0, height: 1.2, color: "#ffffff" }, { grow: 1.5, height: 1.2, color: "#d41721" }, { grow: 3, height: 2, color: "#2b2b2b", silhouette: true }];
    expect(layerTextLayersError(old)).toBeNull();
    expect(normalizeTextLayers(old)).toEqual(DEFAULT_TEXT_LAYERS);
    expect(normalizeTextLayers([{ grow: 0, height: 1, color: "#ffffff" }, { grow: 2, height: 2, color: "#d41721", join: "miter" }])![1].join).toBe("miter");
    expect(layerTextLayersError([{ grow: 0 }, { grow: 2, join: "pointy" }])).toBe("layers[1].join must be round, bevel or miter");
    expect(layerTextLayersError(undefined)).toBeNull();
  });

  it("are in the tool's schema", () => {
    const tool = (tools as { name: string; inputSchema: { properties: Record<string, { items?: { properties: Record<string, { enum?: string[] }> } }> } }[]).find((entry) => entry.name === "layerling_layer_text")!;
    expect(tool.inputSchema.properties.keyring).toBeDefined();
    expect(tool.inputSchema.properties.layers.items!.properties.join.enum).toEqual(["round", "bevel", "miter"]);
    // Everything it took before is still there.
    expect(Object.keys(tool.inputSchema.properties)).toEqual(expect.arrayContaining(["id", "text", "font", "layers", "names", "gap"]));
  });
});

describe(".lyl: the key ring hole and the corners (#215)", () => {
  function input(shapes: WorkplaneShape[]): LylProjectExportInput {
    return {
      projectId: "p", projectName: "Name tags", createdAt: 1_700_000_000_000, modifiedAt: 1_700_000_100_000,
      shapes, history: [editorHistoryEntry(shapes, [])], historyIndex: 0, assets: [],
      workspace: DEFAULT_WORKPLANE_WORKSPACE, snapGrid: DEFAULT_SNAP_GRID, placementElevation: 0,
    };
  }
  function mutate(bytes: Uint8Array, change: (definition: Record<string, unknown>) => void) {
    const files = unzipSync(bytes);
    const document = JSON.parse(strFromU8(files["project.json"])) as LylProjectDocumentV1;
    const node = document.states[0].nodes.find((entry) => (entry.definition as Record<string, unknown>).textKeyring !== undefined)!;
    change(node.definition as Record<string, unknown>);
    files["project.json"] = strToU8(JSON.stringify(document));
    return zipSync(files);
  }
  const layers: TextLayer[] = [{ grow: 0, height: 1.2, color: "#ffffff" }, { grow: 1.5, height: 1.2, color: "#d41721", join: "bevel" }, { grow: 3, height: 2, color: "#2b2b2b", silhouette: true, join: "miter" }];
  const keyring: NameTagKeyring = { side: "right", diameter: 4 };

  it("keeps them through saving and opening", async () => {
    const parts = textLayerShapes(sized(text(), 12), layers, [], keyring);
    const restored = await importLylProject(await exportLylProject(input(parts)));
    expect(restored.shapes).toEqual(parts.map(canonicalizeShape));
    const read = textLayersOf(restored.shapes)!;
    expect(read.keyring).toEqual(keyring);
    expect(read.layers.map((layer) => layer.join)).toEqual([undefined, "bevel", "miter"]);
  });

  it("opens a file without them as before", async () => {
    const parts = textLayerShapes(sized(text(), 12), DEFAULT_TEXT_LAYERS);
    const restored = await importLylProject(await exportLylProject(input(parts)));
    expect(restored.shapes).toEqual(parts.map(canonicalizeShape));
    expect(textLayersOf(restored.shapes)!.keyring).toBeNull();
  });

  it("refuses an unknown side, an unknown corner and a diameter out of range", async () => {
    const saved = await exportLylProject(input(textLayerShapes(sized(text(), 12), layers, [], keyring)));
    await expect(importLylProject(mutate(saved, (definition) => { (definition.textKeyring as Record<string, unknown>).side = "bottom"; }))).rejects.toThrow("textKeyring must be a side");
    await expect(importLylProject(mutate(saved, (definition) => { (definition.textKeyring as Record<string, unknown>).diameter = 30; }))).rejects.toThrow("textKeyring must be a side");
    await expect(importLylProject(mutate(saved, (definition) => { (definition.textKeyring as Record<string, unknown>).diameter = 0.2; }))).rejects.toThrow("textKeyring must be a side");
    await expect(importLylProject(mutate(saved, (definition) => { (definition.textStroke as Record<string, unknown>).join = "pointy"; }))).rejects.toThrow("textStroke.join must be miter, round or bevel");
  });
});
