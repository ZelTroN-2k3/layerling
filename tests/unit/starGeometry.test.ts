import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import {
  createStarGeometry,
  normalizeStarInnerFillet,
  normalizeStarInnerSize,
  normalizeStarOuterFillet,
  normalizeStarPoints,
  normalizeStarQuality,
  starMaxFilletRadii,
  starSettings,
} from "@/lib/starGeometry";

function edgeUseCounts(position: { count: number; getX: (index: number) => number; getY: (index: number) => number; getZ: (index: number) => number }) {
  const uses = new Map<string, number>();
  const keyForPoint = (index: number) => [position.getX(index), position.getY(index), position.getZ(index)]
    .map((value) => value.toFixed(5))
    .join(",");
  for (let index = 0; index + 2 < position.count; index += 3) {
    const triangle = [keyForPoint(index), keyForPoint(index + 1), keyForPoint(index + 2)];
    for (let edge = 0; edge < 3; edge += 1) {
      const a = triangle[edge];
      const b = triangle[(edge + 1) % 3];
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      uses.set(key, (uses.get(key) ?? 0) + 1);
    }
  }
  return uses;
}

function signedVolume(position: { count: number; getX: (index: number) => number; getY: (index: number) => number; getZ: (index: number) => number }) {
  let volume = 0;
  for (let i = 0; i + 2 < position.count; i += 3) {
    const ax = position.getX(i), ay = position.getY(i), az = position.getZ(i);
    const bx = position.getX(i + 1), by = position.getY(i + 1), bz = position.getZ(i + 1);
    const cx = position.getX(i + 2), cy = position.getY(i + 2), cz = position.getZ(i + 2);
    // Dot product of a with cross product of b and c:
    volume += ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
  }
  return volume / 6;
}

describe("star geometry", () => {
  it("creates a closed, watertight 2-manifold star with sharp corners", () => {
    const geometry = createStarGeometry({
      width: 40,
      depth: 40,
      height: 10,
      starPoints: 5,
      starInnerSize: 20,
      starOuterFillet: 0,
      starInnerFillet: 0,
    });
    const position = geometry.getAttribute("position");

    expect(position.count).toBeGreaterThan(30);
    expect(signedVolume(position)).toBeGreaterThan(0);
    expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);
    expect(geometry.boundingBox?.min.y).toBeCloseTo(0, 4);
    expect(geometry.boundingBox?.max.y).toBeCloseTo(10, 4);
    // Bei 5 Spitzen liegen die seitlichen Spitzen bei +/- 18 Grad zur X-Achse
    expect((geometry.boundingBox?.max.x ?? 0) - (geometry.boundingBox?.min.x ?? 0)).toBeCloseTo(40 * Math.cos(Math.PI / 10), 3);
    expect((geometry.boundingBox?.max.z ?? 0) - (geometry.boundingBox?.min.z ?? 0)).toBeGreaterThan(30);
  });

  it("creates a closed, watertight 2-manifold star with fillets on inner and outer tips", () => {
    const geometry = createStarGeometry({
      width: 50,
      depth: 50,
      height: 15,
      starPoints: 6,
      starInnerSize: 25,
      starOuterFillet: 3,
      starInnerFillet: 2,
    });
    const position = geometry.getAttribute("position");

    expect(position.count).toBeGreaterThan(60);
    expect(signedVolume(position)).toBeGreaterThan(0);
    expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);
    expect(geometry.boundingBox?.min.y).toBeCloseTo(0, 4);
    expect(geometry.boundingBox?.max.y).toBeCloseTo(15, 4);
  });

  it("handles extreme fillet requests without self-intersection", () => {
    const geometry = createStarGeometry({
      width: 40,
      depth: 40,
      height: 10,
      starPoints: 5,
      starInnerSize: 20,
      starOuterFillet: 50, // weit groesser als die Kantenlaenge
      starInnerFillet: 50,
    });
    const position = geometry.getAttribute("position");

    expect(signedVolume(position)).toBeGreaterThan(0);
    expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);
  });

  it("handles 3-pointed stars correctly", () => {
    const flatStar = createStarGeometry({
      width: 40,
      depth: 40,
      height: 10,
      starPoints: 3,
      starInnerSize: 20, // default inner size where collinear
      starOuterFillet: 2,
      starInnerFillet: 2,
    });
    const flatPos = flatStar.getAttribute("position");
    expect(signedVolume(flatPos)).toBeGreaterThan(0);
    expect([...edgeUseCounts(flatPos).values()].every((uses) => uses === 2)).toBe(true);

    const deepStar = createStarGeometry({
      width: 40,
      depth: 40,
      height: 10,
      starPoints: 3,
      starInnerSize: 10, // deep valleys
      starOuterFillet: 1.5,
      starInnerFillet: 1.5,
    });
    const deepPos = deepStar.getAttribute("position");
    expect(deepPos.count).toBeGreaterThan(60);
    expect(signedVolume(deepPos)).toBeGreaterThan(0);
    expect([...edgeUseCounts(deepPos).values()].every((uses) => uses === 2)).toBe(true);
  });

  it("participates cleanly in CSG boolean operations", () => {
    const starGeom = createStarGeometry({
      width: 30,
      depth: 30,
      height: 10,
      starPoints: 5,
      starInnerSize: 15,
      starOuterFillet: 1,
      starInnerFillet: 1,
      starQuality: 4,
    });
    const boxGeom = new THREE.BoxGeometry(40, 10, 40);
    boxGeom.translate(0, 5, 0);

    const boxBrush = new Brush(boxGeom);
    const starBrush = new Brush(starGeom);
    boxBrush.updateMatrixWorld(true);
    starBrush.updateMatrixWorld(true);

    const evaluator = new Evaluator();
    evaluator.useGroups = false;
    evaluator.attributes = ["position", "normal"];
    const result = evaluator.evaluate(boxBrush, starBrush, SUBTRACTION);
    const pos = result.geometry.getAttribute("position");
    expect(pos.count).toBeGreaterThan(0);
    expect(signedVolume(pos)).toBeGreaterThan(0);
  });

  it("normalizes star settings cleanly", () => {
    expect(normalizeStarPoints(2)).toBe(3);
    expect(normalizeStarPoints(100)).toBe(32);
    expect(normalizeStarPoints(undefined)).toBe(5);

    expect(normalizeStarInnerSize(undefined, 40)).toBe(20);
    expect(normalizeStarInnerSize(50, 40)).toBe(39.9);
    expect(normalizeStarInnerSize(-5, 40)).toBe(0.1);

    expect(normalizeStarOuterFillet(-2)).toBe(0);
    expect(normalizeStarOuterFillet(undefined)).toBe(0);

    expect(normalizeStarQuality(2)).toBe(4);
    expect(normalizeStarQuality(100)).toBe(48);
    expect(normalizeStarQuality(undefined)).toBe(16);

    const limits = starMaxFilletRadii(40, 20, 5);
    expect(limits.maxOuterRadius).toBeGreaterThan(1);
    expect(limits.maxOuterRadius).toBeLessThan(10);
    expect(limits.maxInnerRadius).toBeGreaterThan(1);
    expect(limits.maxInnerRadius).toBeLessThan(30);

    const settings = starSettings({
      width: 30,
      depth: 30,
      starPoints: 8,
      starInnerSize: 15,
      starOuterFillet: 1.5,
      starInnerFillet: 1.0,
      starQuality: 24,
    });
    expect(settings).toEqual({
      points: 8,
      innerSize: 15,
      outerFillet: 1.5,
      innerFillet: 1.0,
      quality: 24,
    });
  });
});
