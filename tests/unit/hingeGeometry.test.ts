import { describe, expect, it } from "vitest";
import { hingeLocalParts, hingePlan, hingeTriangles, normalizeHingeKnuckles, normalizeHingeLeafThickness, normalizeHingePinDiameter } from "@/lib/hingeGeometry";

type V = [number, number, number];

function weld(triangles: V[][]) {
  const ids = new Map<string, number>();
  const id = (v: V) => {
    const key = v.map((n) => Math.round(n * 1e5)).join(",");
    if (!ids.has(key)) ids.set(key, ids.size);
    return ids.get(key)!;
  };
  return triangles.map((t) => t.map(id) as [number, number, number]);
}

/** Every directed edge appears once and its reverse once: closed, consistently wound, two-manifold. */
function edgeProblems(triangles: V[][]) {
  const faces = weld(triangles);
  const directed = new Map<string, number>();
  faces.forEach(([a, b, c]) => {
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      if (p === q) continue;
      const key = `${p}>${q}`;
      directed.set(key, (directed.get(key) ?? 0) + 1);
    }
  });
  let problems = 0;
  directed.forEach((count, key) => {
    const [p, q] = key.split(">");
    if (count !== 1 || directed.get(`${q}>${p}`) !== 1) problems += 1;
  });
  return problems;
}

function signedVolume(triangles: V[][]) {
  return triangles.reduce((sum, [a, b, c]) => sum + (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6, 0);
}

function components(triangles: V[][]) {
  const faces = weld(triangles);
  const parent = new Map<number, number>();
  const find = (x: number): number => { const p = parent.get(x) ?? x; if (p === x) return x; const r = find(p); parent.set(x, r); return r; };
  faces.forEach(([a, b, c]) => { parent.set(find(b), find(a)); parent.set(find(c), find(a)); });
  return new Set(faces.map(([a]) => find(a))).size;
}

const shape = { width: 40, depth: 40, height: 8 };

describe("hinge geometry", () => {
  it("is closed, wound outwards and in two separate parts", () => {
    const triangles = hingeTriangles(shape);
    expect(edgeProblems(triangles)).toBe(0);
    expect(signedVolume(triangles)).toBeGreaterThan(0);
    expect(components(triangles)).toBe(2);
  });

  it("stays closed for other sizes, counts and settings", () => {
    for (const fields of [
      { width: 25, depth: 30, height: 6, hingeKnuckles: 3 },
      { width: 80, depth: 60, height: 12, hingeKnuckles: 9, hingePinDiameter: 5, hingeLeafThickness: 3, hingeClearance: 0.25 },
      { width: 40, depth: 40, height: 8, hingeClearance: 1, sides: 24 },
    ]) {
      const triangles = hingeTriangles(fields);
      expect(edgeProblems(triangles)).toBe(0);
      expect(signedVolume(triangles)).toBeGreaterThan(0);
      expect(components(triangles)).toBe(2);
    }
  });

  it("fills its frame: width along the axis, both leaves across, the knuckle as height", () => {
    const points = hingeTriangles(shape).flat();
    const range = (i: number) => [Math.min(...points.map((p) => p[i])), Math.max(...points.map((p) => p[i]))];
    expect(range(0)).toEqual([-20, 20]);
    expect(range(1)[0]).toBeCloseTo(0, 6);
    expect(range(1)[1]).toBeCloseTo(8, 1);
    expect(range(2)).toEqual([-20, 20]);
  });

  it("keeps the clearance between the parts", () => {
    const plan = hingePlan(shape);
    // B's bore is wider than the pin by the clearance, the knuckles keep a gap of it.
    expect(plan.boreRadius - plan.pinRadius).toBeCloseTo(0.4, 9);
    plan.segments.slice(1).forEach((segment, i) => expect(segment.x0 - plan.segments[i].x1).toBeCloseTo(0.4, 9));
    // A leaf's top corner, its closest point to the other part's round knuckle, keeps the clearance.
    expect(Math.hypot(plan.leafStart, plan.radius - plan.leaf) - plan.radius).toBeCloseTo(0.4, 9);
    // So does every point of the display mesh's knuckles: the nearest leaf corner is that far away.
    const corner = { u: -plan.leafStart, v: plan.leaf };
    const bKnuckle = hingeTriangles(shape).flat().filter(([x, y, z]) => Math.abs(x - plan.segments[1].x0) < 1e-6 && z < 0 && y > 0);
    expect(bKnuckle.length).toBeGreaterThan(10);
    const closest = Math.min(...bKnuckle.map(([, y, z]) => Math.hypot(z - corner.u, y - corner.v)));
    expect(closest).toBeGreaterThanOrEqual(0.4 - 1e-6);
    // And stays below B's bore.
    expect(plan.leaf).toBeLessThanOrEqual(plan.radius - plan.boreRadius + 1e-9);
    expect(plan.segments.map((segment) => segment.owner)).toEqual(["a", "b", "a", "b", "a"]);
  });

  it("keeps the settings printable", () => {
    expect(normalizeHingeKnuckles(4)).toBe(5);
    expect(normalizeHingeKnuckles(15, 10, 0.4)).toBeLessThan(15);
    expect(normalizeHingePinDiameter(20, 8)).toBeLessThan(8);
    expect(normalizeHingeLeafThickness(10, 8, 3, 0.4)).toBeCloseTo(4 - 1.5 - 0.4, 9);
  });

  it("splits into parts the CAD kernel knows, covering the frame", () => {
    const parts = hingeLocalParts(shape);
    expect(new Set(parts.map((part) => part.kind))).toEqual(new Set(["box", "cylinder", "tube"]));
    expect(parts.filter((part) => part.kind === "tube")).toHaveLength(2);
    expect(parts.filter((part) => part.kind === "cylinder")).toHaveLength(4);
  });
});
