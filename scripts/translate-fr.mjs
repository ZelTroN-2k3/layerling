import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const messagesEnPath = join(root, "apps", "web", "src", "lib", "messages.en.ts");
const messagesFrPath = join(root, "apps", "web", "src", "lib", "messages.fr.ts");
const cachePath = join(root, "scripts", "translations-fr-cache.json");

// Import MESSAGES_EN
const { MESSAGES_EN } = await import(pathToFileURL(messagesEnPath).href);

const glossaryExact = {
  "common.cancel": "Annuler",
  "common.save": "Enregistrer",
  "common.delete": "Supprimer",
  "common.rename": "Renommer",
  "common.duplicate": "Dupliquer",
  "common.language": "Langue",
  "common.theme": "Thème",
  "theme.short.system": "Système",
  "theme.short.light": "Clair",
  "theme.short.dark": "Sombre",
  "theme.short.graphite": "Graphite",
  "brand.home": "Accueil layerling",
  "brand.tagline": "CAO 3D facile pour l'impression 3D",
  "editor.loading": "Chargement de l'éditeur…",
  "dashboard.createDesign": "Créer un nouveau design 3D",
  "dashboard.searchPlaceholder": "Rechercher des designs",
  "dashboard.searchLabel": "Rechercher des designs",
  "dashboard.projectOnGitHub": "En savoir plus sur le projet sur GitHub",
  "dashboard.userGuide": "Manuel d'utilisation",
  "dashboard.sponsor": "Soutenir le projet",
  "dashboard.sortRecent": "Récents",
  "dashboard.sortName": "Nom",
  "dashboard.viewGrid": "Grille",
  "dashboard.viewList": "Liste",
  "dashboard.emptyTitle": "Aucun design pour l'instant",
  "dashboard.emptyHint": "Créez un design 3D et il apparaîtra ici.",
  "aria.workplane": "Plan de travail",
  "aria.alignmentHandles": "Poignées d'alignement",
  "aria.mirrorHandles": "Poignées de symétrie",
};

let cache = {};
if (existsSync(cachePath)) {
  try {
    cache = JSON.parse(readFileSync(cachePath, "utf8"));
  } catch {
    cache = {};
  }
}

