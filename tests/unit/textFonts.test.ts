import { describe, expect, it } from "vitest";
import { loadTextFonts, textFont, textFontsLoaded, withFallbackGlyphs } from "@/lib/textFonts";

describe("textFonts", () => {
  it("refuses a lookup before the typefaces are loaded", () => {
    expect(textFontsLoaded()).toBe(false);
    expect(() => textFont("Sans")).toThrow(/loadTextFonts/);
  });

  it("loads every typeface once and falls back to Multilanguage", async () => {
    await Promise.all([loadTextFonts(), loadTextFonts()]);

    expect(textFontsLoaded()).toBe(true);
    const multilanguage = textFont("Multilanguage");
    expect(textFont(undefined)).toBe(multilanguage);
    expect(textFont("does-not-exist")).toBe(multilanguage);
    // Stencil is the Multilanguage face, parsed a single time.
    expect(textFont("Stencil")).toBe(multilanguage);
    for (const name of ["Sans", "Serif", "Script", "Monospace", "Rounded"]) {
      expect(textFont(name)).not.toBe(multilanguage);
      expect(textFont(name).generateShapes("A", 10).length).toBeGreaterThan(0);
    }
  });

  it("draws Russian, Ukrainian, Greek and Polish letters in every face instead of a question mark", async () => {
    await loadTextFonts();
    const russian = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя";
    const more = "ІіЇїЄєҐґΑΒΓΔΩαβγδωąęĄĘłŁśźżćńčřšžő";
    for (const name of ["Multilanguage", "Stencil", "Sans", "Serif", "Script", "Monospace", "Rounded"]) {
      const glyphs = textFont(name).data.glyphs as Record<string, unknown>;
      for (const char of russian + more) expect(glyphs[char], `${name}: ${char}`).toBeDefined();
    }
  });

  it("draws umlauts, ß, é and € in every face instead of a question mark", async () => {
    await loadTextFonts();
    for (const name of ["Multilanguage", "Stencil", "Sans", "Serif", "Script", "Monospace", "Rounded"]) {
      const glyphs = textFont(name).data.glyphs as Record<string, unknown>;
      for (const char of "äöüÄÖÜßé€ñ") expect(glyphs[char], `${name}: ${char}`).toBeDefined();
    }
  });

  it("borrows only what is missing, scaled to the face's units", () => {
    const face = { resolution: 1000, glyphs: { a: { ha: 500, o: "m 0 0 l 10 0" } } } as never;
    const fallback = { resolution: 2000, glyphs: { a: { ha: 900, o: "m 1 1" }, ü: { x_min: 0, x_max: 400, ha: 800, o: "m 0 0 l 200 400 q 10 20 30 40" } } } as never;
    const merged = withFallbackGlyphs(face, fallback) as unknown as { glyphs: Record<string, { ha: number; x_max?: number; o?: string }> };
    expect(merged.glyphs.a).toEqual({ ha: 500, o: "m 0 0 l 10 0" });
    expect(merged.glyphs.ü).toEqual({ x_min: 0, x_max: 200, ha: 400, o: "m 0 0 l 100 200 q 5 10 15 20" });
    expect((face as unknown as { glyphs: Record<string, unknown> }).glyphs.ü).toBeUndefined();
  });
});
