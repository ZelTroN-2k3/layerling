import { describe, expect, it } from "vitest";
import {
  createGearGeometry,
  gearOutlineCorners,
  gearUsesModule,
  involuteGearDiameter,
  involuteGearPair,
  normalizeGearProfile,
  roundGearMeasures,
  roundToothArcs,
} from "@/lib/gearGeometry";

/*
 * #201: round teeth, like the usual Useful gear - a convex arc per tooth and a concave arc per
 * gap, running smoothly into each other, set by module and teeth like the involute ones.
 */

const point = (arc: { x: number; z: number; radius: number }, angle: number) => ({
  x: arc.x + arc.radius * Math.cos(angle),
  z: arc.z + arc.radius * Math.sin(angle),
});

describe("round gear teeth (#201)", () => {
  it("is a module profile of its own", () => {
    expect(normalizeGearProfile("round")).toBe("round");
    expect(gearUsesModule("round")).toBe(true);
    expect(gearUsesModule("involute")).toBe(true);
    expect(gearUsesModule(undefined)).toBe(false);
  });

  it("puts tip and root where the involute has them and runs every arc into the next", () => {
    for (const teeth of [6, 8, 12, 20, 40, 64]) {
      for (const backlash of [0, 0.2, 0.6]) {
        const module = 1.5;
        const diameter = involuteGearDiameter(module, teeth, "round");
        expect(diameter).toBeCloseTo(module * (teeth + 1.2), 9);
        const measures = roundGearMeasures(diameter, diameter, { teeth, gearBacklash: backlash });
        expect(measures.module).toBeCloseTo(module, 9);
        expect(measures.toothCentre + measures.toothRadius).toBeCloseTo(measures.pitchRadius + 0.6 * module, 9);
        expect(measures.gapCentre - measures.gapRadius).toBeCloseTo(Math.max(measures.pitchRadius * 0.2, measures.pitchRadius - 0.85 * module), 9);
        expect(measures.toothRadius).toBeGreaterThan(0);
        expect(measures.gapRadius).toBeGreaterThan(0);
        for (let index = 0; index < 2; index += 1) {
          const arcs = roundToothArcs(measures, index);
          const nextArcs = roundToothArcs(measures, index + 1);
          // The tooth arc ends where the gap arc starts, and the gap arc where the next tooth starts.
          const toothEnd = point(arcs.tooth, arcs.tooth.end);
          const gapStart = point(arcs.gap, arcs.gap.start);
          const gapEnd = point(arcs.gap, arcs.gap.end);
          const nextStart = point(nextArcs.tooth, nextArcs.tooth.start);
          expect(Math.hypot(toothEnd.x - gapStart.x, toothEnd.z - gapStart.z), `${teeth}/${backlash}`).toBeLessThan(1e-7);
          expect(Math.hypot(gapEnd.x - nextStart.x, gapEnd.z - nextStart.z), `${teeth}/${backlash}`).toBeLessThan(1e-7);
          // Smoothly: the tangents agree where they meet (a convex and a concave arc run the same way there).
          const toothTangent = { x: -Math.sin(arcs.tooth.end), z: Math.cos(arcs.tooth.end) };
          const gapTangent = { x: Math.sin(arcs.gap.start), z: -Math.cos(arcs.gap.start) };
          expect(toothTangent.x * gapTangent.x + toothTangent.z * gapTangent.z).toBeGreaterThan(0.999999);
          // The tip lies on the tooth's centre line, the root on the gap's.
          const middle = (arcs.tooth.start + arcs.tooth.end) / 2;
          expect(Math.hypot(...Object.values(point(arcs.tooth, middle)) as [number, number])).toBeCloseTo(measures.tipRadius, 9);
          const bottom = (arcs.gap.start + arcs.gap.end) / 2;
          expect(Math.hypot(...Object.values(point(arcs.gap, bottom)) as [number, number])).toBeCloseTo(measures.rootRadius, 9);
        }
      }
    }
  });

  it("makes the tooth half a pitch thick on the pitch circle, less half the backlash", () => {
    for (const teeth of [6, 8, 16, 32, 64]) {
      for (const backlash of [0, 0.2, 0.5]) {
        const module = 2;
        const diameter = involuteGearDiameter(module, teeth, "round");
        const measures = roundGearMeasures(diameter, diameter, { teeth, gearBacklash: backlash });
        const arcs = roundToothArcs(measures, 0);
        // Where the right side of tooth 0 crosses the pitch circle: on its arc or on the gap's.
        const crossing = (arc: { x: number; z: number; radius: number }, from: number, to: number) => {
          const off = (angle: number) => Math.hypot(arc.x + arc.radius * Math.cos(angle), arc.z + arc.radius * Math.sin(angle)) - measures.pitchRadius;
          if (off(from) * off(to) > 0) return null;
          let low = from;
          let high = to;
          for (let step = 0; step < 80; step += 1) {
            const middle = (low + high) / 2;
            if (off(low) * off(middle) <= 0) high = middle;
            else low = middle;
          }
          return Math.atan2(arc.z + arc.radius * Math.sin(low), arc.x + arc.radius * Math.cos(low));
        };
        const angle = crossing(arcs.tooth, (arcs.tooth.start + arcs.tooth.end) / 2, arcs.tooth.end)
          ?? crossing(arcs.gap, arcs.gap.start, (arcs.gap.start + arcs.gap.end) / 2);
        expect(angle, `${teeth}/${backlash}`).not.toBeNull();
        const thickness = 2 * (angle! - Math.PI / teeth) * measures.pitchRadius;
        expect(thickness, `${teeth}/${backlash}`).toBeCloseTo((Math.PI * module) / 2 - backlash / 2, 6);
      }
    }
  });

  it("draws the outline without a bulge: its angle keeps rising, for every tooth count", () => {
    for (const teeth of [6, 7, 12, 30, 64]) {
      for (const backlash of [0, 0.2, 0.5]) {
        const diameter = involuteGearDiameter(2, teeth, "round");
        const corners = gearOutlineCorners(diameter, diameter, { teeth, gearProfile: "round", gearBacklash: backlash });
        corners.slice(1).forEach((corner, index) => expect(corner.angle, `${teeth}/${backlash}/${index}`).toBeGreaterThan(corners[index].angle));
      }
    }
  });

  it("draws the arcs closely: every corner of the outline lies on them", () => {
    const diameter = involuteGearDiameter(2, 12, "round");
    const measures = roundGearMeasures(diameter, diameter, { teeth: 12, gearBacklash: 0.2 });
    const corners = gearOutlineCorners(diameter, diameter, { teeth: 12, gearProfile: "round", gearBacklash: 0.2 });
    // Steps of at most 11° along arcs of roughly 190° and 160°.
    expect(corners.length).toBeGreaterThan(12 * 28);
    expect(corners.length).toBeLessThan(12 * 40);
    corners.forEach((corner) => {
      expect(corner.radiusX).toBeLessThanOrEqual(measures.tipRadius + 1e-9);
      expect(corner.radiusX).toBeGreaterThanOrEqual(measures.rootRadius - 1e-9);
    });
    // Angles keep rising round the ring.
    corners.slice(1).forEach((corner, index) => expect(corner.angle).toBeGreaterThan(corners[index].angle));
  });

  it("draws a closed, watertight gear with the tip circle on its frame", () => {
    const diameter = involuteGearDiameter(2, 14, "round");
    const geometry = createGearGeometry({ width: diameter, depth: diameter, height: 6, teeth: 14, gearProfile: "round", centerHoleSize: 5 });
    const position = geometry.getAttribute("position");
    let maxRadius = 0;
    for (let index = 0; index < position.count; index += 1) maxRadius = Math.max(maxRadius, Math.hypot(position.getX(index), position.getZ(index)));
    expect(maxRadius).toBeCloseTo(diameter / 2, 6);
    const helical = createGearGeometry({ width: diameter, depth: diameter, height: 6, teeth: 14, gearProfile: "round", gearType: "helical" });
    expect(helical.getAttribute("position").count).toBeGreaterThan(position.count / 2);
  });

  it("pairs round gears with round ones only", () => {
    const at = (x: number, gearProfile: "round" | "involute", teeth: number) => ({ kind: "gear" as const, gearProfile, teeth, size: involuteGearDiameter(2, teeth, gearProfile), width: involuteGearDiameter(2, teeth, gearProfile), depth: involuteGearDiameter(2, teeth, gearProfile), x, z: 0 });
    expect(involuteGearPair(at(0, "round", 10), at(30, "round", 20))?.distance).toBeCloseTo(30, 9);
    expect(involuteGearPair(at(0, "round", 10), at(30, "involute", 20))).toBeNull();
  });
});