function extractPlaceholders(str) {
  return [...str.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

function protectPlaceholders(str) {
  return str.replace(/\{(\w+)\}/g, (_, name) => `VARPH_${name}_ENDPH`);
}

function restorePlaceholders(str, expectedPhs) {
  let restored = str.replace(/VARPH_(\w+)_ENDPH/gi, (_, name) => `{${name.toLowerCase()}}`);
  restored = restored.replace(/VARPH\s*_\s*(\w+)\s*_\s*ENDPH/gi, (_, name) => `{${name.toLowerCase()}}`);
  restored = restored.replace(/\{(\w+)\s*\}/g, "{$1}").replace(/\{\s*(\w+)\}/g, "{$1}");

  // Verify and fix if needed
  const actualPhs = extractPlaceholders(restored);
  if (JSON.stringify(actualPhs) !== JSON.stringify(expectedPhs)) {
    // If casing mismatch or missing, fix from expectedPhs
    for (const ph of expectedPhs) {
      const regex = new RegExp(`\\{${ph}\\}`, "i");
      if (regex.test(restored)) {
        restored = restored.replace(regex, `{${ph}}`);
      }
    }
  }
  return restored;
}

function refineFrenchCAD(text, key) {
  let res = text;
  // Common mistranslations in CAD context
  if (key.includes("fillet") || key.includes("edge.fillet") || key.includes("sketch.fillet")) {
    res = res.replace(/\bfilets?\b/gi, (m) => m[0] === 'F' ? 'Congé' : 'congé');
    res = res.replace(/\bFilets?\b/g, 'Congés');
  }
  if (key.includes("chamfer")) {
    res = res.replace(/\bchanfreiner\b/gi, "chanfrein");
  }
  return res;
}

async function translateBatch(items) {
  const DELIM = "\n---XYZSPLITXYZ---\n";
  const payload = items.map((it) => protectPlaceholders(it.text)).join(DELIM);
  const url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=fr&dt=t&q=" + encodeURIComponent(payload);

  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const rawTranslated = json[0].map((s) => s[0]).join("");
  const parts = rawTranslated.split(/\n\s*---XYZSPLITXYZ---\s*\n|\n\s*---\s*XYZSPLITXYZ\s*---\s*\n/);
  
  if (parts.length !== items.length) {
    // Delimiter was slightly altered, try regex
    const regexParts = rawTranslated.split(/-+XYZSPLITXYZ-+/i);
    if (regexParts.length === items.length) {
      return regexParts.map((p) => p.trim());
    }
    throw new Error(`Batch count mismatch: expected ${items.length}, got ${parts.length}`);
  }
  return parts.map((p) => p.trim());
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const keys = Object.keys(MESSAGES_EN);
  console.log(`Total keys to process: ${keys.length}`);

  const missingKeys = keys.filter((k) => !cache[k] && !glossaryExact[k]);
  console.log(`Keys needing translation: ${missingKeys.length}`);

  const BATCH_SIZE = 35;
  for (let i = 0; i < missingKeys.length; i += BATCH_SIZE) {
    const chunk = missingKeys.slice(i, i + BATCH_SIZE);
    const items = chunk.map((k) => ({ key: k, text: MESSAGES_EN[k] }));

    try {
      const translatedParts = await translateBatch(items);
      for (let j = 0; j < items.length; j++) {
        const item = items[j];
        const expectedPhs = extractPlaceholders(item.text);
        let restored = restorePlaceholders(translatedParts[j], expectedPhs);
        restored = refineFrenchCAD(restored, item.key);

        // Sanity check placeholders
        const actualPhs = extractPlaceholders(restored);
        if (JSON.stringify(actualPhs) !== JSON.stringify(expectedPhs)) {
          console.warn(`Placeholder mismatch for ${item.key}: expected ${expectedPhs}, got ${actualPhs}. Fallback.`);
          // If mismatch, append missing placeholder
          restored = restored + " " + expectedPhs.filter((p) => !actualPhs.includes(p)).map((p) => `{${p}}`).join(" ");
        }
        cache[item.key] = restored;
      }
      console.log(`Translated ${i + chunk.length} / ${missingKeys.length}`);
      writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf8");
      await sleep(250);
    } catch (err) {
      console.warn(`Batch failed at ${i}: ${err.message}. Retrying individually...`);
      for (const item of items) {
        try {
          const res = await translateBatch([item]);
          const expectedPhs = extractPlaceholders(item.text);
          let restored = restorePlaceholders(res[0], expectedPhs);
          restored = refineFrenchCAD(restored, item.key);
          cache[item.key] = restored;
          await sleep(150);
        } catch (singleErr) {
          console.error(`Failed single ${item.key}: ${singleErr.message}`);
          cache[item.key] = item.text; // fallback
        }
      }
      writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf8");
    }
  }

  // Merge glossary overrides
  for (const [k, v] of Object.entries(glossaryExact)) {
    cache[k] = v;
  }

  // Write messages.fr.ts
  const lines = [
    'import type { MessageKey } from "@/lib/messages.en";',
    "",
    "/**",
    " * French catalogue for layerling interface.",
    " */",
    "export const MESSAGES_FR: Partial<Record<MessageKey, string>> = {",
  ];

  for (const key of keys) {
    if (cache[key]) {
      const escaped = JSON.stringify(cache[key]);
      lines.push(`  ${JSON.stringify(key)}: ${escaped},`);
    }
  }
  lines.push("};");
  lines.push("");

  writeFileSync(messagesFrPath, lines.join("\n"), "utf8");
  console.log(`Successfully written ${messagesFrPath}`);
}

main().catch(console.error);
