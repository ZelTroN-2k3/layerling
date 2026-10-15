/**
 * Arabic and Hebrew in the text shape (#294).
 *
 * The typeface format draws one glyph per character, left to right. Arabic reads right to left,
 * and its letters change shape with their neighbours: ع at the start of عربي is not the ع that
 * stands alone. A font carries those shapes as separate glyphs, and the Unicode block "Arabic
 * Presentation Forms" (U+FB50–U+FEFF) gives each of them a character of its own. `shapeText`
 * turns a text into the string of characters that draws it: every letter replaced by the form
 * its place asks for, lam + alef by their ligature, and the whole put into the order the
 * letters stand in from left to right. The typeface then draws it as it draws any text.
 *
 * The forms come from the font: fonts list them in their character map, or `customFonts.ts`
 * reads them from the font's shaping rules (GSUB init/medi/fina) when it converts the file.
 * A form the font lacks falls back to the plain letter.
 */

/** [isolated, final, initial, medial] presentation forms of a letter; an initial or medial of 0 means the letter joins there but has no form of its own. */
type Forms = readonly [number, number] | readonly [number, number, number, number];

const DUAL = 4;

/** The letters that join to their neighbours, with their presentation forms (Unicode's ArabicShaping, joining types D and R). */
const FORMS: Record<string, Forms> = {
  "آ": [0xfe81, 0xfe82],
  "أ": [0xfe83, 0xfe84],
  "ؤ": [0xfe85, 0xfe86],
  "إ": [0xfe87, 0xfe88],
  "ئ": [0xfe89, 0xfe8a, 0xfe8b, 0xfe8c],
  "ا": [0xfe8d, 0xfe8e],
  "ب": [0xfe8f, 0xfe90, 0xfe91, 0xfe92],
  "ة": [0xfe93, 0xfe94],
  "ت": [0xfe95, 0xfe96, 0xfe97, 0xfe98],
  "ث": [0xfe99, 0xfe9a, 0xfe9b, 0xfe9c],
  "ج": [0xfe9d, 0xfe9e, 0xfe9f, 0xfea0],
  "ح": [0xfea1, 0xfea2, 0xfea3, 0xfea4],
  "خ": [0xfea5, 0xfea6, 0xfea7, 0xfea8],
  "د": [0xfea9, 0xfeaa],
  "ذ": [0xfeab, 0xfeac],
  "ر": [0xfead, 0xfeae],
  "ز": [0xfeaf, 0xfeb0],
  "س": [0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4],
  "ش": [0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8],
  "ص": [0xfeb9, 0xfeba, 0xfebb, 0xfebc],
  "ض": [0xfebd, 0xfebe, 0xfebf, 0xfec0],
  "ط": [0xfec1, 0xfec2, 0xfec3, 0xfec4],
  "ظ": [0xfec5, 0xfec6, 0xfec7, 0xfec8],
  "ع": [0xfec9, 0xfeca, 0xfecb, 0xfecc],
  "غ": [0xfecd, 0xfece, 0xfecf, 0xfed0],
  "ـ": [0x0640, 0x0640, 0x0640, 0x0640],
  "ف": [0xfed1, 0xfed2, 0xfed3, 0xfed4],
  "ق": [0xfed5, 0xfed6, 0xfed7, 0xfed8],
  "ك": [0xfed9, 0xfeda, 0xfedb, 0xfedc],
  "ل": [0xfedd, 0xfede, 0xfedf, 0xfee0],
  "م": [0xfee1, 0xfee2, 0xfee3, 0xfee4],
  "ن": [0xfee5, 0xfee6, 0xfee7, 0xfee8],
  "ه": [0xfee9, 0xfeea, 0xfeeb, 0xfeec],
  "و": [0xfeed, 0xfeee],
  "ى": [0xfeef, 0xfef0, 0xfbe8, 0xfbe9],
  "ي": [0xfef1, 0xfef2, 0xfef3, 0xfef4],
  "ٱ": [0xfb50, 0xfb51],
  "ٹ": [0xfb66, 0xfb67, 0xfb68, 0xfb69],
  "پ": [0xfb56, 0xfb57, 0xfb58, 0xfb59],
  "چ": [0xfb7a, 0xfb7b, 0xfb7c, 0xfb7d],
  "ڈ": [0xfb88, 0xfb89],
  "ڑ": [0xfb8c, 0xfb8d],
  "ژ": [0xfb8a, 0xfb8b],
  "ک": [0xfb8e, 0xfb8f, 0xfb90, 0xfb91],
  "گ": [0xfb92, 0xfb93, 0xfb94, 0xfb95],
  "ں": [0xfb9e, 0xfb9f, 0, 0],
  "ھ": [0xfbaa, 0xfbab, 0xfbac, 0xfbad],
  "ہ": [0xfba6, 0xfba7, 0xfba8, 0xfba9],
  "ی": [0xfbfc, 0xfbfd, 0xfbfe, 0xfbff],
  "ے": [0xfbae, 0xfbaf],
};

