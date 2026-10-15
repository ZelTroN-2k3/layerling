import { describe, expect, it } from "vitest";
import { involuteGearLoop } from "@/lib/cadProfileExtrusion";
import {
  createGearGeometry,
  gearHelixTwist,
  gearOutlineCorners,
  involuteCentreDistance,
  involuteFlankPoint,
  involuteGearDiameter,
  involuteGearMeasures,
  involuteGearModule,
  involuteGearPair,
  involuteOutlineStretch,
  involuteToothCentre,
  normalizeGearCenterHoleSize,
  normalizeGearProfile,
} from "@/lib/gearGeometry";

// Involute teeth (#201): the measures a gear generator would give.
describe("involute gear measures", () => {
  const gear = involuteGearMeasures(28, 28, { teeth: 12, gearBacklash: 0 });

  it("takes the module from the outside diameter", () => {
    expect(involuteGearModule(28, 28, 12)).toBeCloseTo(2, 12);
    expect(involuteGearDiameter(1.5, 20)).toBeCloseTo(33, 12);
    expect(gear.pitchRadius).toBeCloseTo(12, 12);
    expect(gear.baseRadius).toBeCloseTo(12 * Math.cos((20 * Math.PI) / 180), 12);
    expect(gear.tipRadius).toBeCloseTo(14, 12);
    expect(gear.rootRadius).toBeCloseTo(12 - 2.5, 12);
  });

  it("makes the tooth half the pitch thick on the pitch circle, less half the backlash", () => {
    const thicknessAt = (measures: ReturnType<typeof involuteGearMeasures>) => {
      // The roll angle where the involute crosses the pitch circle.
      const roll = Math.sqrt((measures.pitchRadius / measures.baseRadius) ** 2 - 1);
      const left = involuteFlankPoint(measures, 0, -1, roll);
      const right = involuteFlankPoint(measures, 0, 1, roll);
      expect(Math.hypot(left.x, left.z)).toBeCloseTo(measures.pitchRadius, 9);
      return (Math.atan2(right.z, right.x) - Math.atan2(left.z, left.x)) * measures.pitchRadius;
    };
    expect(thicknessAt(gear)).toBeCloseTo(Math.PI, 9);
    const played = involuteGearMeasures(28, 28, { teeth: 12, gearBacklash: 0.2 });
    expect(thicknessAt(played)).toBeCloseTo(Math.PI - 0.1, 9);
  });

  it("gives the centre distance of a meshing pair", () => {
    expect(involuteCentreDistance(2, 12, 30)).toBeCloseTo(42, 12);
  });

  it("keeps old gears on their straight teeth", () => {
    expect(normalizeGearProfile(undefined)).toBe("simple");
    expect(normalizeGearProfile("involute")).toBe("involute");
    expect(involuteOutlineStretch(30, 30, { teeth: 12 })).toBeNull();
    expect(gearOutlineCorners(30, 30, { teeth: 12 })).toHaveLength(48);
  });

  it("stops a pointed tooth short of its tip and keeps it a tooth", () => {
    const small = involuteGearMeasures(8, 8, { teeth: 6, gearPressureAngle: 30, gearBacklash: 0.5 });
    expect(small.tipRadius).toBeLessThanOrEqual(small.pitchRadius + small.module + 1e-12);
    const tip = involuteFlankPoint(small, 0, 1, small.rollEnd);
    expect(Math.atan2(tip.z, tip.x)).toBeGreaterThan(0);
  });
});

