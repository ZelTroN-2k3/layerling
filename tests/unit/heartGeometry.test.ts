import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import {
  buildHeartContourPoints,
  createHeartGeometry,
  normalizeHeartQuality,
  normalizeHeartTipFillet,
  heartSettings,
} from "@/lib/heartGeometry";

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
    volume += ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
  }
  return volume / 6;
}

describe("heart geometry", () => {
  it("creates a closed, watertight 2-manifold heart with sharp tip", () => {
    const geometry = createHeartGeometry({
      width: 40,
      depth: 40,
      height: 10,
      heartTipFillet: 0,
      heartQuality: 32,
    });
    const position = geometry.getAttribute("position");

    expect(position.count).toBeGreaterThan(40);
    expect(signedVolume(position)).toBeGreaterThan(0);
    expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);

    expect(geometry.boundingBox?.min.y).toBeCloseTo(0, 4);
    expect(geometry.boundingBox?.max.y).toBeCloseTo(10, 4);
    expect((geometry.boundingBox?.max.x ?? 0) - (geometry.boundingBox?.min.x ?? 0)).toBeCloseTo(40, 3);
    expect((geometry.boundingBox?.max.z ?? 0) - (geometry.boundingBox?.min.z ?? 0)).toBeCloseTo(40, 3);
  });

  it("creates a closed, watertight 2-manifold heart with rounded tip", () => {
    const geometry = createHeartGeometry({
      width: 50,
      depth: 50,
      height: 12,
      heartTipFillet: 4,
      heartQuality: 32,
    });
    const position = geometry.getAttribute("position");

    expect(signedVolume(position)).toBeGreaterThan(0);
    expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);
    expect(geometry.boundingBox?.min.y).toBeCloseTo(0, 4);
    expect(geometry.boundingBox?.max.y).toBeCloseTo(12, 4);
  });

  it("participates cleanly in CSG boolean operations", () => {
    const heartGeom = createHeartGeometry({
      width: 30,
      depth: 30,
      height: 10,
      heartTipFillet: 1,
      heartQuality: 16,
    });
    const boxGeom = new THREE.BoxGeometry(40, 10, 40);
    boxGeom.translate(0, 5, 0);

    const boxBrush = new Brush(boxGeom);
    const heartBrush = new Brush(heartGeom);
    boxBrush.updateMatrixWorld(true);
    heartBrush.updateMatrixWorld(true);

    const evaluator = new Evaluator();
    evaluator.useGroups = false;
    evaluator.attributes = ["position", "normal"];
    const result = evaluator.evaluate(boxBrush, heartBrush, SUBTRACTION);
    const pos = result.geometry.getAttribute("position");
    expect(pos.count).toBeGreaterThan(0);
    expect(signedVolume(pos)).toBeGreaterThan(0);
  });

  it("normalizes heart settings cleanly", () => {
    expect(normalizeHeartTipFillet(-1)).toBe(0);
    expect(normalizeHeartTipFillet(50)).toBe(20);
    expect(normalizeHeartTipFillet(undefined)).toBe(0);

    expect(normalizeHeartQuality(4)).toBe(16);
    expect(normalizeHeartQuality(100)).toBe(64);
    expect(normalizeHeartQuality(undefined)).toBe(32);

    const settings = heartSettings({
      width: 30,
      depth: 30,
      heartTipFillet: 2.5,
      heartQuality: 24,
    });
    expect(settings).toEqual({
      tipFillet: 2.5,
      quality: 24,
    });
  });

  it("produces a simple non-self-intersecting 2D contour without internal seams", () => {
    const points = buildHeartContourPoints(40, 40, 0, 32);
    // Das Cleft-Minimum (Spalt oben) liegt bei x=0
    const cleftIndex = points.findIndex((p, idx) => idx > 0 && Math.abs(p.x) < 1e-4);
    expect(cleftIndex).toBeGreaterThan(0);

    // Vor dem Cleft (rechter Lappen) muss x >= 0 sein
    for (let i = 1; i < cleftIndex; i += 1) {
      expect(points[i].x).toBeGreaterThanOrEqual(-1e-4);
    }
    // Nach dem Cleft (linker Lappen) muss x <= 0 sein
    for (let i = cleftIndex + 1; i < points.length; i += 1) {
      expect(points[i].x).toBeLessThanOrEqual(1e-4);
    }

    // Polygon-Triangulierung muss exakt N - 2 Dreiecke ohne Fehlstellen ergeben
    const v2 = points.map((p) => new THREE.Vector2(p.x, p.y));
    const faces = THREE.ShapeUtils.triangulateShape(v2, []);
    expect(faces.length).toBe(points.length - 2);
  });
});
