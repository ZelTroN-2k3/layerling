import { describe, expect, it } from "vitest";
import { createKnurlGeometry, knurlCorners, knurlSettings, knurlTwist, maxKnurlDepth, normalizeKnurlCount, normalizeKnurlPattern } from "@/lib/knurlGeometry";
import { validateClosedSolidTriangleSoup } from "@/lib/svgImport";

function soup(geometry: ReturnType<typeof createKnurlGeometry>) {
  return Array.from(geometry.getAttribute("position").array as Float32Array);
}

function signedVolume(positions: number[]) {
  let volume = 0;
  for (let i = 0; i < positions.length; i += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = positions.slice(i, i + 9);
    volume += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return volume;
}

function radii(positions: number[]) {
  const values: number[] = [];
  for (let i = 0; i < positions.length; i += 3) values.push(Math.hypot(positions[i], positions[i + 2]));
  return values;
}

describe("knurling", () => {
  it("puts ridges on the outer radius and groove bottoms a depth further in", () => {
    const corners = knurlCorners(20, 30, 0.6);
    expect(corners).toHaveLength(60);
    expect(corners[0]).toEqual({ angle: 0, radius: 10 });
    expect(corners[1].radius).toBeCloseTo(9.4, 9);
    expect(corners[1].angle).toBeCloseTo(Math.PI / 30, 9);
  });

  it("keeps its measures in range", () => {
    expect(normalizeKnurlCount(2)).toBe(6);
    expect(normalizeKnurlCount(999)).toBe(180);
    // No grooves finer than 0.8 mm around the grip: 20 mm takes 78.
    expect(normalizeKnurlCount(999, 20)).toBe(78);
    expect(maxKnurlDepth(20)).toBeCloseTo(10 / 3, 9);
    expect(knurlSettings({ width: 20, height: 10, knurlDepth: 50 }).depth).toBeCloseTo(10 / 3, 9);
    expect(knurlSettings({ width: 20, height: 10 }).pattern).toBe("straight");
  });

  it("turns a crossed groove by height x tan(angle) / radius", () => {
    expect(knurlTwist(20, 10, 45)).toBeCloseTo(1, 9);
  });

  for (const pattern of ["straight", "diamond", "round"] as const) {
    it(`builds a closed, outward ${pattern} body inside its diameter and height`, () => {
      const positions = soup(createKnurlGeometry({ width: 20, height: 12, knurlPattern: pattern, knurlCount: 24, knurlDepth: 0.8, knurlAngle: 30 }));
      expect(() => validateClosedSolidTriangleSoup(positions, pattern)).not.toThrow();
      const volume = signedVolume(positions);
      expect(volume).toBeGreaterThan(0);
      // Between the groove-bottom cylinder and the full one.
      expect(volume).toBeLessThan(Math.PI * 100 * 12);
      expect(volume).toBeGreaterThan(Math.PI * 9.2 * 9.2 * 12);
      const r = radii(positions).filter((value) => value > 1);
      expect(Math.max(...r)).toBeLessThanOrEqual(10 + 1e-5);
      expect(Math.min(...r)).toBeGreaterThanOrEqual(9.2 - 1e-5);
      const ys = positions.filter((_, index) => index % 3 === 1);
      expect(Math.min(...ys)).toBeCloseTo(0, 6);
      expect(Math.max(...ys)).toBeCloseTo(12, 5);
    });
  }

  it("draws round knurling as a wave of arcs: ridges and groove bottoms where set, no bulge, shallower than half a pitch (#201)", () => {
    const corners = knurlCorners(20, 18, 1.2, "round");
    const r = corners.map((corner) => corner.radius);
    expect(Math.max(...r)).toBeCloseTo(10, 9);
    expect(Math.min(...r)).toBeCloseTo(8.8, 9);
    // Smooth: far more corners than the V's two per groove, the angle always rising.
    expect(corners.length).toBeGreaterThan(18 * 10);
    corners.slice(1).forEach((corner, index) => expect(corner.angle).toBeGreaterThan(corners[index].angle));
    // Too deep for its pitch, the depth gives way: 0.45 of the 2.09 mm pitch of 30 grooves on 20 mm.
    expect(knurlSettings({ width: 20, height: 10, knurlPattern: "round", knurlCount: 30, knurlDepth: 3 }).depth).toBeCloseTo((0.45 * Math.PI * 20) / 30, 9);
    expect(knurlSettings({ width: 20, height: 10, knurlPattern: "straight", knurlCount: 30, knurlDepth: 3 }).depth).toBeCloseTo(3, 9);
    expect(normalizeKnurlPattern("round")).toBe("round");
  });

  it("cuts away more for crossed grooves than for straight ones", () => {
    const fields = { width: 20, height: 12, knurlCount: 24, knurlDepth: 0.8, knurlAngle: 30 };
    const straight = signedVolume(soup(createKnurlGeometry({ ...fields, knurlPattern: "straight" })));
    const diamond = signedVolume(soup(createKnurlGeometry({ ...fields, knurlPattern: "diamond" })));
    expect(diamond).toBeLessThan(straight);
  });
});

describe("knurling mesh size", () => {
  it("keeps a long, steep grip with as many grooves as fit within a reasonable number of triangles", () => {
    const geometry = createKnurlGeometry({ width: 20, height: 160, knurlPattern: "diamond", knurlCount: 180, knurlDepth: 0.4, knurlAngle: 60 });
    const triangles = geometry.getAttribute("position").count / 3;
    expect(triangles).toBeLessThan(300_000);
    expect(signedVolume(soup(geometry))).toBeGreaterThan(0);
  });
});

describe("knurling chamfer", () => {
  for (const pattern of ["straight", "diamond", "round"] as const) {
    it(`chamfers both ends of ${pattern} knurling at 45 degrees and stays closed`, () => {
      const positions = soup(createKnurlGeometry({ width: 20, height: 12, knurlPattern: pattern, knurlCount: 24, knurlDepth: 0.8, knurlChamfer: 1.5 }));
      expect(() => validateClosedSolidTriangleSoup(positions, pattern)).not.toThrow();
      expect(signedVolume(positions)).toBeGreaterThan(0);
      // On the end faces nothing reaches past the radius less the chamfer.
      for (let i = 0; i < positions.length; i += 3) {
        const y = positions[i + 1];
        const r = Math.hypot(positions[i], positions[i + 2]);
        expect(r).toBeLessThanOrEqual(10 - 1.5 + Math.min(y, 12 - y) + 1e-4);
      }
    });
  }

  it("keeps the chamfer short of the middle and inside a quarter of the diameter", () => {
    expect(knurlSettings({ width: 20, height: 4, knurlChamfer: 9 }).chamfer).toBeCloseTo(1.95, 9);
    expect(knurlSettings({ width: 8, height: 40, knurlChamfer: 9 }).chamfer).toBeCloseTo(2, 9);
    expect(knurlSettings({ width: 20, height: 10 }).chamfer).toBe(0);
  });
});
