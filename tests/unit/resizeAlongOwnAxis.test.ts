import { describe, expect, it } from "vitest";
import { directionIsOwnShapeAxis } from "@/lib/geometryRotation";

// Forum 617212 (Fratercula): eine Skizze auf der rechten Seitenflaeche eines
// Quaders (Drehung 90/0/270), dann am Hoehengriff von 10 auf 61 mm gezogen.
// Der Griff backte das Netz ein und setzte die Drehung auf 0 - "Skizze
// bearbeiten" legte die Skizze danach auf die Grundebene. Zieht der Griff
// entlang einer eigenen Achse, bleibt es jetzt bei einem Mass.
describe("directionIsOwnShapeAxis", () => {
  const sideSketch = { rotationX: 90, rotation: 0, rotationZ: 270 };

  it("finds the extrusion axis of a sketch body on the right side face", () => {
    expect(directionIsOwnShapeAxis(sideSketch, { x: 1, y: 0, z: 0 })).toBe(true);
    expect(directionIsOwnShapeAxis(sideSketch, { x: -1, y: 0, z: 0 })).toBe(true);
  });

  it("finds the other two axes as well", () => {
    expect(directionIsOwnShapeAxis(sideSketch, { x: 0, y: 1, z: 0 })).toBe(true);
    expect(directionIsOwnShapeAxis(sideSketch, { x: 0, y: 0, z: 1 })).toBe(true);
  });

  it("rejects a slanted pull, which still has to bake", () => {
    expect(directionIsOwnShapeAxis(sideSketch, { x: 1, y: 1, z: 0 })).toBe(false);
    expect(directionIsOwnShapeAxis({ rotation: 30 }, { x: 1, y: 0, z: 0 })).toBe(false);
  });

  it("ignores a zero direction", () => {
    expect(directionIsOwnShapeAxis({ rotation: 0 }, { x: 0, y: 0, z: 0 })).toBe(false);
  });
});
