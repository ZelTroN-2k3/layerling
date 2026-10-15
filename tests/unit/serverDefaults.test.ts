import { describe, expect, it, vi } from "vitest";
import { hasStoredAppTheme } from "@/lib/appTheme";
import { fetchServerDefaultTheme, fetchServerDefaults, parseDefaultTheme, parseNewDesignsOnServer, serverDefaultsFromEnvironment } from "@/lib/serverDefaults";

/*
 * LAYERLING_DEFAULT_THEME (#278): what a server suggests to people who have not chosen a theme.
 */
describe("the default theme a server suggests", () => {
  it("knows the four themes, however the operator wrote them", () => {
    expect(parseDefaultTheme("dark")).toBe("dark");
    expect(parseDefaultTheme(" Graphite ")).toBe("graphite");
    expect(parseDefaultTheme("LIGHT")).toBe("light");
    expect(parseDefaultTheme("system")).toBe("system");
  });

  it("suggests nothing for an empty setting or a theme that does not exist", () => {
    expect(parseDefaultTheme(undefined)).toBeNull();
    expect(parseDefaultTheme("")).toBeNull();
    expect(parseDefaultTheme("purple")).toBeNull();
    expect(parseDefaultTheme(3)).toBeNull();
  });

  it("reads the setting from the environment", () => {
    expect(serverDefaultsFromEnvironment({ LAYERLING_DEFAULT_THEME: "graphite" })).toEqual({ theme: "graphite", newDesignsOnServer: null });
    expect(serverDefaultsFromEnvironment({})).toEqual({ theme: null, newDesignsOnServer: null });
    expect(serverDefaultsFromEnvironment({ LAYERLING_NEW_DESIGNS_ON_SERVER: "always" })).toEqual({ theme: null, newDesignsOnServer: "always" });
  });

  it("takes the server's answer, and nothing from a failure", async () => {
    const answer = (body: unknown, ok = true) => vi.fn(async () => ({ ok, json: async () => body }) as unknown as Response) as unknown as typeof fetch;
    expect(await fetchServerDefaultTheme(answer({ theme: "dark" }))).toBe("dark");
    expect(await fetchServerDefaultTheme(answer({ theme: null }))).toBeNull();
    expect(await fetchServerDefaultTheme(answer({ theme: "purple" }))).toBeNull();
    expect(await fetchServerDefaultTheme(answer(null))).toBeNull();
    expect(await fetchServerDefaultTheme(answer({}, false))).toBeNull();
    expect(await fetchServerDefaultTheme((async () => { throw new Error("offline"); }) as typeof fetch)).toBeNull();
  });
});

describe("new designs on the server (#316)", () => {
  it("knows a yes in its usual spellings, and always", () => {
    for (const yes of ["true", " TRUE ", "1", "yes", "on"]) expect(parseNewDesignsOnServer(yes)).toBe("on");
    expect(parseNewDesignsOnServer("always")).toBe("always");
    expect(parseNewDesignsOnServer(" Always ")).toBe("always");
  });

  it("is nothing for an empty setting, a no, or something else", () => {
    for (const no of [undefined, "", "false", "0", "no", "sometimes", 1, null]) expect(parseNewDesignsOnServer(no)).toBeNull();
  });

  it("takes both answers from the server, and nothing from a failure", async () => {
    const answer = (body: unknown, ok = true) => vi.fn(async () => ({ ok, json: async () => body }) as unknown as Response) as unknown as typeof fetch;
    expect(await fetchServerDefaults(answer({ theme: "dark", newDesignsOnServer: "always" }))).toEqual({ theme: "dark", newDesignsOnServer: "always" });
    expect(await fetchServerDefaults(answer({ newDesignsOnServer: "on" }))).toEqual({ theme: null, newDesignsOnServer: "on" });
    expect(await fetchServerDefaults(answer({ newDesignsOnServer: "sometimes" }))).toEqual({ theme: null, newDesignsOnServer: null });
    expect(await fetchServerDefaults(answer({}, false))).toEqual({ theme: null, newDesignsOnServer: null });
    expect(await fetchServerDefaults((async () => { throw new Error("offline"); }) as typeof fetch)).toEqual({ theme: null, newDesignsOnServer: null });
  });
});

describe("a theme on record", () => {
  it("is there once something is stored, even 'system'", () => {
    const store = (value: string | null) => ({ getItem: () => value });
    expect(hasStoredAppTheme(store(null))).toBe(false);
    expect(hasStoredAppTheme(store("system"))).toBe(true);
    expect(hasStoredAppTheme(store("dark"))).toBe(true);
    expect(hasStoredAppTheme(null)).toBe(false);
    expect(hasStoredAppTheme({ getItem: () => { throw new Error("blocked"); } })).toBe(true);
  });
});
