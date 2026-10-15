import { describe, expect, it } from "vitest";
import { internalGearLoops, rackLoop } from "@/lib/cadProfileExtrusion";
import {
  createGearGeometry,
  gearModuleOf,
  gearSizeForModule,
  gearToothProfile,
  gearTypeIsModular,
  internalGearDiameter,
  internalGearMeasures,
  internalGearOutline,
  involuteFlankPoint,
  involuteGearPair,
  normalizeGearType,
  rackLength,
  rackMeasures,
  rackMinDepth,
  rackModule,
  rackOutlinePoints,
  rackToothArcs,
  rackToothCentre,
  roundInternalMeasures,
  roundToothArcs,
} from "@/lib/gearGeometry";

/*
 * #201: the ring gear (teeth pointing in) and the rack, both set by module like the involute
 * gear, so a pinion of the same module runs in the ring and rolls on the rack.
 */

const point = (arc: { x: number; z: number; radius: number }, angle: number) => ({
  x: arc.x + arc.radius * Math.cos(angle),
  z: arc.z + arc.radius * Math.sin(angle),
});
const apart = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);

describe("ring gear (#201)", () => {
  it("takes the module from the outside diameter less the rim", () => {
    // Module 2, 30 teeth, 3 mm rim: the root circle is 65 across, the outside 71.
    expect(internalGearDiameter(2, 30, 3)).toBeCloseTo(71, 12);
    const measures = internalGearMeasures(71, 71, { teeth: 30, gearRim: 3, gearBacklash: 0 });
    expect(measures.module).toBeCloseTo(2, 12);
    expect(measures.pitchRadius).toBeCloseTo(30, 12);
    // Its gaps are the teeth of a gear turned inside out: that gear's tip is the ring's root, its root the ring's tips.
    expect(measures.tipRadius).toBeCloseTo(32.5, 12);
    expect(measures.rimRadius).toBeCloseTo(35.5, 12);
    // At 30 teeth the base circle (28.19) lies just outside the tips a module in (28): the tips stop at the base circle.
    expect(measures.rootRadius).toBeCloseTo(30 * Math.cos((20 * Math.PI) / 180), 12);
    // At 40 teeth the base circle (37.59) lies inside the tips (38): they stay a module in.
    expect(internalGearMeasures(91, 91, { teeth: 40, gearRim: 3 }).rootRadius).toBeCloseTo(38, 12);
    // At 20 teeth the straight piece from tip (18) to base circle (18.79) is long enough to stay.
    expect(internalGearMeasures(51, 51, { teeth: 20, gearRim: 3 }).rootRadius).toBeCloseTo(18, 12);
    expect(gearModuleOf({ width: 71, depth: 71, teeth: 30, gearType: "internal", gearRim: 3 })).toBeCloseTo(2, 12);
    expect(gearSizeForModule(2, { width: 10, depth: 10, teeth: 30, gearType: "internal", gearRim: 3 })).toEqual({ width: 71, depth: 71 });
  });

  it("leaves each gap half a pitch plus half the backlash wide on the pitch circle", () => {
    const gapAt = (measures: ReturnType<typeof internalGearMeasures>) => {
      const roll = Math.sqrt((measures.pitchRadius / measures.baseRadius) ** 2 - 1);
      const left = involuteFlankPoint(measures, 0, -1, roll);
      const right = involuteFlankPoint(measures, 0, 1, roll);
      expect(Math.hypot(left.x, left.z)).toBeCloseTo(measures.pitchRadius, 9);
      return (Math.atan2(right.z, right.x) - Math.atan2(left.z, left.x)) * measures.pitchRadius;
    };
    expect(gapAt(internalGearMeasures(71, 71, { teeth: 30, gearRim: 3, gearBacklash: 0 }))).toBeCloseTo(Math.PI, 9);
    expect(gapAt(internalGearMeasures(71, 71, { teeth: 30, gearRim: 3, gearBacklash: 0.2 }))).toBeCloseTo(Math.PI + 0.1, 9);
  });

  it("draws its teeth between tip and root circle and is stretched by its rim circle", () => {
    // Module 2, 40 teeth, 3 mm rim: root circle 85, tips 76, outside 91.
    const { corners, rimRadius, stretch } = internalGearOutline(91, 91, { teeth: 40, gearRim: 3 });
    expect(rimRadius).toBeCloseTo(45.5, 12);
    expect(stretch.x).toBeCloseTo(1, 12);
    for (const corner of corners) {
      expect(corner.radiusX).toBeLessThanOrEqual(42.5 + 1e-9);
      expect(corner.radiusX).toBeGreaterThanOrEqual(38 - 1e-9);
    }
    expect(corners.filter((corner) => Math.abs(corner.radiusX - 38) < 1e-9).length).toBeGreaterThanOrEqual(40);
    // An oval ring takes its module from the smaller side and is stretched along the other.
    const oval = internalGearOutline(71, 50, { teeth: 30, gearRim: 3 });
    expect(oval.rimRadius).toBeCloseTo(25, 12);
    expect(oval.stretch.x).toBeCloseTo(71 / 50, 12);
    expect(oval.stretch.z).toBeCloseTo(1, 12);
  });

  it("meshes a pinion inside it at module x (teeth - pinion teeth) / 2", () => {
    const ring = { kind: "gear", gearType: "internal", gearProfile: "involute", teeth: 30, gearRim: 3, width: 71, depth: 71, size: 71, x: 0, z: 0 } as const;
    const pinion = { kind: "gear", gearType: "spur", gearProfile: "involute", teeth: 12, width: 28, depth: 28, size: 28, x: 18, z: 0 } as const;
    const pair = involuteGearPair(ring, pinion);
    expect(pair?.internal).toBe(true);
    expect(pair?.distance).toBeCloseTo(18, 12);
    expect(pair?.current).toBeCloseTo(18, 12);
    expect(involuteGearPair(pinion, ring)?.distance).toBeCloseTo(18, 12);
    // Two ring gears do not mesh, and a rack has no centre.
    expect(involuteGearPair(ring, { ...ring, x: 5 })).toBeNull();
    expect(involuteGearPair(pinion, { ...pinion, gearType: "rack", width: 24 * Math.PI, depth: 7.5 })).toBeNull();
  });

  it("has round teeth too, each arc running smoothly into the next", () => {
    const diameter = internalGearDiameter(1.5, 24, 3, "round");
    expect(diameter).toBeCloseTo(1.5 * (24 + 1.7) + 6, 12);
    const measures = roundInternalMeasures(diameter, diameter, { teeth: 24, gearRim: 3, gearBacklash: 0.2 });
    expect(measures.module).toBeCloseTo(1.5, 9);
    expect(measures.tipRadius).toBeCloseTo(18 + 0.85 * 1.5, 9);
    expect(measures.rootRadius).toBeCloseTo(18 - 0.6 * 1.5, 9);
    expect(measures.rimRadius).toBeCloseTo(18 + 0.85 * 1.5 + 3, 9);
    for (let index = 0; index < 3; index += 1) {
      const arcs = roundToothArcs(measures, index);
      const next = roundToothArcs(measures, index + 1);
      expect(apart(point(arcs.tooth, arcs.tooth.end), point(arcs.gap, arcs.gap.start))).toBeLessThan(1e-7);
      expect(apart(point(arcs.gap, arcs.gap.end), point(next.tooth, next.tooth.start))).toBeLessThan(1e-7);
    }
  });

  it("builds a ring: a mesh with the teeth round a hole, and two loops for the kernel", () => {
    const geometry = createGearGeometry({ width: 91, depth: 91, height: 6, teeth: 40, gearType: "internal", gearProfile: "involute", gearRim: 3 });
    const box = geometry.boundingBox!;
    expect(box.min.x).toBeCloseTo(-45.5, 3);
    expect(box.max.x).toBeCloseTo(45.5, 3);
    expect(box.min.y).toBeCloseTo(0, 9);
    expect(box.max.y).toBeCloseTo(6, 9);
    const position = geometry.getAttribute("position");
    let nearest = Number.POSITIVE_INFINITY;
    for (let index = 0; index < position.count; index += 1) nearest = Math.min(nearest, Math.hypot(position.getX(index), position.getZ(index)));
    expect(nearest).toBeCloseTo(38, 3);
    const loops = internalGearLoops(91, 91, { teeth: 40, gearRim: 3 });
    expect(loops).toHaveLength(2);
    expect(loops[0].segments.every((segment) => segment.kind === "arc" && Math.abs(segment.rx - 45.5) < 1e-9)).toBe(true);
    expect(loops[1].segments.some((segment) => segment.kind === "bezier")).toBe(true);
  });

  it("has no straight teeth: simple counts as involute on a ring gear and a rack", () => {
    expect(normalizeGearType("internal")).toBe("internal");
    expect(normalizeGearType("rack")).toBe("rack");
    expect(normalizeGearType("ring")).toBe("spur");
    expect(gearTypeIsModular("internal")).toBe(true);
    expect(gearTypeIsModular("bevel")).toBe(false);
    expect(gearToothProfile({ gearType: "internal", gearProfile: "simple" })).toBe("involute");
    expect(gearToothProfile({ gearType: "rack", gearProfile: "round" })).toBe("round");
    expect(gearToothProfile({ gearType: "spur", gearProfile: "simple" })).toBe("simple");
  });
});

