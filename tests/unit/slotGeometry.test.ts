import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import {
  buildSlotContourPoints,
  createSlotGeometry,
  MIN_SLOT_END_RATIO,
  normalizeSlotEndRatio,
} from "@/lib/slotGeometry";

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

describe("slot geometry", () => {
  it("tapers one end (#206): closed, the frame filled, the small end at the long axis' end", () => {
    [[60, 20, "x"], [20, 60, "z"]].forEach(([width, depth, axis]) => {
      const geometry = createSlotGeometry({ width: width as number, depth: depth as number, height: 8, sides: 48, slotEndRatio: 0.4 });
      const position = geometry.getAttribute("position");
      expect(signedVolume(position)).toBeGreaterThan(0);
      expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);
      const box = geometry.boundingBox!;
      expect(box.max.x - box.min.x).toBeCloseTo(width as number, 2);
      expect(box.max.z - box.min.z).toBeCloseTo(depth as number, 2);
      // Near the long axis' end the body is only as wide as the small circle: 0.4 x 20.
      let across = 0;
      for (let i = 0; i < position.count; i += 1) {
        const along = axis === "x" ? position.getX(i) : position.getZ(i);
        const side = axis === "x" ? position.getZ(i) : position.getX(i);
        if (along > 30 - 4.01) across = Math.max(across, Math.abs(side));
      }
      expect(across).toBeLessThanOrEqual(4 + 1e-6);
    });
  });

  it("keeps the plain capsule for a ratio of 1 or none", () => {
    expect(buildSlotContourPoints(40, 20, 32, 1)).toEqual(buildSlotContourPoints(40, 20, 32));
    expect(normalizeSlotEndRatio(0)).toBe(MIN_SLOT_END_RATIO);
    expect(normalizeSlotEndRatio(undefined)).toBe(1);
    expect(normalizeSlotEndRatio(3)).toBe(1);
  });

  it("creates a closed, watertight 2-manifold horizontal slot with exact bounding box", () => {
    const geometry = createSlotGeometry({
      width: 40,
      depth: 20,
      height: 10,
      sides: 32,
    });
    const position = geometry.getAttribute("position");

    expect(position.count).toBeGreaterThan(40);
    expect(signedVolume(position)).toBeGreaterThan(0);
    expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);

    expect(geometry.boundingBox?.min.y).toBeCloseTo(0, 4);
    expect(geometry.boundingBox?.max.y).toBeCloseTo(10, 4);
    expect((geometry.boundingBox?.max.x ?? 0) - (geometry.boundingBox?.min.x ?? 0)).toBeCloseTo(40, 3);
    expect((geometry.boundingBox?.max.z ?? 0) - (geometry.boundingBox?.min.z ?? 0)).toBeCloseTo(20, 3);
  });

  it("creates a closed, watertight 2-manifold vertical slot with exact bounding box", () => {
    const geometry = createSlotGeometry({
      width: 20,
      depth: 50,
      height: 15,
      sides: 32,
    });
    const position = geometry.getAttribute("position");

    expect(signedVolume(position)).toBeGreaterThan(0);
    expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);

    expect(geometry.boundingBox?.min.y).toBeCloseTo(0, 4);
    expect(geometry.boundingBox?.max.y).toBeCloseTo(15, 4);
    expect((geometry.boundingBox?.max.x ?? 0) - (geometry.boundingBox?.min.x ?? 0)).toBeCloseTo(20, 3);
    expect((geometry.boundingBox?.max.z ?? 0) - (geometry.boundingBox?.min.z ?? 0)).toBeCloseTo(50, 3);
  });

  it("handles square dimensions (width === depth) cleanly without duplicate vertices", () => {
    const points = buildSlotContourPoints(30, 30, 32);
    const v2 = points.map((p) => new THREE.Vector2(p.x, p.y));
    const faces = THREE.ShapeUtils.triangulateShape(v2, []);
    expect(faces.length).toBe(points.length - 2);

    const geometry = createSlotGeometry({
      width: 30,
      depth: 30,
      height: 10,
    });
    const position = geometry.getAttribute("position");
    expect(signedVolume(position)).toBeGreaterThan(0);
    expect([...edgeUseCounts(position).values()].every((uses) => uses === 2)).toBe(true);
  });

  it("participates cleanly in CSG boolean operations", () => {
    const slotGeom = createSlotGeometry({
      width: 40,
      depth: 20,
      height: 15,
    });
    const boxGeom = new THREE.BoxGeometry(60, 15, 40);
    boxGeom.translate(0, 7.5, 0);

    const boxBrush = new Brush(boxGeom);
    const slotBrush = new Brush(slotGeom);
    boxBrush.updateMatrixWorld(true);
    slotBrush.updateMatrixWorld(true);

    const evaluator = new Evaluator();
    evaluator.useGroups = false;
    evaluator.attributes = ["position", "normal"];
    const result = evaluator.evaluate(boxBrush, slotBrush, SUBTRACTION);
    const pos = result.geometry.getAttribute("position");
    expect(pos.count).toBeGreaterThan(0);
    expect(signedVolume(pos)).toBeGreaterThan(0);
  });
});
