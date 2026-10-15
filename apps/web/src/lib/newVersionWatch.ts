import { cleanText, compareVersions, isText as isLocalizedText, type WhatsNewText } from "@/lib/whatsNew";

/**
 * An open page noticing that layerling was updated behind its back. Every export carries a
 * version.json (scripts/generate-service-worker.mjs) whose `build` changes with the program's
 * content. The page asks for it when it starts and again now and then; a different build means a
 * deploy happened, and the page offers to reload before it loads something of the new version
 * that does not fit the old one.
 */
export interface VersionInfo {
  version: string;
  build: string;
  highlights: Array<{ version: string; title: WhatsNewText }>;
}

export const VERSION_FILE = "/version.json";

/** How often an open page asks, and how long "Later" holds the offer back. */
export const VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;
export const VERSION_LATER_MS = 15 * 60 * 1000;

const isText = (value: unknown): value is string => typeof value === "string" && value.length > 0;

export function parseVersionInfo(value: unknown): VersionInfo | null {
  if (typeof value !== "object" || value === null) return null;
  const { version, build, highlights } = value as Record<string, unknown>;
  if (!isText(version) || !isText(build)) return null;
  const items = Array.isArray(highlights) ? highlights : [];
  return {
    version,
    build,
    highlights: items.flatMap((item) => {
      if (typeof item !== "object" || item === null) return [];
      const { version: entryVersion, title } = item as Record<string, unknown>;
      const text = title as Record<string, unknown> | null;
      if (!isText(entryVersion) || typeof text !== "object" || text === null || !isLocalizedText(text)) return [];
      return [{ version: entryVersion, title: cleanText(text) }];
    }),
  };
}

/** The file as the server has it now: past the browser's own cache, null when there is none. */
export async function fetchVersionInfo(fetchFn: typeof fetch = fetch, now: number = Date.now()): Promise<VersionInfo | null> {
  try {
    const response = await fetchFn(`${VERSION_FILE}?t=${now}`, { cache: "no-store" });
    if (!response.ok) return null;
    return parseVersionInfo(await response.json());
  } catch {
    return null;
  }
}

/** True when the server holds another build than the one this page started with. */
export function isNewBuild(started: VersionInfo, latest: VersionInfo) {
  return started.build !== latest.build;
}

/** What came after the version this page runs, newest first (titles only). */
export function highlightsAfter(current: string, latest: VersionInfo) {
  return latest.highlights.filter((entry) => compareVersions(entry.version, current) > 0);
}

/** Errors of an old page that asks for a file the deploy has removed. */
export function looksLikeMissingProgramFile(message: string) {
  return /ChunkLoadError|Loading chunk|Loading CSS chunk|worker failed to start|Failed to fetch dynamically imported module/i.test(message);
}