/** Lam followed by an alef: the ligature's [isolated, final] forms. */
const LAM_ALEF: Record<string, readonly [number, number]> = {
  "آ": [0xfef5, 0xfef6],
  "أ": [0xfef7, 0xfef8],
  "إ": [0xfef9, 0xfefa],
  "ا": [0xfefb, 0xfefc],
};
const LAM = "ل";
const ZERO_WIDTH_JOINER = "‍";
const ZERO_WIDTH_NON_JOINER = "‌";

/** Scripts written right to left: Hebrew, Arabic and its extensions, Syriac, Thaana, and the presentation forms. */
const RTL = /[֐-׿؀-ۿ܀-ݏݐ-ݿހ-޿ࢠ-ࣿיִ-﷿ﹰ-﻿]/u;
const MARK = /^\p{Mn}$/u;
const LETTER_OR_DIGIT = /^[\p{L}\p{N}]$/u;
const MIRRORED: Record<string, string> = { "(": ")", ")": "(", "[": "]", "]": "[", "{": "}", "}": "{", "<": ">", ">": "<", "«": "»", "»": "«" };

/** The presentation forms a letter can take, for the font conversion: [isolated, final, initial, medial] codes, 0 for none. */
export function arabicLetterForms(): ReadonlyArray<{ letter: string; forms: readonly number[] }> {
  return Object.entries(FORMS)
    .filter(([letter]) => letter !== "ـ")
    .map(([letter, forms]) => ({ letter, forms: [forms[0], forms[1], forms[2] ?? 0, forms[3] ?? 0] }));
}

/** The lam-alef ligatures, for the font conversion: the alef and the [isolated, final] codes. */
export function lamAlefLigatures(): ReadonlyArray<{ alef: string; forms: readonly [number, number] }> {
  return Object.entries(LAM_ALEF).map(([alef, forms]) => ({ alef, forms }));
}

/** Whether a text holds anything written right to left - only then is it shaped. */
export function textNeedsShaping(text: string) {
  return RTL.test(text);
}

type Dir = "L" | "R" | "N";

/** The direction a character is read in: strong right to left, strong left to right (letters and digits), or neutral. */
function directionOf(char: string): Dir {
  const code = char.codePointAt(0) ?? 0;
  // Digits keep their left-to-right order inside Arabic text.
  if ((code >= 0x0660 && code <= 0x0669) || (code >= 0x06f0 && code <= 0x06f9)) return "L";
  // Arabic comma, semicolon, question mark, per-mille signs and full stop are punctuation.
  if (code === 0x060c || code === 0x061b || code === 0x061f || (code >= 0x066a && code <= 0x066d) || code === 0x06d4) return "N";
  if (RTL.test(char)) return "R";
  return LETTER_OR_DIGIT.test(char) ? "L" : "N";
}

/** Whether a letter joins to the one after it (dual-joining), judged by the letter alone. */
function joinsNext(char: string) {
  return char === ZERO_WIDTH_JOINER || FORMS[char]?.length === DUAL;
}

/** Whether a letter joins to the one before it (dual- or right-joining). */
function joinsPrevious(char: string) {
  return char === ZERO_WIDTH_JOINER || char in FORMS;
}

