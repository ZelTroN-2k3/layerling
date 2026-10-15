import { describe, expect, it } from "vitest";
import { createThreadGeometry, threadNaturalFootprint, threadSettings } from "@/lib/threadGeometry";
import type { ThreadRole } from "@/types/layerling";

type Position = { count: number; getX(i: number): number; getY(i: number): number; getZ(i: number): number };

function build(role: ThreadRole, height: number, overrides: Record<string, unknown> = {}) {
  const settings = threadSettings({ threadRole: role, threadDiameter: 6, threadPitch: 1, ...overrides });
  const footprint = threadNaturalFootprint(settings);
  const geometry = createThreadGeometry({ width: footprint.width, depth: footprint.depth, height, threadRole: role, threadDiameter: 6, threadPitch: 1, ...overrides });
  return { settings, position: geometry.getAttribute("position") as unknown as Position };
}

/** The smallest and the largest radius of the surface between two heights (caps that run to the middle left out). */
function radiusBetween(position: Position, from: number, to: number) {
  let smallest = Number.POSITIVE_INFINITY;
  let largest = 0;
  for (let index = 0; index < position.count; index += 1) {
    const y = position.getY(index);
    if (y < from || y > to) continue;
    const radius = Math.hypot(position.getX(index), position.getZ(index));
    if (radius < 0.5) continue;
    smallest = Math.min(smallest, radius);
    largest = Math.max(largest, radius);
  }
  return { smallest, largest };
}

describe("a chamfer of any width above zero counts", () => {
  it("makes the mouth of a tapped hole exactly as wide as the outer diameter at 0.001 mm, and leaves it alone at 0", () => {
    const major = 3 + 0.2;
    const core = major - 0.5413;
    const none = build("bore", 14, { threadClearance: 0.4, threadChamfer: 0, threadChamferBottom: 0 });
    const tiny = build("bore", 14, { threadClearance: 0.4, threadChamfer: 0.001, threadChamferBottom: 0 });
    // At 0 the thread runs to the face, so the teeth reach down to the core there. At 0.001 the cone
    // opens the mouth to the outer diameter (a hair more), as at 0.002 before.
    expect(radiusBetween(none.position, 14 - 0.0005, 14).smallest).toBeLessThan(core + 0.1);
    expect(radiusBetween(tiny.position, 14 - 0.0005, 14).smallest).toBeGreaterThan(major - 0.01);
  });
});

describe("the chamfer of an inside thread reaches the core (#269)", () => {
  // M6 x 1 with the default 0.4 mm clearance: major radius 3.2, the thread 0.5413 deep, core radius 2.6587.
  const major = 3 + 0.2;
  const core = major - 0.5413;

  it("keeps cutting the crests below the old cone, so no ledge is left at the outer diameter", () => {
    const { position } = build("bore", 14, { threadClearance: 0.4, threadChamfer: 1, threadChamferBottom: 0 });
    // The old cone ended at 1 mm below the top face, on the outer diameter. From there on the
    // thread stood at full height. Now the cone goes on to the core, 1 + 0.5413 mm down.
    const below = radiusBetween(position, 14 - 1.4, 14 - 1.1);
    expect(below.smallest).toBeGreaterThan(core + 0.05);
    // Further down the thread has its full depth again.
    const deep = radiusBetween(position, 3, 10);
    expect(deep.smallest).toBeCloseTo(core, 2);
    expect(deep.largest).toBeCloseTo(major, 2);
  });

  it("opens the mouth as wide as before: the chamfer is still the room beyond the outer diameter", () => {
    const { position } = build("bore", 14, { threadClearance: 0.4, threadChamfer: 1, threadChamferBottom: 0 });
    const mouth = radiusBetween(position, 14 - 0.05, 14);
    expect(mouth.largest).toBeCloseTo(major + 1, 1);
  });
});

describe("a chamfer at each end of a thread (#269)", () => {
  it("gives the bottom end the chamfer of the top end when it has none of its own", () => {
    const settings = threadSettings({ threadRole: "rod", threadDiameter: 6, threadPitch: 1, threadChamfer: 0.8 });
    expect(settings.chamfer).toBeCloseTo(0.8, 6);
    expect(settings.chamferLow).toBeCloseTo(0.8, 6);
  });

  it("takes a bottom chamfer of its own", () => {
    const settings = threadSettings({ threadRole: "rod", threadDiameter: 6, threadPitch: 1, threadChamfer: 0.8, threadChamferBottom: 0.2 });
    expect(settings.chamfer).toBeCloseTo(0.8, 6);
    expect(settings.chamferLow).toBeCloseTo(0.2, 6);
  });

  it("chamfers only the end that has one", () => {
    const { position } = build("rod", 20, { threadChamfer: 1.2, threadChamferBottom: 0 });
    const top = radiusBetween(position, 19.9, 20);
    const bottom = radiusBetween(position, 0, 0.1);
    expect(bottom.largest).toBeGreaterThan(top.largest + 0.8);
  });

  it("chamfers both ends alike without a value for the bottom", () => {
    const { position } = build("rod", 20, { threadChamfer: 1.2 });
    const top = radiusBetween(position, 19.9, 20);
    const bottom = radiusBetween(position, 0, 0.1);
    expect(Math.abs(top.largest - bottom.largest)).toBeLessThan(0.05);
  });

  it("leaves the head end of a screw alone, whatever the bottom value", () => {
    const withBottom = threadSettings({ threadRole: "screw", threadDiameter: 6, threadPitch: 1, threadChamfer: 1, threadChamferBottom: 0.3 });
    expect(withBottom.chamferLow).toBeCloseTo(0.3, 6);
    const { position } = build("screw", 24, { threadChamfer: 1, threadChamferBottom: 0.3 });
    const underHead = radiusBetween(position, 6.01, 6.5);
    // Under the head the thread runs at full depth: the bottom chamfer does not apply to a screw.
    expect(underHead.largest).toBeCloseTo(3, 1);
  });
});
