import { describe, expect, it } from "vitest";
import { MESSAGES_DE } from "@/lib/messages.de";
import { MESSAGES_EN } from "@/lib/messages.en";
import {
  computeSectionPlaneVector,
  DEFAULT_SECTION_SETTINGS,
  getSectionBounds,
  SECTION_AXES_SHOWN,
  sectionAxisFromLetter,
  sectionAxisLetter,
  sectionFineWindow,
  type SectionAxisLetter,
} from "@/lib/sectionView";
import type { WorkplaneShape } from "@/types/layerling";

function sampleShape(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "box-1",
    name: "Box",
    kind: "box",
    x: 0,
    z: 0,
    elevation: 0,
    width: 20,
    height: 10,
    depth: 30,
    rotation: 0,
    color: "#ff0000",
    ...overrides,
  };
}

describe("sectionView", () => {
  it("defaults to disabled along x axis", () => {
    expect(DEFAULT_SECTION_SETTINGS.enabled).toBe(false);
    expect(DEFAULT_SECTION_SETTINGS.axis).toBe("x");
    expect(DEFAULT_SECTION_SETTINGS.flipped).toBe(false);
  });

  it("calculates bounds for empty shapes using workspace limits", () => {
    const boundsX = getSectionBounds([], "x", 220, 220);
    expect(boundsX.min).toBe(-110);
    expect(boundsX.max).toBe(110);
    expect(boundsX.center).toBe(0);

    const boundsY = getSectionBounds([], "y", 220, 220);
    expect(boundsY.min).toBe(0);
    expect(boundsY.max).toBe(100);
    expect(boundsY.center).toBe(50);
  });

  it("calculates bounds across visible shapes with padding", () => {
    const shape = sampleShape({ x: 10, z: -5, elevation: 5, width: 20, height: 10, depth: 30 });

    const boundsX = getSectionBounds([shape], "x");
    // shape x spans from 10 - 10 = 0 to 10 + 10 = 20. Span = 20. Padding = 1.
    expect(boundsX.min).toBeLessThanOrEqual(0);
    expect(boundsX.max).toBeGreaterThanOrEqual(20);
    expect(boundsX.center).toBe(10);

    const boundsY = getSectionBounds([shape], "y");
    // elevation spans from 5 to 15. Center = 10.
    expect(boundsY.min).toBeLessThanOrEqual(5);
    expect(boundsY.max).toBeGreaterThanOrEqual(15);
    expect(boundsY.center).toBe(10);

    const boundsZ = getSectionBounds([shape], "z");
    // z spans from -5 - 15 = -20 to -5 + 15 = 10. Center = -5.
    expect(boundsZ.min).toBeLessThanOrEqual(-20);
    expect(boundsZ.max).toBeGreaterThanOrEqual(10);
    expect(boundsZ.center).toBe(-5);
  });

  it("ignores hidden shapes", () => {
    const hidden = sampleShape({ id: "h1", hidden: true, x: 500, width: 20 });
    const visible = sampleShape({ id: "v1", x: 0, width: 20 });
    const bounds = getSectionBounds([hidden, visible], "x");
    expect(bounds.center).toBe(0);
  });

  it("computes plane normal and constant for X axis", () => {
    const unflipped = computeSectionPlaneVector({
      enabled: true,
      axis: "x",
      offset: 15,
      flipped: false,
      showPlane: true,
    });
    expect(unflipped.normal).toEqual({ x: 1, y: 0, z: 0 });
    expect(unflipped.constant).toBe(-15);

    const flipped = computeSectionPlaneVector({
      enabled: true,
      axis: "x",
      offset: 15,
      flipped: true,
      showPlane: true,
    });
    expect(flipped.normal).toEqual({ x: -1, y: 0, z: 0 });
    expect(flipped.constant).toBe(15);
  });

  it("computes plane normal and constant for Y and Z axes", () => {
    const yAxis = computeSectionPlaneVector({
      enabled: true,
      axis: "y",
      offset: 25,
      flipped: false,
      showPlane: true,
    });
    expect(yAxis.normal).toEqual({ x: 0, y: 1, z: 0 });
    expect(yAxis.constant).toBe(-25);

    const zAxisFlipped = computeSectionPlaneVector({
      enabled: true,
      axis: "z",
      offset: -10,
      flipped: true,
      showPlane: true,
    });
    expect(zAxisFlipped.normal).toEqual({ x: 0, y: 0, z: -1 });
    expect(zAxisFlipped.constant).toBe(-10);
  });
});

