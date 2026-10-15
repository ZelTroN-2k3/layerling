import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Where each language stands: how many of the interface's sentences it has, which are missing,
// which of its sentences have no English original any more, whose {placeholders} do not match,
// and how many guide chapters it has translated.
//
//   npm run i18n:status              a table, one line per language
//   npm run i18n:status -- ru        the missing sentences of one language, with their English text
//
// The exit code is 1 when something is wrong that a translator has to fix: a sentence the English
// catalogue no longer has, a mismatching placeholder, an empty sentence - and, for a language
// that is marked complete in languages.ts, a missing sentence or chapter. A language that is not
// complete may be missing sentences; it shows the English ones in their place.
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const library = join(root, "apps", "web", "src", "lib");

const placeholders = (text) => [...String(text).matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

/** What is wrong, missing and fine in `catalogue` measured against the English `english`. */
export function analyseCatalogue(english, catalogue) {
  const englishKeys = Object.keys(english);
  const own = Object.keys(catalogue);
  const missing = englishKeys.filter((key) => catalogue[key] === undefined);
  const unknown = own.filter((key) => english[key] === undefined);
  const empty = own.filter((key) => english[key] !== undefined && String(catalogue[key]).trim() === "");
  const mismatched = own.filter((key) => english[key] !== undefined && JSON.stringify(placeholders(english[key])) !== JSON.stringify(placeholders(catalogue[key])));
  return {
    total: englishKeys.length,
    translated: englishKeys.length - missing.length,
    missing,
    unknown,
    empty,
    mismatched,
  };
}

/** The guide chapters of a language by their number, against the English ones. */
export async function analyseGuide(language) {
  const chapters = async (code) => {
    const directory = join(root, "docs", "guide", code);
    if (!existsSync(directory)) return [];
    return (await readdir(directory)).filter((name) => /^\d+-.+\.md$/.test(name)).map((name) => name.split("-")[0]).sort();
  };
  const english = await chapters("en");
  const own = await chapters(language);
  return { total: english.length, translated: english.filter((number) => own.includes(number)).length };
}

async function load(file, name) {
  const module = await import(pathToFileURL(join(library, file)).href);
  return module[name];
}

export async function loadRegistry() {
  const module = await import(pathToFileURL(join(library, "languages.ts")).href);
  return { languages: module.LANGUAGES, info: module.LANGUAGE_INFO };
}

export async function statusOfAll() {
  const { languages, info } = await loadRegistry();
  const english = await load("messages.en.ts", "MESSAGES_EN");
  const rows = [];
  for (const language of languages) {
    if (language === "en") continue;
    const catalogue = await load(`messages.${language}.ts`, `MESSAGES_${language.toUpperCase()}`);
    const analysis = analyseCatalogue(english, catalogue);
    const guide = await analyseGuide(language);
    const problems = [];
    if (analysis.unknown.length) problems.push(`${analysis.unknown.length} sentence(s) without an English original`);
    if (analysis.mismatched.length) problems.push(`${analysis.mismatched.length} placeholder mismatch(es)`);
    if (analysis.empty.length) problems.push(`${analysis.empty.length} empty sentence(s)`);
    if (info[language].complete) {
      if (analysis.missing.length) problems.push(`${analysis.missing.length} missing sentence(s)`);
      if (guide.translated < guide.total) problems.push(`${guide.total - guide.translated} missing guide chapter(s)`);
    }
    rows.push({ language, name: info[language].name, complete: info[language].complete, analysis, guide, problems });
  }
  return { english, rows };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const { english, rows } = await statusOfAll();
  const wanted = process.argv[2];
  if (wanted) {
    const row = rows.find((entry) => entry.language === wanted);
    if (!row) {
      console.error(`No language "${wanted}". Known: ${rows.map((entry) => entry.language).join(", ") || "(only English)"}`);
      process.exit(2);
    }
    for (const key of row.analysis.missing) console.log(`${key}\n    ${String(english[key]).replace(/\n/g, " ")}`);
    for (const key of row.analysis.unknown) console.log(`${key}\n    (no English original any more: remove it)`);
    for (const key of row.analysis.mismatched) console.log(`${key}\n    (placeholders differ from English)`);
    console.log(`\n${row.name}: ${row.analysis.missing.length} of ${row.analysis.total} sentences missing`);
  } else {
    console.log("language        sentences            guide chapters    complete  problems");
    for (const row of rows) {
      const share = `${row.analysis.translated}/${row.analysis.total}`;
      const percent = `${Math.round((row.analysis.translated / row.analysis.total) * 100)} %`;
      console.log(`${row.language.padEnd(2)} ${row.name.padEnd(12)} ${share.padEnd(11)} ${percent.padStart(5)}      ${`${row.guide.translated}/${row.guide.total}`.padEnd(14)}  ${String(row.complete).padEnd(8)}  ${row.problems.join("; ") || "-"}`);
    }
    if (rows.length === 0) console.log("(only English so far)");
  }
  process.exit(rows.some((row) => row.problems.length > 0) ? 1 : 0);
}
