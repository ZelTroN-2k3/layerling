export const APP_THEME_STORAGE_KEY = "layerling.theme";

export const APP_THEME_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "graphite", label: "Graphite" },
] as const;

export type AppThemePreference = (typeof APP_THEME_OPTIONS)[number]["value"];
/**
 * Graphite is the dark theme with neutral grey surfaces instead of the warm
 * brown ones. It resolves to "dark", so everything that only asks light or
 * dark keeps working; the palette on top only swaps colours.
 */
export type ResolvedAppTheme = "light" | "dark";
export type AppThemePalette = "default" | "graphite";

export function appThemePalette(preference: AppThemePreference): AppThemePalette {
  return preference === "graphite" ? "graphite" : "default";
}

export function normalizeAppThemePreference(value: unknown): AppThemePreference {
  return value === "light" || value === "dark" || value === "graphite" || value === "system" ? value : "system";
}

export function resolveAppTheme(preference: AppThemePreference, prefersDark: boolean): ResolvedAppTheme {
  if (preference === "system") return prefersDark ? "dark" : "light";
  return preference === "graphite" ? "dark" : preference;
}

export function readStoredAppTheme(storage: Pick<Storage, "getItem"> | null | undefined): AppThemePreference {
  if (!storage) return "system";
  try {
    return normalizeAppThemePreference(storage.getItem(APP_THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

/** Whether this browser has a theme on record, even "system": someone chose it, or it has been applied before. */
export function hasStoredAppTheme(storage: Pick<Storage, "getItem"> | null | undefined): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(APP_THEME_STORAGE_KEY) !== null;
  } catch {
    return true;
  }
}

export function storeAppTheme(
  storage: Pick<Storage, "setItem"> | null | undefined,
  preference: AppThemePreference,
) {
  if (!storage) return;
  try {
    storage.setItem(APP_THEME_STORAGE_KEY, preference);
  } catch {
    // The selected theme still applies for this session when storage is unavailable.
  }
}

export function applyAppTheme(preference: AppThemePreference, prefersDark?: boolean) {
  if (typeof document === "undefined") return;
  const systemPrefersDark = prefersDark ?? (
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false
  );
  const resolved = resolveAppTheme(preference, systemPrefersDark);
  document.documentElement.dataset.theme = resolved;
  const palette = appThemePalette(preference);
  if (palette === "default") delete document.documentElement.dataset.palette;
  else document.documentElement.dataset.palette = palette;
  document.documentElement.style.colorScheme = resolved;
  if (palette === "graphite") ensureGraphiteStylesheet();
}

export const GRAPHITE_STYLESHEET_ID = "layerling-graphite-theme";
// Root-relative like every other asset: a relative path resolved against the
// current URL and missed on any page not at the root (the 404 page, say). The
// version query keeps a cached stylesheet from an older release out, since
// the file is regenerated from globals.css under the same name every build.
const appVersion = process.env.NEXT_PUBLIC_APP_VERSION;
export const GRAPHITE_STYLESHEET_HREF = `/assets/theme/graphite-theme.css${appVersion ? `?v=${appVersion}` : ""}`;

/**
 * Graphite's colours live in a generated stylesheet that is only fetched once
 * someone picks the theme. It goes last in <head> so it follows globals.css;
 * its rules only match while data-palette="graphite" is set, so it can stay
 * when the theme is switched away again.
 */
function ensureGraphiteStylesheet() {
  if (document.getElementById(GRAPHITE_STYLESHEET_ID)) return;
  const link = document.createElement("link");
  link.id = GRAPHITE_STYLESHEET_ID;
  link.rel = "stylesheet";
  link.href = GRAPHITE_STYLESHEET_HREF;
  document.head.appendChild(link);
}

const themeListeners = new Set<() => void>();
let currentThemePreference: AppThemePreference =
  typeof window !== "undefined" ? readStoredAppTheme(window.localStorage) : "system";

if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handleMediaChange = () => {
    if (currentThemePreference === "system") {
      applyAppTheme("system", media.matches);
      themeListeners.forEach((listener) => listener());
    }
  };
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", handleMediaChange);
  } else if (typeof (media as unknown as { addListener?: (cb: () => void) => void }).addListener === "function") {
    (media as unknown as { addListener: (cb: () => void) => void }).addListener(handleMediaChange);
  }
}

export function subscribeToAppTheme(listener: () => void) {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
}

export function getAppThemePreference(): AppThemePreference {
  return currentThemePreference;
}

export function setAppTheme(preference: AppThemePreference, persist = true) {
  currentThemePreference = preference;
  if (persist && typeof window !== "undefined") {
    storeAppTheme(window.localStorage, preference);
  }
  applyAppTheme(preference);
  themeListeners.forEach((listener) => listener());
}

