import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { Brush, Evaluator, SUBTRACTION } from "three-bvh-csg";
import {
  buildHoneycombHoles,
  createHoneycombGeometry,
  normalizeHoneycombCellSize,
  normalizeHoneycombFrameWidth,
  normalizeHoneycombWallThickness,
} from "@/lib/honeycombGeometry";

function edgeKey(a: number, b: number): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

function edgeUseCounts(geometry: THREE.BufferGeometry): Map<string, number> {
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const quant = 1000;
  const keyFor = (i: number) =>
    `${Math.round(position.getX(i) * quant)},${Math.round(position.getY(i) * quant)},${Math.round(position.getZ(i) * quant)}`;

  const counts = new Map<string, number>();
  const triCount = index ? index.count : position.count;
  for (let i = 0; i + 2 < triCount; i += 3) {
    const a = index ? index.getX(i) : i;
    const b = index ? index.getX(i + 1) : i + 1;
    const c = index ? index.getX(i + 2) : i + 2;
    const k1 = keyFor(a);
    const k2 = keyFor(b);
    const k3 = keyFor(c);
    const edges = [edgeKey(k1, k2), edgeKey(k2, k3), edgeKey(k3, k1)];
    for (const edge of edges) {
      counts.set(edge, (counts.get(edge) ?? 0) + 1);
    }
  }
  return counts;
}

function signedVolume(geometry: THREE.BufferGeometry): number {
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  let volume = 0;
  const triCount = index ? index.count : position.count;
  for (let i = 0; i + 2 < triCount; i += 3) {
    const a = index ? index.getX(i) : i;
    const b = index ? index.getX(i + 1) : i + 1;
    const c = index ? index.getX(i + 2) : i + 2;
    const ax = position.getX(a), ay = position.getY(a), az = position.getZ(a);
    const bx = position.getX(b), by = position.getY(b), bz = position.getZ(b);
    const cx = position.getX(c), cy = position.getY(c), cz = position.getZ(c);
    volume += ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
  }
  return volume / 6;
}

