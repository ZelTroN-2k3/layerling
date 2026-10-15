import { describe, expect, it } from "vitest";
import { shapeText, textNeedsShaping } from "@/lib/arabicShaping";

/*
 * Arabic and Hebrew in the text shape (#294): the letters take the form their neighbours give
 * them, lam + alef become a ligature, and right-to-left text is turned round so the typeface,
 * which draws left to right, puts the first letter on the right.
 */

const chars = (text: string) => Array.from(text).map((char) => char.codePointAt(0)!.toString(16));

describe("shapeText", () => {
  it("leaves text without right-to-left letters alone", () => {
    expect(textNeedsShaping("Hello Grüße 123")).toBe(false);
    expect(shapeText("Hello Grüße 123")).toBe("Hello Grüße 123");
  });

  it("gives عربي its initial, final, initial and final forms and turns the word round", () => {
    expect(textNeedsShaping("عربي")).toBe(true);
    // ع joins the ر after it (initial); ر joins only backwards (final); ب starts again (initial); ي ends (final).
    expect(chars(shapeText("عربي"))).toEqual(["fef2", "fe91", "feae", "fecb"]);
  });

  it("uses the medial form between two joining letters", () => {
    // سبب: س initial, ب medial, ب final.
    expect(chars(shapeText("سبب"))).toEqual(["fe90", "fe92", "feb3"]);
  });

  it("keeps a Latin line in its order and turns only the Arabic word inside it", () => {
    expect(shapeText("Name عربي")).toBe("Name " + "ﻲﺑﺮﻋ");
  });

  it("puts digits at the left of an Arabic line, read left to right", () => {
    expect(shapeText("عربي 123")).toBe("123 " + "ﻲﺑﺮﻋ");
  });

  it("draws lam + alef as the ligature when the font has it, else as two joined letters", () => {
    expect(chars(shapeText("لا"))).toEqual(["fefb"]);
    expect(chars(shapeText("بلا"))).toEqual(["fefc", "fe91"]);
    expect(chars(shapeText("لا", (char) => char !== "ﻻ"))).toEqual(["fe8e", "fedf"]);
  });

  it("falls back to the plain letters, in reading order, when the font has no forms", () => {
    expect(shapeText("عربي", (char) => char.codePointAt(0)! < 0xfb00)).toBe("يبرع");
  });

  it("turns Hebrew round without changing its letters", () => {
    expect(shapeText("שלום")).toBe("םולש");
  });

  it("keeps a vowel mark after its letter when the word is turned round", () => {
    // عَ with fatha, then ربي: the mark must still follow the ع it belongs to.
    const shaped = shapeText("عَربي");
    expect(shaped.endsWith("ﻋَ")).toBe(true);
    expect(chars(shaped)).toEqual(["fef2", "fe91", "feae", "fecb", "64e"]);
  });

  it("mirrors brackets round an Arabic word", () => {
    const shaped = shapeText("(عربي)");
    expect(shaped.startsWith("(")).toBe(true);
    expect(shaped.endsWith(")")).toBe(true);
  });

  it("drops the zero-width joiner and non-joiner but honours what they ask", () => {
    // A non-joiner between ب and ب keeps both isolated.
    expect(chars(shapeText("ب‌ب"))).toEqual(["fe8f", "fe8f"]);
    // A joiner after a lone ب gives it its initial form.
    expect(chars(shapeText("ب‍"))).toEqual(["fe91"]);
  });
});
