// The few parts of opentype.js 1.x that reading a font for the text shape needs.
declare module "opentype.js" {
  export type PathCommand =
    | { type: "M" | "L"; x: number; y: number }
    | { type: "Q"; x: number; y: number; x1: number; y1: number }
    | { type: "C"; x: number; y: number; x1: number; y1: number; x2: number; y2: number }
    | { type: "Z" };

  export type Glyph = {
    name?: string;
    unicode?: number;
    unicodes: number[];
    advanceWidth?: number;
    xMin?: number;
    xMax?: number;
    path: { commands: PathCommand[] };
  };

  /** Which glyphs a GSUB subtable applies to: a list or ranges of glyph indexes. */
  export type Coverage = { format: 1; glyphs: number[] } | { format: 2; ranges: Array<{ start: number; end: number; index: number }> };

  /** A GSUB subtable as opentype.js parses it; an extension subtable (lookup type 7) wraps another under `extension`. */
  export type GsubSubtable = {
    substFormat?: number;
    coverage?: Coverage;
    deltaGlyphId?: number;
    substitute?: number[];
    sequences?: number[][];
    ligatureSets?: Array<Array<{ ligGlyph: number; components: number[] }>>;
    lookupType?: number;
    extension?: GsubSubtable;
  };

  export type GsubTable = {
    scripts: Array<{ tag: string; script: { defaultLangSys?: { featureIndexes: number[] }; langSysRecords: Array<{ tag: string; langSys: { featureIndexes: number[] } }> } }>;
    features: Array<{ tag: string; feature: { lookupListIndexes: number[] } }>;
    lookups: Array<{ lookupType: number; subtables: GsubSubtable[] }>;
  };

  export type Font = {
    unitsPerEm: number;
    ascender: number;
    descender: number;
    names: Record<string, Record<string, string> | undefined>;
    tables: { post?: { underlinePosition?: number; underlineThickness?: number }; head?: { xMin: number; yMin: number; xMax: number; yMax: number }; gsub?: GsubTable };
    glyphs: { length: number; get(index: number): Glyph };
    /** The glyph index a character maps to, 0 when the font has none. */
    charToGlyphIndex(char: string): number;
  };

  export function parse(buffer: ArrayBuffer): Font;
}
