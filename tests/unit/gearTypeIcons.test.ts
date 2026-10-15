import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * Every gear type has a button in the inspector, and the button is a picture. A type added without
 * one shows a black square (#277: the herringbone gear in 1.67.0).
 */
describe("gear type pictures", () => {
  const root = join(__dirname, "..", "..");
  const source = readFileSync(join(root, "apps/web/src/types/layerling.ts"), "utf8");
  const declaration = source.match(/export type GearType = ([^;]+);/);

  it("finds the gear types", () => {
    expect(declaration).not.toBeNull();
  });

  it("has a picture for each gear type", () => {
    const types = [...(declaration?.[1] ?? "").matchAll(/"(\w+)"/g)].map((match) => match[1]);
    expect(types.length).toBeGreaterThanOrEqual(6);
    const missing = types.filter((type) => !existsSync(join(root, `apps/web/public/assets/editor/gear-types/${type}.png`)));
    expect(missing).toEqual([]);
  });
});