describe("sectionFineWindow", () => {
  it("is a twentieth of the coarse range to either side, between 0.5 and 10 mm", () => {
    expect(sectionFineWindow({ min: 0, max: 40 })).toEqual({ span: 2, step: 0.01 });
    expect(sectionFineWindow({ min: 0, max: 4 }).span).toBe(0.5);
    expect(sectionFineWindow({ min: -500, max: 500 }).span).toBe(10);
  });

  it("measures turned and tipped shapes by the space they really take", () => {
    // 80 mm long along x, turned a quarter about the vertical: now 80 mm along z.
    const turned = sampleShape({ width: 80, depth: 10, height: 10, rotation: 90 });
    const alongZ = getSectionBounds([turned], "z");
    expect(alongZ.center).toBeCloseTo(0, 6);
    expect(alongZ.max - alongZ.min).toBeGreaterThan(80);
    expect(getSectionBounds([turned], "x").max).toBeLessThan(10);
    // A 60 mm cylinder tipped onto its side reaches 5 mm either side of its middle in height.
    const tipped = sampleShape({ kind: "cylinder", width: 10, depth: 10, height: 60, rotationX: 90 });
    const height = getSectionBounds([tipped], "y");
    expect(height.center).toBeCloseTo(30, 6);
    expect(height.max - height.min).toBeLessThan(15);
  });
});

// The letters must name the real direction, not only agree with each other:
// each one is checked against three.js's fixed axes (y up) and against the
// shape fields the inspector shows (Position Y is shape.z, Z is the height).
describe("section axis letters", () => {
  const normalFor = (letter: SectionAxisLetter, flipped = false) =>
    computeSectionPlaneVector({ enabled: true, axis: sectionAxisFromLetter(letter), offset: 0, flipped, showPlane: true }).normal;

  it("shows the buttons as X, Y, Z, each letter for its own axis", () => {
    expect(SECTION_AXES_SHOWN.map(sectionAxisLetter)).toEqual(["X", "Y", "Z"]);
    for (const letter of ["X", "Y", "Z"] as const) expect(sectionAxisLetter(sectionAxisFromLetter(letter))).toBe(letter);
  });

  it("cuts Z with a horizontal plane, Y front to back and X left to right", () => {
    for (const flipped of [false, true]) {
      const sign = flipped ? -1 : 1;
      expect(normalFor("Z", flipped)).toEqual({ x: 0, y: sign, z: 0 });
      expect(normalFor("Y", flipped)).toEqual({ x: 0, y: 0, z: sign });
      expect(normalFor("X", flipped)).toEqual({ x: sign, y: 0, z: 0 });
    }
  });

  it("puts Z in the shape's height and Y at its Position Y", () => {
    // A tall 10 x 10 x 40 box at x -25, Position Y -30, lifted 5 mm off the plate.
    const tall = sampleShape({ x: -25, z: -30, elevation: 5, width: 10, depth: 10, height: 40 });
    const height = getSectionBounds([tall], sectionAxisFromLetter("Z"));
    expect(height.center).toBe(25);
    expect(height.min).toBeLessThanOrEqual(5);
    expect(height.min).toBeGreaterThan(0);
    expect(height.max).toBeGreaterThanOrEqual(45);
    const depth = getSectionBounds([tall], sectionAxisFromLetter("Y"));
    expect(depth.center).toBe(-30);
    expect(depth.min).toBeLessThanOrEqual(-35);
    expect(depth.max).toBeGreaterThanOrEqual(-25);
    expect(depth.max).toBeLessThan(-20);
    expect(getSectionBounds([tall], sectionAxisFromLetter("X")).center).toBe(-25);
  });

  it("titles the buttons by what they cut, in English and German", () => {
    expect(MESSAGES_EN["camera.sectionAxisX"]).toBe("X (width)");
    expect(MESSAGES_EN["camera.sectionAxisY"]).toBe("Y (depth)");
    expect(MESSAGES_EN["camera.sectionAxisZ"]).toBe("Z (height)");
    expect(MESSAGES_DE["camera.sectionAxisX"]).toBe("X (Breite)");
    expect(MESSAGES_DE["camera.sectionAxisY"]).toBe("Y (Tiefe)");
    expect(MESSAGES_DE["camera.sectionAxisZ"]).toBe("Z (Höhe)");
  });
});