describe("honeycomb geometry", () => {
  it("normalizes honeycomb parameters safely", () => {
    expect(normalizeHoneycombCellSize(undefined)).toBe(8);
    expect(normalizeHoneycombCellSize(0)).toBe(2);
    expect(normalizeHoneycombCellSize(12.34)).toBe(12.3);
    expect(normalizeHoneycombCellSize(200)).toBe(100);

    expect(normalizeHoneycombWallThickness(undefined)).toBe(1.6);
    expect(normalizeHoneycombWallThickness(0)).toBe(0.4);
    expect(normalizeHoneycombWallThickness(1.58)).toBe(1.6);
    expect(normalizeHoneycombWallThickness(100)).toBe(50);

    expect(normalizeHoneycombFrameWidth(undefined)).toBe(3);
    expect(normalizeHoneycombFrameWidth(-5)).toBe(0);
    expect(normalizeHoneycombFrameWidth(4.26)).toBe(4.3);
    expect(normalizeHoneycombFrameWidth(150)).toBe(100);
  });

  it("creates a closed, watertight 2-manifold honeycomb grid with exact bounding box", () => {
    const geometry = createHoneycombGeometry({
      width: 60,
      depth: 60,
      height: 3,
      honeycombCellSize: 8,
      honeycombWallThickness: 1.6,
      honeycombFrameWidth: 3,
    });
    const position = geometry.getAttribute("position");

    expect(signedVolume(geometry)).toBeGreaterThan(0);
    expect([...edgeUseCounts(geometry).values()].every((uses) => uses === 2)).toBe(true);

    expect(geometry.boundingBox?.min.x).toBeCloseTo(-30, 3);
    expect(geometry.boundingBox?.max.x).toBeCloseTo(30, 3);
    expect(geometry.boundingBox?.min.y).toBeCloseTo(0, 4);
    expect(geometry.boundingBox?.max.y).toBeCloseTo(3, 4);
    expect(geometry.boundingBox?.min.z).toBeCloseTo(-30, 3);
    expect(geometry.boundingBox?.max.z).toBeCloseTo(30, 3);
  });

  it("handles extreme parameter combinations without crashing", () => {
    // Wenn die Waben zu groß für die Fläche sind, entsteht eine geschlossene, solide Platte
    const geometry = createHoneycombGeometry({
      width: 20,
      depth: 20,
      height: 2,
      honeycombCellSize: 40,
      honeycombWallThickness: 2,
      honeycombFrameWidth: 5,
    });

    expect(signedVolume(geometry)).toBeGreaterThan(0);
    expect([...edgeUseCounts(geometry).values()].every((uses) => uses === 2)).toBe(true);
    expect(geometry.boundingBox?.max.y).toBeCloseTo(2, 4);
  });

  it("participates cleanly in CSG boolean operations", () => {
    const honeycombGeom = createHoneycombGeometry({
      width: 40,
      depth: 40,
      height: 4,
      honeycombCellSize: 8,
      honeycombWallThickness: 1.6,
      honeycombFrameWidth: 3,
    });
    const boxGeom = new THREE.BoxGeometry(50, 4, 50);
    boxGeom.translate(0, 2, 0);

    const boxBrush = new Brush(boxGeom);
    const honeycombBrush = new Brush(honeycombGeom);
    boxBrush.updateMatrixWorld(true);
    honeycombBrush.updateMatrixWorld(true);

    const evaluator = new Evaluator();
    evaluator.useGroups = false;
    evaluator.attributes = ["position", "normal"];
    const result = evaluator.evaluate(boxBrush, honeycombBrush, SUBTRACTION);
    const pos = result.geometry.getAttribute("position");
    expect(pos.count).toBeGreaterThan(0);
    expect(signedVolume(result.geometry)).toBeGreaterThan(0);
  });

  it("generates half-hexagons at lateral borders when full hexagons do not fit", () => {
    // 70x70 mit 8mm Waben: Auf den alternierenden Zeilen finden links und rechts jeweils halbe Waben Platz
    const holes = buildHoneycombHoles(70, 70, 8, 1.6, 3);
    const halfHoles = holes.filter((h) => h.length === 4);
    const fullHoles = holes.filter((h) => h.length === 6);

    expect(fullHoles.length).toBe(39);
    expect(halfHoles.length).toBe(6);
    expect(holes.length).toBe(45);

    // Alle Vertizes der halben Waben müssen strikt innerhalb der Rahmenbegrenzung liegen
    for (const h of halfHoles) {
      for (const pt of h) {
        expect(pt.x).toBeGreaterThanOrEqual(-32);
        expect(pt.x).toBeLessThanOrEqual(32);
        expect(pt.y).toBeGreaterThanOrEqual(-32);
        expect(pt.y).toBeLessThanOrEqual(32);
      }
    }
  });

  it("produces no spurious internal edge lines on top or bottom faces across parameter variations", () => {
    const testCases = [
      { w: 60, d: 60, h: 3, s: 8, t: 1.6, f: 3 },
      { w: 70, d: 70, h: 3, s: 8, t: 1.6, f: 3 },
      { w: 40, d: 60, h: 3, s: 10, t: 1.6, f: 3 },
      { w: 60, d: 60, h: 3, s: 5, t: 1.6, f: 3 },
      { w: 80, d: 50, h: 4, s: 6, t: 1.2, f: 2 },
    ];

    for (const tc of testCases) {
      const geom = createHoneycombGeometry({
        width: tc.w,
        depth: tc.d,
        height: tc.h,
        honeycombCellSize: tc.s,
        honeycombWallThickness: tc.t,
        honeycombFrameWidth: tc.f,
      });

      // Watertight 2-manifold
      expect([...edgeUseCounts(geom).values()].every((uses) => uses === 2)).toBe(true);

      const holes = buildHoneycombHoles(tc.w, tc.d, tc.s, tc.t, tc.f);
      const expectedHolePerimeterEdges = holes.reduce((acc, h) => acc + h.length, 0);
      const expectedTopEdges = 4 + expectedHolePerimeterEdges;

      const edgesGeom = new THREE.EdgesGeometry(geom, 14);
      const pos = edgesGeom.getAttribute("position");

      let topEdgesCount = 0;
      for (let i = 0; i < pos.count; i += 2) {
        if (Math.abs(pos.getY(i) - tc.h) < 1e-3 && Math.abs(pos.getY(i + 1) - tc.h) < 1e-3) {
          topEdgesCount++;
        }
      }

      // Exakt die 4 Außenkanten + Loch-Umfangskanten, null interne Naht- oder Störlinien!
      expect(topEdgesCount).toBe(expectedTopEdges);
    }
  });
});