describe("rack (#201)", () => {
  const length = 24 * Math.PI;

  it("is teeth x pitch long, with its ends on gap centres", () => {
    expect(rackLength(2, 12)).toBeCloseTo(length, 12);
    expect(rackModule(length, 12)).toBeCloseTo(2, 12);
    const measures = rackMeasures(length, 7.5, { teeth: 12, gearBacklash: 0 });
    expect(measures.pitch).toBeCloseTo(2 * Math.PI, 12);
    expect(rackToothCentre(measures, 0)).toBeCloseTo(-length / 2 + Math.PI, 12);
    expect(rackToothCentre(measures, 11)).toBeCloseTo(length / 2 - Math.PI, 12);
    expect(measures.tipZ).toBeCloseTo(3.75, 12);
    expect(measures.rootZ).toBeCloseTo(3.75 - 4.5, 12);
    expect(measures.pitchZ).toBeCloseTo(3.75 - 2, 12);
    expect(measures.backZ).toBeCloseTo(-3.75, 12);
    expect(gearModuleOf({ width: length, depth: 7.5, teeth: 12, gearType: "rack" })).toBeCloseTo(2, 12);
    // The depth is the bar's own; it only has to hold the teeth and a little bar.
    expect(gearSizeForModule(2, { width: 10, depth: 7.5, teeth: 12, gearType: "rack" }).width).toBeCloseTo(length, 12);
    expect(gearSizeForModule(2, { width: 10, depth: 7.5, teeth: 12, gearType: "rack" }).depth).toBe(7.5);
    expect(gearSizeForModule(2, { width: 10, depth: 3, teeth: 12, gearType: "rack" }).depth).toBeCloseTo(rackMinDepth(2), 12);
    expect(rackMinDepth(2)).toBeCloseTo(5, 12);
  });

  it("gives an involute tooth straight flanks at the pressure angle, half a pitch less half the backlash thick on the pitch line", () => {
    const measures = rackMeasures(length, 7.5, { teeth: 12, gearBacklash: 0.2, gearPressureAngle: 20 });
    const half = (Math.PI - 0.1) / 2;
    const slope = Math.tan((20 * Math.PI) / 180);
    expect(measures.tipHalf).toBeCloseTo(half - 2 * slope, 12);
    expect(measures.rootHalf).toBeCloseTo(half + 2.5 * slope, 12);
    const points = rackOutlinePoints(measures);
    expect(points).toHaveLength(3 + 12 * 4 + 1);
    expect(points[0]).toEqual({ x: -length / 2, z: -3.75 });
    expect(points[1]).toEqual({ x: length / 2, z: -3.75 });
    for (const p of points) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(length / 2 + 1e-9);
      expect(p.z).toBeGreaterThanOrEqual(-3.75 - 1e-9);
      expect(p.z).toBeLessThanOrEqual(3.75 + 1e-9);
    }
    expect(points.filter((p) => Math.abs(p.z - 3.75) < 1e-9)).toHaveLength(24);
    // The first tooth's tip is centred half a pitch in from the left end.
    const tips = points.filter((p) => Math.abs(p.z - 3.75) < 1e-9).map((p) => p.x).sort((a, b) => a - b);
    expect((tips[0] + tips[1]) / 2).toBeCloseTo(-length / 2 + Math.PI, 12);
  });

  it("gives round teeth two arcs per pitch that touch, the tooth as thick as the involute one on the pitch line", () => {
    const measures = rackMeasures(length, 7.5, { teeth: 12, gearProfile: "round", gearBacklash: 0.2 });
    expect(measures.toothRadius).toBeGreaterThan(0);
    expect(measures.gapRadius).toBeGreaterThan(0);
    for (let index = 1; index < 12; index += 1) {
      const arcs = rackToothArcs(measures, index);
      const left = rackToothArcs(measures, index - 1);
      // The tooth's arc ends where its gap's starts, and the gap ends where the next tooth to the left begins.
      expect(apart(point(arcs.tooth, arcs.tooth.end), point(arcs.gap, arcs.gap.start))).toBeLessThan(1e-9);
      expect(apart(point(arcs.gap, arcs.gap.end), point(left.tooth, left.tooth.start))).toBeLessThan(1e-9);
      // The tip on the tip line, the root on the root line.
      expect(point(arcs.tooth, Math.PI / 2).z).toBeCloseTo(measures.tipZ, 12);
      expect(point(arcs.gap, -Math.PI / 2).z).toBeCloseTo(measures.rootZ, 12);
    }
    // Where the tooth crosses the pitch line it is half a pitch less half the backlash wide.
    const arcs = rackToothArcs(measures, 5);
    const touchZ = point(arcs.tooth, arcs.tooth.start).z;
    const halfWidth = measures.pitchZ >= touchZ
      ? Math.sqrt(arcs.tooth.radius ** 2 - (measures.pitchZ - arcs.tooth.z) ** 2)
      : measures.pitch / 2 - Math.sqrt(arcs.gap.radius ** 2 - (measures.pitchZ - arcs.gap.z) ** 2);
    expect(2 * halfWidth).toBeCloseTo(Math.PI - 0.1, 6);
    // The left end: half a gap down to the root at the bar's end.
    const first = rackToothArcs(measures, 0);
    expect(point(first.gap, first.gap.end)).toEqual({ x: expect.closeTo(-length / 2, 9), z: expect.closeTo(measures.rootZ, 9) });
  });

  it("builds a bar with its teeth towards +z, as long and deep as asked", () => {
    const geometry = createGearGeometry({ width: length, depth: 7.5, height: 6, teeth: 12, gearType: "rack", gearProfile: "involute" });
    const box = geometry.boundingBox!;
    expect(box.min.x).toBeCloseTo(-length / 2, 4);
    expect(box.max.x).toBeCloseTo(length / 2, 4);
    expect(box.min.z).toBeCloseTo(-3.75, 4);
    expect(box.max.z).toBeCloseTo(3.75, 4);
    expect(box.max.y).toBeCloseTo(6, 9);
    expect(rackLoop(length, 7.5, { teeth: 12 }).segments.every((segment) => segment.kind === "line")).toBe(true);
    const round = rackLoop(length, 7.5, { teeth: 12, gearProfile: "round" });
    expect(round.segments.filter((segment) => segment.kind === "arc")).toHaveLength(1 + 12 * 2);
  });
});
