import { FontLoader, type Font, type FontData } from "three/examples/jsm/loaders/FontLoader.js";
import { isCustomFontId, type CustomTypeface } from "@/lib/customFonts";

/**
 * The typefaces the text shape offers, loaded on demand.
 *
 * Together the six typeface files are about 1.6 MB of JSON (0.5 MB gzipped).
 * Imported statically they sat in the first page load of every visitor - the
 * dashboard included - and were parsed twice, once by the viewport and once by
 * the boolean path. Now each file is its own chunk, fetched once the editor
 * starts, and parsed a single time for both.
 *
 * Text geometry is built synchronously all over the editor, so the editor waits
 * for `loadTextFonts()` before it renders; after that `textFont()` is plain
 * lookup.
 */

const fontLoaders = {
  Multilanguage: () => import("three/examples/fonts/helvetiker_bold.typeface.json"),
  Sans: () => import("three/examples/fonts/droid/droid_sans_bold.typeface.json"),
  Serif: () => import("three/examples/fonts/droid/droid_serif_bold.typeface.json"),
  Script: () => import("three/examples/fonts/gentilis_bold.typeface.json"),
  Monospace: () => import("three/examples/fonts/droid/droid_sans_mono_regular.typeface.json"),
  Rounded: () => import("three/examples/fonts/optimer_bold.typeface.json"),
  // Stencil is drawn from the Multilanguage face with straight segments.
  Stencil: () => import("three/examples/fonts/helvetiker_bold.typeface.json"),
} satisfies Record<string, () => Promise<{ default: unknown }>>;

let loadedFonts: Record<string, Font> | null = null;
let fontsPromise: Promise<void> | null = null;

export function textFontsLoaded() {
  return loadedFonts !== null;
}

type GlyphData = { x_min?: number; x_max?: number; ha: number; o?: string };

/**
 * The typeface with every character it lacks taken from `fallback`, scaled to
 * its units. The Multilanguage face (helvetiker) has no umlauts, no ß, no é and
 * no €, and three.js draws "?" for a missing character - "Grüße" came out as
 * "Gr??e". Sans has them all; a borrowed letter looks a little different, but
 * it is the letter. Characters the face has are never touched.
 */
export function withFallbackGlyphs(data: FontData, fallback: FontData): FontData {
  const own = data.glyphs as Record<string, GlyphData>;
  const borrowed = fallback.glyphs as Record<string, GlyphData>;
  const missing = Object.keys(borrowed).filter((char) => !own[char]);
  if (missing.length === 0) return data;
  const scale = (data.resolution ?? 1000) / (fallback.resolution ?? 1000);
  const scaled = (value: number | undefined) => (value === undefined ? undefined : value * scale);
  const glyphs: Record<string, GlyphData> = { ...own };
  for (const char of missing) {
    const glyph = borrowed[char];
    glyphs[char] = {
      x_min: scaled(glyph.x_min),
      x_max: scaled(glyph.x_max),
      ha: glyph.ha * scale,
      o: glyph.o
        ?.split(" ")
        .map((token) => (token === "" || Number.isNaN(Number(token)) ? token : String(Number(token) * scale)))
        .join(" "),
    };
  }
  return { ...data, glyphs } as FontData;
}

/**
 * Faces that miss common letters borrow them from Sans. Script lacks the whole Cyrillic and Greek
 * alphabets and 37 letters of Latin Extended-A, among them the Polish ą and ę, which came out as "?".
 */
const BORROWS_FROM_SANS = new Set(["Multilanguage", "Stencil", "Rounded", "Script"]);

