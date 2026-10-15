import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import * as THREE from "three";
import { beforeAll, describe, expect, it } from "vitest";
import { MAX_TEXT_EDGE, MIN_TEXT_EDGE, normalizeTextEdge, textEdgeLevels, textHasEdge } from "@/lib/textEdge";
import { loftedTextEdge } from "@/lib/textEdgeLoft";
import { textDisplayGeometry, textEdgeGeometry } from "@/lib/textFill";
import { loadTextFonts } from "@/lib/textFonts";
import { loadedManifoldRuntime } from "@/lib/manifoldHandle";
import type { WorkplaneShape } from "@/types/layerling";

// #225: the top edge of a text's letters, rounded or chamfered.
let runtime: ManifoldToplevel;

beforeAll(async () => {
  runtime = await manifoldModule();
  runtime.setup();
  await loadTextFonts();
});

function text(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "t", name: "Text", kind: "text", color: "#f00", x: 0, z: 0, rotation: 0,
    width: 60, depth: 20, height: 3, size: 60, text: "Oga", ...overrides,
  };
}

/** Every edge of a triangle mesh is shared by exactly two triangles, once each way round: a closed solid. */
function isClosed(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const keyOf = (i: number) => `${position.getX(i)},${position.getY(i)},${position.getZ(i)}`;
  const count = index ? index.count : position.count;
  const vertex = (n: number) => (index ? index.getX(n) : n);
  const edges = new Map<string, number>();
  for (let n = 0; n + 2 < count; n += 3) {
    const keys = [keyOf(vertex(n)), keyOf(vertex(n + 1)), keyOf(vertex(n + 2))];
    for (let corner = 0; corner < 3; corner += 1) {
      const from = keys[corner];
      const to = keys[(corner + 1) % 3];
      if (from === to) continue;
      edges.set(`${from}>${to}`, (edges.get(`${from}>${to}`) ?? 0) + 1);
    }
  }
  return [...edges].every(([edge, times]) => {
    const [from, to] = edge.split(">");
    return times === 1 && edges.get(`${to}>${from}`) === 1;
  });
}

function volume(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const count = index ? index.count : position.count;
  const vertex = (n: number) => (index ? index.getX(n) : n);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let total = 0;
  for (let n = 0; n + 2 < count; n += 3) {
    a.fromBufferAttribute(position, vertex(n));
    b.fromBufferAttribute(position, vertex(n + 1));
    c.fromBufferAttribute(position, vertex(n + 2));
    total += a.dot(b.clone().cross(c)) / 6;
  }
  return total;
}

