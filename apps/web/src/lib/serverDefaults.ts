import { APP_THEME_OPTIONS, type AppThemePreference } from "@/lib/appTheme";

/**
 * What the server a copy of layerling runs on suggests for people who have not chosen yet. The
 * Node build answers on this route from its environment (`LAYERLING_DEFAULT_THEME`); an
 * installation served as plain files has no server to ask, so it never does.
 */
export const SERVER_DEFAULTS_ENDPOINT = "/api/server-defaults";
export const DEFAULT_THEME_ENV = "LAYERLING_DEFAULT_THEME";
/** `true` makes new designs start on the server for people who have not chosen; `always` makes it so for everyone (#316). */
export const NEW_DESIGNS_ON_SERVER_ENV = "LAYERLING_NEW_DESIGNS_ON_SERVER";

export type NewDesignsOnServerSetting = "on" | "always";
export type ServerDefaults = { theme: AppThemePreference | null; newDesignsOnServer: NewDesignsOnServerSetting | null };

/** What an operator wrote for the new designs: "always", a yes in one of its usual spellings, or nothing. */
export function parseNewDesignsOnServer(value: unknown): NewDesignsOnServerSetting | null {
  if (typeof value !== "string") return null;
  const wanted = value.trim().toLowerCase();
  if (wanted === "always") return "always";
  return ["true", "1", "yes", "on"].includes(wanted) ? "on" : null;
}

/** The theme an operator wrote in the setting, or null when it is empty or not one of ours. */
export function parseDefaultTheme(value: unknown): AppThemePreference | null {
  if (typeof value !== "string") return null;
  const wanted = value.trim().toLowerCase();
  return APP_THEME_OPTIONS.find((option) => option.value === wanted)?.value ?? null;
}

/** The answer of the route: what the environment holds today. */
export function serverDefaultsFromEnvironment(environment: Record<string, string | undefined>): ServerDefaults {
  return {
    theme: parseDefaultTheme(environment[DEFAULT_THEME_ENV]),
    newDesignsOnServer: parseNewDesignsOnServer(environment[NEW_DESIGNS_ON_SERVER_ENV]),
  };
}

/**
 * Asks the server for its defaults. Any failure - no route on static hosting, an offline server,
 * an answer that is not ours - is simply "no suggestion".
 */
export async function fetchServerDefaults(
  fetchImpl: typeof fetch = fetch,
  endpoint: string = SERVER_DEFAULTS_ENDPOINT,
): Promise<ServerDefaults> {
  const none: ServerDefaults = { theme: null, newDesignsOnServer: null };
  try {
    // A POST, because that is what makes the Node build answer it on every call (see the route).
    const response = await fetchImpl(endpoint, { method: "POST", cache: "no-store" });
    if (!response.ok) return none;
    const body = (await response.json()) as { theme?: unknown; newDesignsOnServer?: unknown } | null;
    return {
      theme: parseDefaultTheme(body?.theme),
      newDesignsOnServer: body?.newDesignsOnServer === "on" || body?.newDesignsOnServer === "always" ? body.newDesignsOnServer : null,
    };
  } catch {
    return none;
  }
}

export async function fetchServerDefaultTheme(
  fetchImpl: typeof fetch = fetch,
  endpoint: string = SERVER_DEFAULTS_ENDPOINT,
): Promise<AppThemePreference | null> {
  return (await fetchServerDefaults(fetchImpl, endpoint)).theme;
}
