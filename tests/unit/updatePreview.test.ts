import { describe, expect, it } from "vitest";
import { fetchUpdatePreview, whatsNewFileUrl } from "@/lib/updatePreview";
import { parseWhatsNewEntries } from "@/lib/whatsNew";

const item = (title: string) => ({ title: { de: `${title} de`, en: `${title} en` }, body: { de: "Text de", en: "Text en" } });
const FILE = [
  { version: "1.44.0", items: [item("Neu A")] },
  { version: "1.43.0", items: [item("Neu B"), item("Neu C")] },
  { version: "1.42.0", items: [item("Alt")] },
];

function responding(body: unknown, ok = true) {
  const calls: string[] = [];
  const fetchFn = (async (url: string) => {
    calls.push(url);
    return { ok, json: async () => body } as Response;
  }) as unknown as typeof fetch;
  return { fetchFn, calls };
}

describe("whatsNewFileUrl", () => {
  it("points at the file in the version of the release tag", () => {
    expect(whatsNewFileUrl("v1.44.0", "https://github.com/henmedia/layerling")).toBe(
      "https://raw.githubusercontent.com/henmedia/layerling/v1.44.0/apps/web/src/lib/whatsNew.json",
    );
    expect(whatsNewFileUrl("1.44.0", "https://github.com/henmedia/layerling/")).toContain("/1.44.0/apps/web/");
    expect(whatsNewFileUrl("v1.44.0", "https://github.com/someone/fork.git")).toContain("/someone/fork/v1.44.0/");
  });

  it("refuses a source that is not on GitHub and a tag that is not a version", () => {
    expect(whatsNewFileUrl("v1.44.0", "https://git.example.org/layerling")).toBeNull();
    expect(whatsNewFileUrl("v1.44.0", "not a url")).toBeNull();
    expect(whatsNewFileUrl("main", "https://github.com/henmedia/layerling")).toBeNull();
    expect(whatsNewFileUrl("v1.44.0/../../x", "https://github.com/henmedia/layerling")).toBeNull();
  });
});

describe("parseWhatsNewEntries", () => {
  it("keeps well-formed entries and drops everything else", () => {
    const parsed = parseWhatsNewEntries([
      ...FILE,
      { version: "later", items: [item("X")] },
      { version: "1.41.0", items: [{ title: { de: "nur deutsch" }, body: { de: "x", en: "y" } }] },
      { version: "1.40.0", items: [] },
      "nonsense",
      null,
    ]);
    expect(parsed.map((entry) => entry.version)).toEqual(["1.44.0", "1.43.0", "1.42.0"]);
  });

  it("returns nothing for something that is not a list", () => {
    expect(parseWhatsNewEntries({ version: "1.0.0" })).toEqual([]);
    expect(parseWhatsNewEntries(null)).toEqual([]);
  });

  it("copies only the known fields", () => {
    const [entry] = parseWhatsNewEntries([{ version: "1.44.0", extra: "x", items: [{ ...item("A"), html: "<b>x</b>" }] }]);
    expect(Object.keys(entry)).toEqual(["version", "items"]);
    expect(Object.keys(entry.items[0])).toEqual(["title", "body"]);
  });
});

describe("fetchUpdatePreview", () => {
  it("lists what lies between the running version and the new one, newest first", async () => {
    const { fetchFn, calls } = responding(FILE);
    const entries = await fetchUpdatePreview("v1.44.0", "1.42.0", { fetchFn, sourceCodeUrl: "https://github.com/henmedia/layerling" });
    expect(entries?.map((entry) => entry.version)).toEqual(["1.44.0", "1.43.0"]);
    expect(calls).toEqual(["https://raw.githubusercontent.com/henmedia/layerling/v1.44.0/apps/web/src/lib/whatsNew.json"]);
  });

  it("leaves out versions the release itself does not reach", async () => {
    const { fetchFn } = responding(FILE);
    const entries = await fetchUpdatePreview("v1.43.0", "1.42.0", { fetchFn, sourceCodeUrl: "https://github.com/henmedia/layerling" });
    expect(entries?.map((entry) => entry.version)).toEqual(["1.43.0"]);
  });

  it("answers with an empty list when the release brings nothing for people", async () => {
    const { fetchFn } = responding(FILE);
    expect(await fetchUpdatePreview("v1.44.0", "1.44.0", { fetchFn, sourceCodeUrl: "https://github.com/henmedia/layerling" })).toEqual([]);
  });

  it("answers null when the file cannot be had, so the notice stays as it was", async () => {
    expect(await fetchUpdatePreview("v1.44.0", "1.42.0", { ...responding({}, false), sourceCodeUrl: "https://github.com/henmedia/layerling" })).toBeNull();
    const failing = (async () => { throw new Error("offline"); }) as unknown as typeof fetch;
    expect(await fetchUpdatePreview("v1.44.0", "1.42.0", { fetchFn: failing, sourceCodeUrl: "https://github.com/henmedia/layerling" })).toBeNull();
    expect(await fetchUpdatePreview("v1.44.0", "1.42.0", { ...responding(FILE), sourceCodeUrl: "https://git.example.org/x" })).toBeNull();
  });
});
