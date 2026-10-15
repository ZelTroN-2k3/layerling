import { describe, expect, it } from "vitest";
import { makeShapeFromAsset } from "@/lib/shapeCatalog";
import { shapeDefaultsAsset, shapeDefaultsFromShape, withShapeDefaults } from "@/lib/shapeDefaults";
import { normalizeWorkspaceSettings } from "@/lib/workplaneSettings";

function shapeOf(kind: Parameters<typeof shapeDefaultsAsset>[0], patch: Record<string, unknown> = {}) {
  const asset = shapeDefaultsAsset(kind);
  if (!asset) throw new Error(`no asset for ${kind}`);
  return { ...makeShapeFromAsset(asset), ...patch };
}

describe("saving a shape's values as its defaults", () => {
  it("has nothing to save for a shape that is as the app starts it", () => {
    expect(shapeDefaultsFromShape(shapeOf("box"))).toBeNull();
    expect(shapeDefaultsFromShape(shapeOf("cone"))).toBeNull();
  });

  it("keeps size and own settings that differ from the app's start", () => {
    const cone = shapeDefaultsFromShape(shapeOf("cone", { height: 40, topRadius: 3 }));
    expect(cone).toMatchObject({ height: 40, topRadius: 3 });
    // What was not changed is not stored, so the kind still follows the app for it.
    expect(cone).not.toHaveProperty("baseRadius");
    const star = shapeDefaultsFromShape(shapeOf("star", { starPoints: 8 }));
    expect(star).toMatchObject({ starPoints: 8 });
  });

  it("keeps the size limit that was set in the settings", () => {
    const entry = shapeDefaultsFromShape(shapeOf("box", { height: 33 }), { box: { maxDimension: 500 } });
    expect(entry).toMatchObject({ height: 33, maxDimension: 500 });
  });

  it("has no defaults for a shape that is no toolbar shape", () => {
    expect(shapeDefaultsAsset("sketch")).toBeNull();
    expect(shapeDefaultsAsset("mesh")).toBeNull();
  });

  it("sets and removes the entry of one kind without touching the others", () => {
    const map = { cone: { height: 40 }, box: { height: 12 } };
    expect(withShapeDefaults(map, "cone", { height: 41 })).toEqual({ cone: { height: 41 }, box: { height: 12 } });
    expect(withShapeDefaults(map, "cone", null)).toEqual({ box: { height: 12 } });
    expect(map.cone).toEqual({ height: 40 });
  });

  it("starts a new shape with the saved defaults and survives the settings round trip", () => {
    const entry = shapeDefaultsFromShape(shapeOf("cone", { height: 40, topRadius: 3 }));
    const settings = normalizeWorkspaceSettings({ shapeCustomizations: { cone: entry } });
    const asset = shapeDefaultsAsset("cone");
    if (!asset) throw new Error("no cone asset");
    const fresh = makeShapeFromAsset(asset, undefined, settings.shapeCustomizations.cone);
    expect(fresh.height).toBe(40);
    expect(fresh.topRadius).toBe(3);
  });
});
