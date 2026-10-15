import { describe, expect, it } from "vitest";
import { automaticSideCount, MIN_AUTOMATIC_SIDES, ROUND_DEVIATION_TOLERANCE, roundSideCount } from "@/lib/roundSideCount";
import { MAX_HIGH_RESOLUTION_SIDES } from "@/lib/workplaneSettings";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";

/** Wie weit das Vieleck vom Kreis abweicht - die Pfeilhoehe des Abschnitts. */
function deviation(diameter: number, sides: number) {
  const radius = diameter / 2;
  return radius * (1 - Math.cos(Math.PI / sides));
}

describe("automatic side count", () => {
  it.each([2, 6, 20, 60, 120, 200, 400])("stays inside the tolerance at %i mm", (diameter) => {
    const sides = automaticSideCount(diameter, diameter);
    expect(sides).toBeGreaterThanOrEqual(MIN_AUTOMATIC_SIDES);
    expect(sides).toBeLessThanOrEqual(MAX_HIGH_RESOLUTION_SIDES);
    if (sides < MAX_HIGH_RESOLUTION_SIDES && sides > MIN_AUTOMATIC_SIDES) {
      expect(deviation(diameter, sides)).toBeLessThanOrEqual(ROUND_DEVIATION_TOLERANCE + 1e-9);
      // Und nicht unnoetig fein: eine Stufe groeber reisst die Grenze.
      expect(deviation(diameter, sides - 4)).toBeGreaterThan(ROUND_DEVIATION_TOLERANCE);
    }
  });

  it("grows with the body instead of standing still", () => {
    const small = automaticSideCount(20, 20);
    const large = automaticSideCount(200, 200);
    expect(large).toBeGreaterThan(small);
    // Was bisher fest eingestellt war, bleibt fuer uebliche Teile erhalten.
    expect(small).toBeGreaterThanOrEqual(96);
    // Die laengere Achse gibt den Ausschlag, nicht der Mittelwert.
    expect(automaticSideCount(200, 20)).toBe(automaticSideCount(200, 200));
  });

  it("lets a set number win over the automatic one", () => {
    expect(roundSideCount(12, 200, 200)).toBe(12);
    expect(roundSideCount(undefined, 200, 200)).toBe(automaticSideCount(200, 200));
  });

  // Der Ring steht nicht in der Formenleiste, nur im Format - daher hier nicht.
  it.each(["cylinder", "cone", "tube"] as const)("gives a fresh %s no fixed number", (kind) => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === kind);
    expect(asset).toBeDefined();
    const shape = makeShapeFromAsset(asset!, { x: 0, z: 0 });
    expect(shape.sides).toBeUndefined();

    // Eine eingetragene Vorgabe haelt sie dagegen fest.
    const pinned = makeShapeFromAsset(asset!, { x: 0, z: 0 }, { sides: 32 });
    expect(pinned.sides).toBe(32);
  });

  it("leaves the angular shapes alone", () => {
    // Beim Mehrkant und bei der Pyramide ist die Seitenzahl die Aussage,
    // nicht die Aufloesung - sie darf nicht mitwandern.
    for (const [kind, expected] of [["polygon", 6], ["pyramid", 4]] as const) {
      const asset = toolbarShapeAssets.find((entry) => entry.kind === kind);
      expect(makeShapeFromAsset(asset!, { x: 0, z: 0 }).sides).toBe(expected);
    }
  });
});
