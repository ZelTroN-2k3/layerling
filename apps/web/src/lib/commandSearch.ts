/**
 * The search behind the command palette (Ctrl+K). Plain functions, no React, so
 * the ranking can be tested on its own.
 */

/** What the search needs to know about a command. */
export type SearchableCommand = {
  label: string;
  /** The toolbar group the command lives in, searchable too ("Messen", "Modify"). */
  group: string;
  /** Extra words people may type - synonyms in both languages. */
  keywords?: readonly string[];
  /** A command that cannot run right now still shows up, just after equal hits. */
  enabled?: boolean;
};

/** How many recently used commands the empty search lists first. */
export const RECENT_COMMAND_LIMIT = 5;

/** The list of recently used command ids after running `id`: newest first, no duplicates, capped. */
export function rememberCommand(recent: readonly string[], id: string, limit = RECENT_COMMAND_LIMIT): string[] {
  return [id, ...recent.filter((entry) => entry !== id)].slice(0, limit);
}

/**
 * Lower case, without accents, so "aushöhlen", "AUSHOEHLEN" and "aushohlen"
 * find the same thing. Two spellings of every word are searched: umlauts
 * spelled out (ö -> oe, the way the guide writes them) and umlauts reduced to
 * their base letter (ö -> o, the way most people type on a foreign keyboard).
 */
function foldUmlautsOut(text: string) {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

function foldAccents(text: string) {
  return text
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function words(text: string) {
  return text.split(/[^a-z0-9]+/).filter(Boolean);
}

/** The words of a text in both spellings, de-duplicated. */
export function searchWords(text: string): string[] {
  return [...new Set([...words(foldUmlautsOut(text)), ...words(foldAccents(text))])];
}

/** The tokens of a typed query, in both spellings of every token. */
function queryTokens(query: string): string[][] {
  return query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => [...new Set([foldUmlautsOut(token).replace(/[^a-z0-9]/g, ""), foldAccents(token).replace(/[^a-z0-9]/g, "")])].filter(Boolean))
    .filter((spellings) => spellings.length > 0);
}

function tokenScore(spellings: string[], labelWords: string[], keywordWords: string[], groupWords: string[]) {
  let best = 0;
  for (const token of spellings) {
    for (const word of labelWords) {
      if (word === token) best = Math.max(best, 6);
      else if (word.startsWith(token)) best = Math.max(best, 5);
      else if (word.includes(token)) best = Math.max(best, 3);
    }
    for (const word of keywordWords) {
      if (word === token) best = Math.max(best, 5);
      else if (word.startsWith(token)) best = Math.max(best, 4);
      else if (word.includes(token)) best = Math.max(best, 2);
    }
    for (const word of groupWords) {
      if (word.startsWith(token)) best = Math.max(best, 1);
    }
  }
  return best;
}

/**
 * The commands that match every word of the query, best first: a word that a
 * label starts with beats one that merely appears inside it, a keyword beats a
 * group name, and among equal scores a command that can run comes first and the
 * original order (the order of the toolbar) decides the rest. An empty query
 * returns everything in the original order.
 */
export function searchCommands<T extends SearchableCommand>(commands: readonly T[], query: string): T[] {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return [...commands];
  const scored: { command: T; score: number; index: number }[] = [];
  commands.forEach((command, index) => {
    const labelWords = searchWords(command.label);
    const keywordWords = searchWords((command.keywords ?? []).join(" "));
    const groupWords = searchWords(command.group);
    let total = 0;
    for (const spellings of tokens) {
      const score = tokenScore(spellings, labelWords, keywordWords, groupWords);
      if (score === 0) return;
      total += score;
    }
    scored.push({ command, score: total, index });
  });
  return scored
    .sort((a, b) => b.score - a.score || Number(b.command.enabled !== false) - Number(a.command.enabled !== false) || a.index - b.index)
    .map((entry) => entry.command);
}