/**
 * The characters that draw `text` in a typeface that knows the presentation forms: each Arabic
 * letter in the form its neighbours give it, lam + alef as one ligature, every stretch of
 * right-to-left text turned round so the first letter stands on the right. `hasGlyph` says
 * which characters the typeface draws; a form it lacks stays the plain letter, so a font
 * without Arabic shapes still shows the letters in the right order. Text without right-to-left
 * characters comes back unchanged.
 */
export function shapeText(text: string, hasGlyph: (char: string) => boolean = () => true): string {
  if (!textNeedsShaping(text)) return text;
  // Letters with their marks: a mark follows its letter and is skipped when looking for neighbours.
  const letters: string[] = [];
  const marksAfter: string[][] = [];
  Array.from(text).forEach((char) => {
    if (MARK.test(char) && letters.length) marksAfter[letters.length - 1].push(char);
    else {
      letters.push(char);
      marksAfter.push([]);
    }
  });

  // Contextual forms, in logical order.
  const shaped: Array<{ char: string; marks: string[]; dir: Dir }> = [];
  for (let index = 0; index < letters.length; index += 1) {
    const char = letters[index];
    if (char === ZERO_WIDTH_JOINER || char === ZERO_WIDTH_NON_JOINER) continue;
    const forms = FORMS[char];
    const dir = directionOf(char);
    if (!forms) {
      shaped.push({ char, marks: marksAfter[index], dir });
      continue;
    }
    const previous = index > 0 ? letters[index - 1] : "";
    const next = index + 1 < letters.length ? letters[index + 1] : "";
    const joinedBefore = previous !== "" && joinsNext(previous);
    const joinedAfter = forms.length === DUAL && next !== "" && joinsPrevious(next);
    if (char === LAM && next in LAM_ALEF) {
      const ligature = String.fromCodePoint(LAM_ALEF[next][joinedBefore ? 1 : 0]);
      if (hasGlyph(ligature)) {
        shaped.push({ char: ligature, marks: [...marksAfter[index], ...marksAfter[index + 1]], dir });
        index += 1;
        continue;
      }
    }
    const code = joinedBefore && joinedAfter ? forms[3] : joinedBefore ? forms[1] : joinedAfter ? forms[2] : forms[0];
    const form = code ? String.fromCodePoint(code) : char;
    shaped.push({ char: hasGlyph(form) ? form : char, marks: marksAfter[index], dir });
  }

  // Direction of the line: that of its first letter. Neutrals between two runs of one direction
  // belong to it, any other neutral reads the line's way.
  const lineDir: "L" | "R" = shaped.find((entry) => entry.dir !== "N")?.dir === "R" ? "R" : "L";
  const resolved: Array<"L" | "R"> = shaped.map((entry) => (entry.dir === "N" ? lineDir : entry.dir));
  for (let index = 0; index < shaped.length; index += 1) {
    if (shaped[index].dir !== "N") continue;
    let end = index;
    while (end < shaped.length && shaped[end].dir === "N") end += 1;
    const before: Dir = index > 0 ? shaped[index - 1].dir : lineDir;
    const after: Dir = end < shaped.length ? shaped[end].dir : lineDir;
    const dir: "L" | "R" = before === after && before !== "N" ? before : lineDir;
    for (let fill = index; fill < end; fill += 1) resolved[fill] = dir;
    index = end - 1;
  }

  // Runs of one direction; a right-to-left run reads backwards, and so does the line when it is right to left.
  const runs: Array<{ dir: "L" | "R"; entries: typeof shaped }> = [];
  shaped.forEach((entry, index) => {
    const dir = resolved[index];
    const last = runs[runs.length - 1];
    if (last && last.dir === dir) last.entries.push(entry);
    else runs.push({ dir, entries: [entry] });
  });
  const ordered = lineDir === "R" ? [...runs].reverse() : runs;
  let result = "";
  ordered.forEach((run) => {
    const entries = run.dir === "R" ? [...run.entries].reverse() : run.entries;
    entries.forEach((entry) => {
      result += (run.dir === "R" ? MIRRORED[entry.char] ?? entry.char : entry.char) + entry.marks.join("");
    });
  });
  return result;
}
