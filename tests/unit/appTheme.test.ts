import { describe, expect, it, vi } from "vitest";
import {
  APP_THEME_STORAGE_KEY,
  applyAppTheme,
  appThemePalette,
  GRAPHITE_STYLESHEET_HREF,
  GRAPHITE_STYLESHEET_ID,
  normalizeAppThemePreference,
  readStoredAppTheme,
  resolveAppTheme,
  storeAppTheme,
} from "@/lib/appTheme";

describe("application theme preference", () => {
  it("normalizes stored values and resolves the system theme", () => {
    expect(normalizeAppThemePreference("light")).toBe("light");
    expect(normalizeAppThemePreference("dark")).toBe("dark");
    expect(normalizeAppThemePreference("unexpected")).toBe("system");
    expect(resolveAppTheme("system", true)).toBe("dark");
    expect(resolveAppTheme("system", false)).toBe("light");
    expect(resolveAppTheme("light", true)).toBe("light");
  });

  it("persists the selected preference and safely falls back for invalid storage", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };

    storeAppTheme(storage, "dark");
    expect(values.get(APP_THEME_STORAGE_KEY)).toBe("dark");
    expect(readStoredAppTheme(storage)).toBe("dark");
    values.set(APP_THEME_STORAGE_KEY, "neon");
    expect(readStoredAppTheme(storage)).toBe("system");
  });

  it("offers graphite as a dark theme with a neutral palette", () => {
    expect(normalizeAppThemePreference("graphite")).toBe("graphite");
    expect(resolveAppTheme("graphite", false)).toBe("dark");
    expect(resolveAppTheme("graphite", true)).toBe("dark");
    expect(appThemePalette("graphite")).toBe("graphite");
    expect(appThemePalette("dark")).toBe("default");
    expect(appThemePalette("system")).toBe("default");
  });

  it("links the graphite stylesheet only once graphite is chosen, and only once", () => {
    const appended: Array<{ id: string; rel: string; href: string }> = [];
    const root = { dataset: {} as Record<string, string>, style: {} as Record<string, string> };
    const fakeDocument = {
      documentElement: root,
      head: { appendChild: (node: { id: string; rel: string; href: string }) => appended.push(node) },
      createElement: () => ({ id: "", rel: "", href: "" }),
      getElementById: (id: string) => appended.find((node) => node.id === id) ?? null,
    };
    vi.stubGlobal("document", fakeDocument);
    try {
      applyAppTheme("dark", false);
      expect(appended).toHaveLength(0);
      expect(root.dataset.palette).toBeUndefined();
      applyAppTheme("graphite", false);
      applyAppTheme("graphite", true);
      expect(appended).toEqual([{ id: GRAPHITE_STYLESHEET_ID, rel: "stylesheet", href: GRAPHITE_STYLESHEET_HREF }]);
      expect(root.dataset).toMatchObject({ theme: "dark", palette: "graphite" });
      applyAppTheme("light", false);
      expect(root.dataset.palette).toBeUndefined();
      expect(root.dataset.theme).toBe("light");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("links the graphite stylesheet from the site root, versioned with the app", async () => {
    // Relative, it resolved against the current URL and missed on any page not
    // at the root; unversioned, a cached copy from an older release could stay.
    expect(GRAPHITE_STYLESHEET_HREF.startsWith("/assets/theme/graphite-theme.css")).toBe(true);
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_APP_VERSION", "1.18.5");
    try {
      const theme = await import("@/lib/appTheme");
      expect(theme.GRAPHITE_STYLESHEET_HREF).toBe("/assets/theme/graphite-theme.css?v=1.18.5");
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