describe("involute gear outline", () => {
  const shape = { teeth: 17, gearProfile: "involute" as const, gearBacklash: 0.2 };

  it("stays within the tip circle and reaches it at every tooth", () => {
    const corners = gearOutlineCorners(38, 38, shape);
    const measures = involuteGearMeasures(38, 38, shape);
    for (const corner of corners) expect(corner.radiusX).toBeLessThanOrEqual(measures.tipRadius + 1e-9);
    expect(corners.filter((corner) => Math.abs(corner.radiusX - measures.tipRadius) < 1e-9)).toHaveLength(17 * 3);
    // Round the ring without turning back; the straight piece below the base circle keeps its angle.
    expect(corners.every((corner, index) => index === 0 || corner.angle >= corners[index - 1].angle - 1e-12)).toBe(true);
  });

  it("builds the kernel loop with flanks within a thousandth of a module of the involute", () => {
    const measures = involuteGearMeasures(38, 38, shape);
    const loop = involuteGearLoop(measures);
    const bezier = loop.segments.filter((segment) => segment.kind === "bezier");
    expect(bezier).toHaveLength(17 * 4);
    // The first flank: compare the cubic pieces with the true curve.
    let start = { x: loop.x, z: loop.z };
    const firstLine = loop.segments[0];
    if (firstLine.kind === "line") start = { x: firstLine.x, z: firstLine.z };
    const centre = involuteToothCentre(17, 0);
    let worst = 0;
    let from = start;
    for (const segment of loop.segments.slice(1, 3)) {
      if (segment.kind !== "bezier") throw new Error("expected a flank");
      const [c1, c2] = segment.controls;
      for (let step = 0; step <= 20; step += 1) {
        const t = step / 20;
        const u = 1 - t;
        const x = u * u * u * from.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * segment.x;
        const z = u * u * u * from.z + 3 * u * u * t * c1.z + 3 * u * t * t * c2.z + t * t * t * segment.z;
        // Distance to the involute: nearest of many samples along it.
        let nearest = Infinity;
        for (let sample = 0; sample <= 4000; sample += 1) {
          const roll = measures.rollStart + ((measures.rollEnd - measures.rollStart) * sample) / 4000;
          const point = involuteFlankPoint(measures, centre, -1, roll);
          nearest = Math.min(nearest, Math.hypot(point.x - x, point.z - z));
        }
        worst = Math.max(worst, nearest);
      }
      from = { x: segment.x, z: segment.z };
    }
    expect(worst).toBeLessThan(measures.module * 1e-3);
  });

  it("closes the loop where it started", () => {
    const loop = involuteGearLoop(involuteGearMeasures(38, 38, shape));
    const last = loop.segments[loop.segments.length - 1];
    expect(Math.hypot(last.x - loop.x, last.z - loop.z)).toBeLessThan(1e-9);
  });

  it("keeps the bore inside the root circle", () => {
    const measures = involuteGearMeasures(28, 28, { teeth: 12 });
    const hole = normalizeGearCenterHoleSize(100, 28, 28, undefined, { teeth: 12, gearProfile: "involute" });
    expect(hole / 2).toBeLessThan(measures.rootRadius);
  });

  it("draws the display mesh with the tip circle on width x depth", () => {
    const geometry = createGearGeometry({ width: 28, depth: 28, height: 6, teeth: 12, gearProfile: "involute", centerHoleSize: 5 });
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    expect(box.max.x - box.min.x).toBeLessThanOrEqual(28 + 1e-6);
    expect(box.max.y - box.min.y).toBeCloseTo(6, 9);
    // No tooth tip is stretched past the tip circle, whatever the frame.
    const positions = geometry.getAttribute("position");
    let reach = 0;
    for (let index = 0; index < positions.count; index += 1) reach = Math.max(reach, Math.hypot(positions.getX(index), positions.getZ(index)));
    expect(reach).toBeCloseTo(14, 6);
  });

  it("turns helical involute teeth by the true helix angle", () => {
    const twist = gearHelixTwist(28, 28, 10, { teeth: 12, gearProfile: "involute", helixAngle: 20 });
    expect(twist).toBeCloseTo((10 * Math.tan((20 * Math.PI) / 180)) / 12, 12);
    // Straight teeth keep the angle as their turn.
    expect(gearHelixTwist(28, 28, 10, { teeth: 12, helixAngle: 20 })).toBeCloseTo((20 * Math.PI) / 180, 12);
  });
});

describe("two selected gears", () => {
  const pinion = { kind: "gear" as const, gearProfile: "involute" as const, teeth: 12, size: 28, width: 28, depth: 28, x: 0, z: 0 };

  it("tells where two gears of one module mesh, and where they stand now", () => {
    const wheel = { ...pinion, teeth: 30, size: 64, width: 64, depth: 64, x: 40, z: 0 };
    expect(involuteGearPair(pinion, wheel)).toEqual({ modules: [2, 2], current: 40, distance: 42, internal: false });
  });

  it("says when the modules differ, and leaves other shapes alone", () => {
    const other = { ...pinion, teeth: 20, size: 33, width: 33, depth: 33, x: 30, z: 0 };
    const pair = involuteGearPair(pinion, other)!;
    expect(pair.distance).toBeNull();
    expect(pair.modules[1]).toBeCloseTo(1.5, 12);
    expect(involuteGearPair(pinion, { ...pinion, gearProfile: undefined })).toBeNull();
  });
});
