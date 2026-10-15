import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  GRAPHITE_SOURCE,
  GRAPHITE_TARGET,
  graphiteColors,
  graphiteGrey,
  graphiteSelector,
  graphiteThemeCss,
} from "../../scripts/generate-graphite-theme.mjs";

const root = path.resolve(__dirname, "../..");
const source = readFileSync(path.join(root, GRAPHITE_SOURCE), "utf8");

function warmNeutralsIn(css: string) {
  const found = new Set<string>();
  for (const match of css.matchAll(/#[0-9a-fA-F]{6}\b/g)) {
    const [r, g, b] = [1, 3, 5].map((index) => parseInt(match[0].slice(index, index + 2), 16));
    if (graphiteGrey(r, g, b)) found.add(match[0].toLowerCase());
  }
  return [...found];
}

describe("graphite theme", () => {
  it("is up to date with globals.css (run `npm run theme:graphite` after colour changes)", () => {
    expect(readFileSync(path.join(root, GRAPHITE_TARGET), "utf8")).toBe(graphiteThemeCss(source));
  });

  it("turns warm neutrals grey and leaves accents and cool colours alone", () => {
    expect(graphiteColors("#2b2116")).toBe("#262626");
    expect(graphiteColors("#f5f0e8")).toBe("#efefef");
    expect(graphiteColors("rgba(64, 52, 40, 0.7)")).toBe("rgba(56, 56, 56, 0.7)");
    expect(graphiteColors("#7a6652")).toBe("#5a5a5a");
    // Orange accents, cool colours and true greys pass through untouched.
    expect(graphiteColors("#dd7906")).toBe("#dd7906");
    expect(graphiteColors("#f3a452")).toBe("#f3a452");
    expect(graphiteColors("#69d9ff")).toBe("#69d9ff");
    expect(graphiteColors("#2d2d2d")).toBe("#2d2d2d");
    expect(graphiteColors("color-mix(in srgb, var(--group-color) 22%, #2b2116)")).toBe("color-mix(in srgb, var(--group-color) 22%, #262626)");
  });

  it("only matches in graphite and never adds specificity", () => {
    expect(graphiteSelector('html[data-theme="dark"] .panel')).toBe('html[data-theme="dark"]:where([data-palette="graphite"]) .panel');
    expect(graphiteSelector(":root")).toBe(':root:where([data-theme="dark"][data-palette="graphite"])');
    expect(graphiteSelector("html")).toBe('html:where([data-theme="dark"][data-palette="graphite"])');
    expect(graphiteSelector(".inspector .label:hover")).toBe(':where(html[data-theme="dark"][data-palette="graphite"]) .inspector .label:hover');
  });

  it("leaves no brown or beige in its repeated rules", () => {
    const generated = graphiteThemeCss(source);
    expect(warmNeutralsIn(generated)).toEqual([]);
    // Every dark-theme selector has its graphite twin.
    const darkSelectors = source.match(/html\[data-theme="dark"\]/g)?.length ?? 0;
    const twins = generated.match(/html\[data-theme="dark"\]:where\(\[data-palette="graphite"\]\)/g)?.length ?? 0;
    expect(twins).toBeGreaterThan(0);
    expect(twins).toBeLessThanOrEqual(darkSelectors);
    expect(generated).not.toContain('html[data-theme="light"]');
  });
});