describe("letter edge (#225)", () => {
  it("takes a round or chamfer edge with a size, and nothing else", () => {
    expect(normalizeTextEdge({ kind: "round", size: 0.4 })).toEqual({ kind: "round", size: 0.4 });
    expect(normalizeTextEdge({ kind: "chamfer", size: 99 })).toEqual({ kind: "chamfer", size: MAX_TEXT_EDGE });
    expect(normalizeTextEdge({ kind: "chamfer", size: 0 })).toEqual({ kind: "chamfer", size: MIN_TEXT_EDGE });
    expect(normalizeTextEdge({ kind: "bevel", size: 1 })).toBeUndefined();
    expect(normalizeTextEdge({ kind: "round" })).toBeUndefined();
    expect(normalizeTextEdge(null)).toBeUndefined();
    expect(textHasEdge(text({ textEdge: { kind: "round", size: 0.4 } }))).toBe(true);
    expect(textHasEdge(text())).toBe(false);
  });

  it("steps in along a quarter circle for round and along a slope for chamfer", () => {
    const round = textEdgeLevels({ kind: "round", size: 2 }, 4);
    expect(round[0]).toEqual({ height: 0, inset: 0 });
    expect(round[4].height).toBeCloseTo(2);
    expect(round[4].inset).toBeCloseTo(2);
    // At half the way up a circle has come in only 0.29 of its radius, a slope 1.0.
    expect(round[2].inset).toBeCloseTo(2 * (1 - Math.SQRT1_2));
    const chamfer = textEdgeLevels({ kind: "chamfer", size: 2 }, 2);
    expect(chamfer[1]).toEqual({ height: 1, inset: 1 });
  });

  it("builds a closed solid with the letters' height and a smaller top", () => {
    const plain = text();
    for (const kind of ["round", "chamfer"] as const) {
      const edged = text({ textEdge: { kind, size: 0.6 } });
      const geometry = textEdgeGeometry(runtime, edged)!;
      expect(geometry, kind).not.toBeNull();
      geometry.computeBoundingBox();
      expect(geometry.boundingBox!.min.y).toBeCloseTo(0, 4);
      expect(geometry.boundingBox!.max.y).toBeCloseTo(3, 4);
      expect(isClosed(geometry), `${kind} is a closed solid`).toBe(true);
      // Taking a rounded or chamfered edge off the top takes volume off.
      const full = textDisplayGeometry({ ...plain });
      expect(volume(geometry)).toBeLessThan(volume(full));
      expect(volume(geometry)).toBeGreaterThan(volume(full) * 0.9);
    }
  });

  it("is one smooth skin where the outlines allow it: a few times the plain text's triangles, not dozens", () => {
    const triangles = (g: THREE.BufferGeometry) => (g.getIndex() ? g.getIndex()!.count : g.getAttribute("position").count) / 3;
    const plain = triangles(textDisplayGeometry(text()));
    const round = triangles(textEdgeGeometry(runtime, text({ textEdge: { kind: "round", size: 0.5 } }))!);
    const chamfer = triangles(textEdgeGeometry(runtime, text({ textEdge: { kind: "chamfer", size: 0.5 } }))!);
    expect(round).toBeLessThan(plain * 8);
    // A chamfer is one slope: a band of triangles and the caps, not eight levels.
    expect(chamfer).toBeLessThan(plain * 3);
  });

  it("falls back to slabs where a thin stroke would fold the skin, and still stands", () => {
    // An edge as wide as half the stroke is more than the letters can take at their thinnest.
    const geometry = textEdgeGeometry(runtime, text({ height: 4, textEdge: { kind: "round", size: 3 } }));
    expect(geometry).not.toBeNull();
    expect(isClosed(geometry!)).toBe(true);
  });

  it("works on a wider layer, and with a key ring hole", () => {
    const wider = text({ textStroke: { width: 1.5, align: "grow", join: "round", cap: "flat" }, width: 63, depth: 23, textEdge: { kind: "chamfer", size: 0.5 } });
    const geometry = textEdgeGeometry(runtime, wider)!;
    expect(geometry).not.toBeNull();
    expect(isClosed(geometry)).toBe(true);
  });

  it("builds nothing from nothing", () => {
    expect(textEdgeGeometry(runtime, text({ textEdge: undefined }))).toBeNull();
    expect(loftedTextEdge([], [])).toBeNull();
  });

  it("lofts a square with a square hole into a closed solid with the right volume", () => {
    // Levels of an outline stepped in by a chamfer of 1: the outer ring shrinks, the hole grows.
    const square = (from: number, to: number, clockwise = false) => {
      const ring = [{ x: from, z: from }, { x: to, z: from }, { x: to, z: to }, { x: from, z: to }];
      return clockwise ? [...ring].reverse() : ring;
    };
    const levels = [
      [square(0, 10), square(4, 6, true)],
      [square(1, 9), square(3, 7, true)],
    ];
    const skin = loftedTextEdge(levels, [3, 4])!;
    expect(skin).not.toBeNull();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(skin.positions, 3));
    geometry.setIndex(skin.indices);
    expect(isClosed(geometry)).toBe(true);
    // The plate 10 x 10 x 3 less the 2 x 2 hole, and a frustum from 10 x 10 to 8 x 8 (hole 2 -> 4) one high on top.
    expect(volume(geometry)).toBeGreaterThan(300 - 12);
    expect(volume(geometry)).toBeLessThan(400);
  });

  it("builds nothing where a level has lost or gained a ring", () => {
    const square = (from: number, to: number) => [{ x: from, z: from }, { x: to, z: from }, { x: to, z: to }, { x: from, z: to }];
    expect(loftedTextEdge([[square(0, 10)], [square(1, 9), square(3, 4)]], [3, 4])).toBeNull();
  });

  it("has no ready kernel in a plain test, so the module's own handle stays empty", () => {
    expect(loadedManifoldRuntime()).toBeNull();
  });
});
