import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const guideEnDir = join(root, "docs", "guide", "en");
const guideFrDir = join(root, "docs", "guide", "fr");
const cacheFile = join(root, "scripts", "guide-fr-cache.json");

let cache = {};
if (existsSync(cacheFile)) {
  try {
    cache = JSON.parse(readFileSync(cacheFile, "utf8"));
  } catch {
    cache = {};
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateText(text) {
  if (!text || !text.trim()) return text;
  if (cache[text]) return cache[text];

  const url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t&q=" + encodeURIComponent(text);
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const result = json[0].map((s) => s[0]).join("");
  cache[text] = result;
  return result;
}

function refineCAD(text) {
  return text
    .replace(/\bfilets?\b/gi, (m) => m[0] === 'F' ? 'Congé' : 'congé')
    .replace(/\bFilets?\b/g, 'Congés')
    .replace(/\bchanfreiner\b/gi, 'chanfreiner')
    .replace(/\bplateau de travail\b/gi, 'plan de travail')
    .replace(/\bplan de travail\b/gi, 'plan de travail');
}

async function translateBlock(block) {
  if (!block.trim()) return block;

  const tokens = [];
  const addToken = (raw) => {
    const id = tokens.length;
    tokens.push(raw);
    return `XYZTOK_${id}_XYZ`;
  };

  let work = block;

  // Protect code blocks
  work = work.replace(/```[\s\S]*?```/g, (m) => addToken(m));

  // Protect {{ui:...}} and {{value:...}}
  work = work.replace(/\{\{ui:[A-Za-z0-9_.-]+\}\}/g, (m) => addToken(m));
  work = work.replace(/\{\{value:[A-Za-z0-9_]+\}\}/g, (m) => addToken(m));

  // Protect [[...]]
  work = work.replace(/\[\[[^\]]+\]\]/g, (m) => addToken(m));

  // Protect inline code
  work = work.replace(/`[^`]+`/g, (m) => addToken(m));

  // Protect links: preserve targets
  work = work.replace(/!\[([^\]]*)\]\((shot:[^)]+)\)/g, (_, alt, target) => {
    return `![${alt}](${addToken(target)})`;
  });
  work = work.replace(/\[([^\]]+)\]\((chapter:[^)]+)\)/g, (_, label, target) => {
    return `[${label}](${addToken(target)})`;
  });
  work = work.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_, label, target) => {
    return `[${label}](${addToken(target)})`;
  });

  // Now translate text with tokens
  let translated;
  try {
    translated = await translateText(work);
  } catch (err) {
    console.warn(`Translation error, retrying: ${err.message}`);
    await sleep(500);
    translated = await translateText(work);
  }

  // Restore tokens
  translated = translated.replace(/XYZTOK\s*_\s*(\d+)\s*_\s*XYZ/gi, (_, id) => {
    return tokens[Number(id)] ?? "";
  });

  translated = refineCAD(translated);
  return translated;
}

async function translateChapter(filename) {
  console.log(`Translating chapter: ${filename}...`);
  const content = readFileSync(join(guideEnDir, filename), "utf8");

  // Check frontmatter
  const fmMatch = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(content);
  if (!fmMatch) {
    console.warn(`No frontmatter in ${filename}`);
    return;
  }

  const fmLines = fmMatch[1].split(/\r?\n/);
  const body = fmMatch[2];

  let title = "";
  let summary = "";
  for (const line of fmLines) {
    const t = /^title:\s*(.*)$/.exec(line);
    if (t) title = t[1].trim().replace(/^"(.*)"$/, "$1");
    const s = /^summary:\s*(.*)$/.exec(line);
    if (s) summary = s[1].trim().replace(/^"(.*)"$/, "$1");
  }

  const trTitle = title ? await translateText(title) : "";
  const trSummary = summary ? await translateText(summary) : "";

  // Split body into blocks separated by blank lines
  const rawBlocks = body.split(/\n\s*\n/);
  const trBlocks = [];

  for (let i = 0; i < rawBlocks.length; i++) {
    const blk = rawBlocks[i];
    // Check if table or code block or header or regular
    const tr = await translateBlock(blk);
    trBlocks.push(tr);
    await sleep(50);
  }

  const newContent = [
    "---",
    `title: ${trTitle}`,
    `summary: ${trSummary}`,
    "---",
    "",
    trBlocks.join("\n\n"),
    "",
  ].join("\n");

  writeFileSync(join(guideFrDir, filename), newContent, "utf8");
  writeFileSync(cacheFile, JSON.stringify(cache, null, 2), "utf8");
  console.log(`Saved ${filename}`);
}

async function main() {
  const files = readdirSync(guideEnDir).filter((f) => /^\d+-.+\.md$/.test(f)).sort();

  for (const f of files) {
    if (f === "01-getting-started.md") {
      console.log(`Skipping ${f} (already translated)`);
      continue;
    }
    await translateChapter(f);
    await sleep(200);
  }
  console.log("All chapters finished!");
}

main().catch(console.error);
