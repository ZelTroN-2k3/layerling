import { describe, expect, it } from "vitest";
import { analyseCatalogue } from "../../scripts/i18n-status.mjs";
import { effectiveChapters } from "../../scripts/build-guide.mjs";
import { createCatalogueStore } from "@/lib/i18n";
import { LANGUAGE_INFO, LANGUAGES, isLanguage, languageFromTag } from "@/lib/languages";
import { MESSAGES_EN } from "@/lib/messages.en";

/*
 * Further languages (#141): a language is an entry in languages.ts, a messages file and a guide
 * folder. These tests hold every language to the rules, whether it is complete or still on its
 * way, and cover the parts that make a language that is not built in work - fetching its sentences
 * when chosen, English where it has none, English chapters in its guide.
 */

const FILES = import.meta.glob("../../apps/web/src/lib/messages.*.ts", { eager: true }) as Record<string, Record<string, Record<string, string>>>;

function catalogueOf(language: string) {
  const entry = Object.entries(FILES).find(([path]) => path.endsWith(`/messages.${language}.ts`));
  return entry ? entry[1][`MESSAGES_${language.toUpperCase()}`] : undefined;
}

describe("the language registry", () => {
  it("has English as the language everything falls back to, and an entry for every language", () => {
    expect(LANGUAGES[0]).toBe("en");
    for (const language of LANGUAGES) {
      const info = LANGUAGE_INFO[language];
      expect(info.name.trim(), language).not.toBe("");
      expect(info.htmlLang, language).toMatch(/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/);
      expect(info.numberLocale, language).toMatch(/^[a-z]{2,3}-[A-Z]{2}$/);
      expect(info.guideDir, language).toMatch(/^[a-z-]+$/);
      expect(info.communityUrl, language).toMatch(/^https:\/\//);
      expect(info.quotes, language).toHaveLength(2);
    }
  });

  it("gives every language its own guide folder", () => {
    const folders = LANGUAGES.map((language) => LANGUAGE_INFO[language].guideDir);
    expect(new Set(folders).size).toBe(folders.length);
  });

  it("has a messages file for every language, and no file for one that is not registered", () => {
    for (const language of LANGUAGES) expect(catalogueOf(language), language).toBeDefined();
    const files = Object.keys(FILES).map((path) => /messages\.([a-z-]+)\.ts$/.exec(path)![1]);
    for (const code of files) expect(isLanguage(code), `messages.${code}.ts is not in languages.ts`).toBe(true);
  });

  it("says English where a language writes none of the words of its guide pages", () => {
    for (const language of LANGUAGES) {
      for (const [key, value] of Object.entries(LANGUAGE_INFO[language].guide)) expect(value.trim(), `${language}.guide.${key}`).not.toBe("");
    }
  });

  it("recognises a browser's language by its primary tag", () => {
    for (const language of LANGUAGES) expect(languageFromTag(`${language.toUpperCase()}-xx`)).toBe(language);
  });
});

describe("what every language's sentences must be", () => {
  for (const language of LANGUAGES.filter((code) => code !== "en")) {
    it(`${language}: no sentence without an English original, no empty one, matching placeholders`, () => {
      const analysis = analyseCatalogue(MESSAGES_EN, catalogueOf(language)!);
      expect(analysis.unknown, "sentences the English catalogue no longer has").toEqual([]);
      expect(analysis.empty, "empty sentences").toEqual([]);
      expect(analysis.mismatched, "placeholders that differ from English").toEqual([]);
    });

    if (LANGUAGE_INFO[language].complete) {
      it(`${language}: complete, so every sentence is there`, () => {
        expect(analyseCatalogue(MESSAGES_EN, catalogueOf(language)!).missing).toEqual([]);
      });
    }
  }
});

describe("the status of a catalogue", () => {
  const english = { "a.one": "One {name}", "a.two": "Two", "a.three": "Three {x} {y}" };

  it("counts what is missing", () => {
    const analysis = analyseCatalogue(english, { "a.one": "Eins {name}" });
    expect(analysis.total).toBe(3);
    expect(analysis.translated).toBe(1);
    expect(analysis.missing).toEqual(["a.two", "a.three"]);
  });

  it("finds a sentence the English no longer has, an empty one and a placeholder that differs", () => {
    const analysis = analyseCatalogue(english, { "a.one": "Eins {nom}", "a.two": " ", "a.four": "Vier", "a.three": "Drei {y} {x}" });
    expect(analysis.unknown).toEqual(["a.four"]);
    expect(analysis.empty).toEqual(["a.two"]);
    expect(analysis.mismatched).toEqual(["a.one"]);
  });
});

describe("a language that is fetched when chosen", () => {
  const unit = { "common.save": "Speichern" } as Record<string, string>;

  it("is not loaded until asked for, and then has its sentences", async () => {
    let fetched = 0;
    const store = createCatalogueStore({ en: MESSAGES_EN }, { xx: async () => { fetched += 1; return unit; } });
    expect(store.isLoaded("xx")).toBe(false);
    await store.load("xx");
    expect(store.isLoaded("xx")).toBe(true);
    expect(store.text("xx", "common.save")).toBe("Speichern");
    expect(fetched).toBe(1);
  });

  it("fetches once however often and however quickly it is asked for", async () => {
    let fetched = 0;
    const store = createCatalogueStore({ en: MESSAGES_EN }, { xx: async () => { fetched += 1; return unit; } });
    await Promise.all([store.load("xx"), store.load("xx"), store.load("xx")]);
    await store.load("xx");
    expect(fetched).toBe(1);
  });

  it("shows the English sentence where the language has none, and the key as the last resort", async () => {
    const store = createCatalogueStore({ en: MESSAGES_EN }, { xx: async () => unit });
    await store.load("xx");
    expect(store.text("xx", "common.cancel")).toBe(MESSAGES_EN["common.cancel"]);
    expect(store.text("xx", "does.not.exist" as never)).toBe("does.not.exist");
  });

  it("refuses a language it has no way to fetch, and may try again after a failed fetch", async () => {
    let attempt = 0;
    const store = createCatalogueStore({ en: MESSAGES_EN }, {
      xx: async () => {
        attempt += 1;
        if (attempt === 1) throw new Error("offline");
        return unit;
      },
    });
    await expect(store.load("yy")).rejects.toThrow();
    await expect(store.load("xx")).rejects.toThrow("offline");
    expect(store.isLoaded("xx")).toBe(false);
    await store.load("xx");
    expect(store.isLoaded("xx")).toBe(true);
  });
});

describe("the chapters of a guide", () => {
  const chapter = (number: string, slug: string) => ({ number, slug, file: `${number}-${slug}.md`, title: slug, summary: "", body: "" });
  const english = [chapter("01", "start"), chapter("02", "view"), chapter("03", "shapes")];

  it("is the English guide for a language that translated nothing yet, all chapters marked", () => {
    const merged = effectiveChapters("xx", { en: english, xx: [] });
    expect(merged.map((entry) => entry.slug)).toEqual(["start", "view", "shapes"]);
    expect(merged.every((entry) => entry.fallback)).toBe(true);
  });

  it("takes a language's own chapters and the English ones for the rest", () => {
    const own = [{ ...chapter("02", "view"), title: "Ansicht" }];
    const merged = effectiveChapters("xx", { en: english, xx: own });
    expect(merged.map((entry) => [entry.number, entry.title, entry.fallback])).toEqual([
      ["01", "start", true],
      ["02", "Ansicht", false],
      ["03", "shapes", true],
    ]);
  });

  it("keeps a chapter only that language has, in its place by number", () => {
    const merged = effectiveChapters("xx", { en: english, xx: [chapter("04", "extra")] });
    expect(merged.map((entry) => entry.number)).toEqual(["01", "02", "03", "04"]);
    expect(merged[3].fallback).toBe(false);
  });

  it("never marks English text as a fallback", () => {
    expect(effectiveChapters("en", { en: english }).some((entry) => entry.fallback)).toBe(false);
  });
});
