import { LANGUAGES, type Language } from "@/lib/languages";
import whatsNewData from "./whatsNew.json";

/**
 * "What is new since your last visit": the highlights of each release, written
 * for the people who use layerling, in both languages. The changelog stays the
 * complete (English, technical) record; this list is the short version a
 * returning visitor reads once. It is written by hand with every release: a few
 * lines for what a user can do now that they could not before, and only rarely
 * for a fix.
 */
/** A text in English and in as many other languages as were written; the others read the English one. */
export type WhatsNewText = { en: string } & Partial<Record<Language, string>>;
export type WhatsNewItem = { title: WhatsNewText; body: WhatsNewText };
export type WhatsNewEntry = { version: string; items: WhatsNewItem[] };

/**
 * The highlights of every release, newest first. An entry shows from the moment
 * the program reaches its version. They live in whatsNew.json next to this file. That
 * file is also what an installation fetches from GitHub, in the version of the
 * release tag, to preview an update before it is installed - so it is a plain
 * data file and is updated with every release.
 */
export const WHATS_NEW: readonly WhatsNewEntry[] = whatsNewData as WhatsNewEntry[];

/**
 * How many versions at most the card lists. Releases come often, so a visitor
 * who was away for a while should still see all of it; versions without an
 * entry (plain fixes) do not count.
 */
export const WHATS_NEW_MAX_VERSIONS = 20;

/** How many versions "What is new?" lists when opened by hand: as many as after a long absence. */
export const WHATS_NEW_MANUAL_VERSIONS = WHATS_NEW_MAX_VERSIONS;

/**
 * The version before this feature came with it: a browser that already holds
 * designs but has never seen the card is taken to have last been here then, so
 * the first update after it brings the list.
 */
export const WHATS_NEW_BASELINE = "1.42.0";

export function parseVersion(version: string): [number, number, number] | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(version.trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/** Negative when `a` is older than `b`; 0 when equal or when either is no version number. */
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return 0;
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

/** The entries after `lastSeen` up to and including `current`, newest first, at most `limit`. */
export function whatsNewSince(
  lastSeen: string,
  current: string,
  entries: readonly WhatsNewEntry[] = WHATS_NEW,
  limit = WHATS_NEW_MAX_VERSIONS,
): WhatsNewEntry[] {
  return entries
    .filter((entry) => compareVersions(entry.version, lastSeen) > 0 && compareVersions(entry.version, current) <= 0)
    .sort((a, b) => compareVersions(b.version, a.version))
    .slice(0, limit);
}

/** The entries older than `version`, newest first: what came before the versions a card shows. */
export function whatsNewBefore(version: string, entries: readonly WhatsNewEntry[] = WHATS_NEW): WhatsNewEntry[] {
  return entries
    .filter((entry) => compareVersions(entry.version, version) < 0)
    .sort((a, b) => compareVersions(b.version, a.version));
}

/** The newest entries up to `current`, for opening the list again when nothing is new. */
export function latestWhatsNew(current: string, entries: readonly WhatsNewEntry[] = WHATS_NEW, limit = WHATS_NEW_MANUAL_VERSIONS): WhatsNewEntry[] {
  return entries
    .filter((entry) => compareVersions(entry.version, current) <= 0)
    .sort((a, b) => compareVersions(b.version, a.version))
    .slice(0, limit);
}

/**
 * Which version this browser last saw, or null for a visitor who has never been
 * here (who is told nothing and just gets the current version remembered).
 */
export function lastSeenVersion(stored: string | null, hasDesigns: boolean): string | null {
  if (stored && parseVersion(stored)) return stored.trim();
  return hasDesigns ? WHATS_NEW_BASELINE : null;
}

export function isText(value: unknown): value is WhatsNewText {
  if (!value || typeof value !== "object") return false;
  const { en } = value as Record<string, unknown>;
  return typeof en === "string" && en.trim() !== "";
}

/** The English text and every other language's text that is a real string, nothing else. */
export function cleanText(value: WhatsNewText): WhatsNewText {
  const cleaned: WhatsNewText = { en: value.en };
  for (const language of LANGUAGES) {
    const text = (value as Partial<Record<Language, unknown>>)[language];
    if (language !== "en" && typeof text === "string" && text.trim() !== "") cleaned[language] = text;
  }
  return cleaned;
}

/**
 * The entries of a whatsNew.json that came from the network. Anything that is
 * not exactly the expected shape is dropped, so a broken or foreign file shows
 * nothing rather than something wrong; at most `limit` entries are kept.
 */
export function parseWhatsNewEntries(value: unknown, limit = 200): WhatsNewEntry[] {
  if (!Array.isArray(value)) return [];
  const entries: WhatsNewEntry[] = [];
  for (const candidate of value.slice(0, limit)) {
    if (!candidate || typeof candidate !== "object") continue;
    const { version, items } = candidate as Record<string, unknown>;
    if (typeof version !== "string" || !parseVersion(version) || !Array.isArray(items)) continue;
    const valid = items
      .slice(0, 20)
      .filter((item): item is WhatsNewItem => Boolean(item) && typeof item === "object" && isText((item as WhatsNewItem).title) && isText((item as WhatsNewItem).body))
      .map((item) => ({ title: cleanText(item.title), body: cleanText(item.body) }));
    if (valid.length > 0) entries.push({ version, items: valid });
  }
  return entries;
}