export function loadTextFonts(): Promise<void> {
  if (loadedFonts) return Promise.resolve();
  fontsPromise ??= Promise.all(
    Object.entries(fontLoaders).map(async ([name, load]) => [name, (await load()).default as FontData] as const),
  )
    .then((entries) => {
      const loader = new FontLoader();
      const parsed = new Map<FontData, Font>();
      const sans = entries.find(([name]) => name === "Sans")?.[1];
      sansData = sans ?? null;
      // Filled once per typeface file, so Multilanguage and Stencil keep sharing one.
      const filled = new Map<FontData, FontData>();
      entries = entries.map(([name, data]) => {
        if (!sans || !BORROWS_FROM_SANS.has(name)) return [name, data] as const;
        let complete = filled.get(data);
        if (!complete) {
          complete = withFallbackGlyphs(data, sans);
          filled.set(data, complete);
        }
        return [name, complete] as const;
      });
      loadedFonts = Object.fromEntries(entries.map(([name, data]) => {
        let font = parsed.get(data);
        if (!font) {
          font = loader.parse(data);
          parsed.set(data, font);
        }
        return [name, font];
      }));
    })
    .catch((error) => {
      // A failed fetch must not poison every later attempt.
      fontsPromise = null;
      throw error;
    });
  return fontsPromise;
}

/** The typeface for a text shape; unknown names fall back to Multilanguage. */
export function textFont(name: string | undefined): Font {
  if (!loadedFonts) {
    throw new Error("Text fonts are not loaded yet - await loadTextFonts() first");
  }
  if (isCustomFontId(name)) {
    const entry = customFonts.get(name);
    if (entry) {
      // Letters the font lacks - or a design did not bring along - come from Sans, as for the built-in faces.
      entry.font ??= new FontLoader().parse(sansData ? withFallbackGlyphs(entry.data, sansData) : entry.data);
      return entry.font;
    }
  }
  return loadedFonts[name ?? "Multilanguage"] ?? loadedFonts.Multilanguage;
}

/*
 * Fonts of one's own (customFonts.ts), by their id ("custom:<hash of the file>"). A font read
 * from a file or from the computer is complete; one a design brought along holds only the
 * letters its texts use. A complete one always wins; the letters of several designs add up.
 */
type CustomFontEntry = { id: string; name: string; data: FontData; complete: boolean; font: Font | null; revision: number };

let sansData: FontData | null = null;
const customFonts = new Map<string, CustomFontEntry>();
const customFontListeners = new Set<() => void>();

export function registerCustomFont(typeface: CustomTypeface, complete: boolean) {
  const existing = customFonts.get(typeface.id);
  if (existing?.complete && !complete) return;
  let data = typeface.data;
  if (existing && !existing.complete && !complete) {
    data = { ...existing.data, glyphs: { ...(existing.data.glyphs as object), ...(typeface.data.glyphs as object) } } as FontData;
  }
  customFonts.set(typeface.id, { id: typeface.id, name: existing?.complete ? existing.name : typeface.name, data, complete, font: null, revision: (existing?.revision ?? 0) + 1 });
  customFontListeners.forEach((listener) => listener());
}

/** Every font of one's own the editor knows now, by name. */
export function customFontList() {
  return [...customFonts.values()]
    .map(({ id, name, complete }) => ({ id, name, complete }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function customFontEntry(id: string) {
  const entry = customFonts.get(id);
  return entry ? { id: entry.id, name: entry.name, data: entry.data, complete: entry.complete } : null;
}

/** Changes whenever a font's letters change, so cached text shapes are drawn again. */
export function customFontRevision(id: string | undefined) {
  return id ? customFonts.get(id)?.revision ?? 0 : 0;
}

/** The display name of a text's font: a built-in name, a font of one's own, or null when it is missing. */
export function textFontLabel(id: string | undefined) {
  if (!isCustomFontId(id)) return id ?? "Multilanguage";
  return customFonts.get(id)?.name ?? null;
}

/** Forgets every font of one's own - for tests, which share this module's state. */
export function resetCustomFontsForTests() {
  customFonts.clear();
}

export function onCustomFontsChanged(listener: () => void) {
  customFontListeners.add(listener);
  return () => {
    customFontListeners.delete(listener);
  };
}
