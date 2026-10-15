import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/*
 * #210: an <input type="number"> reads the decimal mark by the browser's language - a German
 * browser refused "12.5" in the section view's position. Fields for measures are text fields
 * read by parseMeasurementInput, which takes comma, point, fractions and sums. Only whole
 * counts may stay number fields.
 */
const ALLOWED = new Set(["WorkspaceSettingsModal.tsx"]);

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : path.endsWith(".tsx") ? [path] : [];
  });
}

describe("measure fields", () => {
  it("are no number inputs, outside the settings' whole counts", () => {
    const root = fileURLToPath(new URL("../../apps/web/src", import.meta.url));
    const offenders = sources(root)
      .filter((path) => !ALLOWED.has(path.split(/[\\/]/).pop() ?? ""))
      .filter((path) => readFileSync(path, "utf8").includes('type="number"'));
    expect(offenders).toEqual([]);
  });
});
