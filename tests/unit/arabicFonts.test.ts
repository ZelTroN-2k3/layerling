import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { textCharacters, typefaceFromFontFile } from "@/lib/customFonts";
import { loadTextFonts, registerCustomFont, resetCustomFontsForTests } from "@/lib/textFonts";
import { createTextGeometry, curvedTextLayout, displayTextOf } from "@/lib/textGeometry";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * Arabic in a font of one's own (#294): the shapes a letter takes beside its neighbours are read
 * from the font's shaping rules (GSUB init, medi, fina, rlig) when the file is converted, and the
 * text shape draws a word with them, first letter on the right. The font is built here with
 * opentype.js: a handful of Arabic letters as squares, each form with an advance of its own so
 * the test can tell which glyph was taken.
 */

type OpentypeModule = {
  Font: new (options: Record<string, unknown>) => { substitution: { addSingle(feature: string, sub: unknown, script: string): void; addLigature(feature: string, sub: unknown, script: string): void }; toArrayBuffer(): ArrayBuffer };
  Glyph: new (options: Record<string, unknown>) => unknown;
  Path: new () => { moveTo(x: number, y: number): void; lineTo(x: number, y: number): void; close(): void };
};

const BASE = 500;
const FINAL = 530;
const INITIAL = 510;
const MEDIAL = 520;
const LIGATURE = 700;

async function arabicFontFile(): Promise<ArrayBuffer> {
  const { Font, Glyph, Path } = (await import("opentype.js")) as unknown as OpentypeModule;
  const square = (size: number) => {
    const path = new Path();
    path.moveTo(50, 0);
    path.lineTo(size - 50, 0);
    path.lineTo(size - 50, 600);
    path.lineTo(50, 600);
    path.close();
    return path;
  };
  const glyphs: unknown[] = [new Glyph({ name: ".notdef", advanceWidth: BASE, path: new Path() })];
  const index = new Map<string, number>();
  const add = (name: string, advanceWidth: number, unicode?: number) => {
    index.set(name, glyphs.length);
    glyphs.push(new Glyph({ name, ...(unicode !== undefined ? { unicode } : {}), advanceWidth, path: square(advanceWidth) }));
  };
  add("space", BASE, 0x20);
  add("H", BASE, 0x48);
  for (const [name, code, forms] of [
    ["ain", 0x639, ["init", "medi", "fina"]],
    ["reh", 0x631, ["fina"]],
    ["beh", 0x628, ["init", "medi", "fina"]],
    ["yeh", 0x64a, ["init", "medi", "fina"]],
    ["lam", 0x644, ["init", "medi", "fina"]],
    ["alef", 0x627, ["fina"]],
  ] as const) {
    add(name, BASE, code);
    forms.forEach((form) => add(`${name}.${form}`, form === "init" ? INITIAL : form === "medi" ? MEDIAL : FINAL));
  }
  add("lam_alef", LIGATURE);
  add("lam_alef.fina", LIGATURE + 1);
  const font = new Font({ familyName: "Squares Arabic", styleName: "Regular", unitsPerEm: 1000, ascender: 800, descender: -200, glyphs });
  for (const [name, forms] of [["ain", 3], ["reh", 1], ["beh", 3], ["yeh", 3], ["lam", 3], ["alef", 1]] as const) {
    const base = index.get(name)!;
    const feature = (form: string) => {
      const by = index.get(`${name}.${form}`);
      if (by !== undefined) font.substitution.addSingle(form, { sub: base, by }, "arab");
    };
    feature("fina");
    if (forms === 3) {
      feature("init");
      feature("medi");
    }
  }
  font.substitution.addLigature("rlig", { sub: [index.get("lam.init")!, index.get("alef.fina")!], by: index.get("lam_alef")! }, "arab");
  font.substitution.addLigature("rlig", { sub: [index.get("lam.medi")!, index.get("alef.fina")!], by: index.get("lam_alef.fina")! }, "arab");
  return font.toArrayBuffer();
}

let runtime: ManifoldToplevel;
let fontId: string;

beforeAll(async () => {
  runtime = await manifoldModule();
  runtime.setup();
  await loadTextFonts();
});

beforeEach(() => resetCustomFontsForTests());

const textShape = (text: string, overrides: Partial<WorkplaneShape> = {}): WorkplaneShape =>
  ({ id: "t", name: "Text", kind: "text", color: "#000", x: 0, z: 0, size: 40, width: 40, depth: 10, height: 3, rotation: 0, text, font: fontId, ...overrides }) as WorkplaneShape;

describe("Arabic in a font of one's own", () => {
  it("reads the letter forms and the lam-alef ligature from the font's shaping rules", async () => {
    const typeface = await typefaceFromFontFile(await arabicFontFile(), "squares.ttf", runtime);
    fontId = typeface.id;
    const glyphs = typeface.data.glyphs as Record<string, { ha: number }>;
    expect(glyphs["ع"].ha).toBe(BASE);
    expect(glyphs["ﻋ"].ha).toBe(INITIAL);
    expect(glyphs["ﻌ"].ha).toBe(MEDIAL);
    expect(glyphs["ﻊ"].ha).toBe(FINAL);
    expect(glyphs["ﺮ"].ha).toBe(FINAL);
    expect(glyphs["ﺭ"]).toBeUndefined();
    expect(glyphs["ﻻ"].ha).toBe(LIGATURE);
    expect(glyphs["ﻼ"].ha).toBe(LIGATURE + 1);
  });

  it("draws عربي with its forms, first letter on the right, straight and on the arc", async () => {
    const typeface = await typefaceFromFontFile(await arabicFontFile(), "squares.ttf", runtime);
    fontId = typeface.id;
    registerCustomFont(typeface, true);
    expect(Array.from(displayTextOf(textShape("عربي")))).toEqual(["ﻲ", "ﺑ", "ﺮ", "ﻋ"]);
    expect(curvedTextLayout(textShape("عربي", { textCurved: true, textRadius: 30, textSize: 8 })).glyphs.map((glyph) => glyph.char)).toEqual(["ﻲ", "ﺑ", "ﺮ", "ﻋ"]);
    const geometry = createTextGeometry(textShape("عربي"));
    expect(geometry.getAttribute("position").count).toBeGreaterThan(0);
  });

  it("keeps the forms a design's texts use, so the design opens without the font", async () => {
    const typeface = await typefaceFromFontFile(await arabicFontFile(), "squares.ttf", runtime);
    const glyphs = typeface.data.glyphs as Record<string, unknown>;
    expect([...textCharacters("لا", glyphs)].sort()).toEqual([" ", "ا", "ل", "ﻻ"].sort());
    // Without the ligature the two letters travel in their joined forms.
    const { "ﻻ": _ligature, ...withoutLigature } = glyphs;
    expect([...textCharacters("لا", withoutLigature)].sort()).toEqual([" ", "ا", "ل", "ﺎ", "ﻟ"].sort());
  });
});
