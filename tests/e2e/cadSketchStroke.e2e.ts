import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel } from "occt-wasm";
import { buildStrokedSketchSolid } from "@/lib/cadSketchStroke";
import type { SketchPoint, SketchProfile, SketchStroke } from "@/types/layerling";

const HEIGHT = 6;
const K = 0.5522847498;

function loop(prefix: string, coordinates: Array<[number, number]>): SketchProfile {
  const points: SketchPoint[] = coordinates.map(([x, z], index) => ({ id: `${prefix}${index}`, x, z }));
  return {
    points,
    segments: points.map((point, index) => ({ id: `${prefix}s${index}`, kind: "line" as const, startId: point.id, endId: points[(index + 1) % points.length].id })),
  };
}

/** A 40 x 30 rectangle whose corner (40, 30) is rounded with radius 10 by one Bezier, as the sketch's fillet draws it. */
function roundedRectangle(): SketchProfile {
  const points: SketchPoint[] = [
    { id: "a", x: 0, z: 0 },
    { id: "b", x: 40, z: 0 },
    { id: "c", x: 40, z: 20, mode: "split", handleOut: { x: 40, z: 20 + 10 * K } },
    { id: "d", x: 30, z: 30, mode: "split", handleIn: { x: 30 + 10 * K, z: 30 } },
    { id: "e", x: 0, z: 30 },
  ];
  return {
    points,
    segments: [
      { id: "ab", kind: "line", startId: "a", endId: "b" },
      { id: "bc", kind: "line", startId: "b", endId: "c" },
      { id: "cd", kind: "bezier", startId: "c", endId: "d" },
      { id: "de", kind: "line", startId: "d", endId: "e" },
      { id: "ea", kind: "line", startId: "e", endId: "a" },
    ],
  };
}

const roundedArea = 40 * 30 - (1 - Math.PI / 4) * 100;
const perimeter = 2 * (40 + 30) - 20 + (Math.PI / 2) * 10;
const stroke = (align: SketchStroke["align"], width: number, join: SketchStroke["join"] = "round"): SketchStroke => ({ width, align, join, cap: "flat" });

/** How many surfaces of each type (1 plane, 2 cylinder, ...) the BREP text lists. */
function surfaceTypes(brep: string) {
  const rows = brep.slice(brep.indexOf("Surfaces"), brep.indexOf("TShapes")).split(String.fromCharCode(10)).map((row) => row.split(" ")[0]);
  const counts: Record<string, number> = {};
  rows.filter((row) => /^\d+$/.test(row)).forEach((row) => { counts[row] = (counts[row] ?? 0) + 1; });
  return counts;
}

describe("a stroked or widened sketch as an exact solid, with the real OCCT kernel", () => {
  let kernel: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    kernel = await OcctKernel.init({ wasm });
  });

  it("makes the frame inside a rounded outline, its arc kept as a cylinder", () => {
    const solid = buildStrokedSketchSolid(kernel, roundedRectangle(), stroke("inside", 2), HEIGHT)!;
    expect(solid).not.toBeNull();
    expect(kernel.isValid(solid)).toBe(true);
    // The inner outline is 36 x 26 with a corner of radius 8.
    const inner = 36 * 26 - (1 - Math.PI / 4) * 64;
    expect(kernel.getVolume(solid)).toBeCloseTo((roundedArea - inner) * HEIGHT, 0);
    const types = surfaceTypes(kernel.toBREP(solid));
    expect(types["2"]).toBe(2);
    expect(Object.values(types).reduce((sum, count) => sum + count, 0)).toBeLessThan(20);
  });

  it("makes the frame outside, with round corners where the outline has sharp ones", () => {
    const solid = buildStrokedSketchSolid(kernel, roundedRectangle(), stroke("outside", 2), HEIGHT)!;
    expect(kernel.isValid(solid)).toBe(true);
    expect(kernel.getVolume(solid)).toBeCloseTo((perimeter * 2 + Math.PI * 4) * HEIGHT, 0);
  });

  it("makes the frame centred on the line, and the outline widened for 'grow'", () => {
    const centred = buildStrokedSketchSolid(kernel, roundedRectangle(), stroke("center", 2), HEIGHT)!;
    expect(kernel.isValid(centred)).toBe(true);
    // Half a width out and half in: the line's length times the width, give or take the corners.
    expect(kernel.getVolume(centred) / HEIGHT).toBeGreaterThan(perimeter * 2 - 8);
    expect(kernel.getVolume(centred) / HEIGHT).toBeLessThan(perimeter * 2 + 8);
    const grown = buildStrokedSketchSolid(kernel, roundedRectangle(), stroke("grow", 2), HEIGHT)!;
    expect(kernel.isValid(grown)).toBe(true);
    expect(kernel.getVolume(grown)).toBeCloseTo((roundedArea + perimeter * 2 + Math.PI * 4) * HEIGHT, 0);
  });

  it("grows the holes smaller and shrinks them wider, as an outline with a hole in it asks", () => {
    const outer = loop("o", [[0, 0], [40, 0], [40, 30], [0, 30]]);
    const hole = loop("h", [[15, 10], [25, 10], [25, 20], [15, 20]]);
    const profile: SketchProfile = { points: [...outer.points, ...hole.points], segments: [...outer.segments, ...hole.segments] };
    const inside = buildStrokedSketchSolid(kernel, profile, stroke("inside", 2, "miter"), HEIGHT)!;
    expect(kernel.isValid(inside)).toBe(true);
    // 40 x 30 with a 10 x 10 hole is 1100; 36 x 26 with a 14 x 14 hole is 740.
    expect(kernel.getVolume(inside)).toBeCloseTo(360 * HEIGHT, 0);
    const grown = buildStrokedSketchSolid(kernel, profile, stroke("grow", 2, "miter"), HEIGHT)!;
    // 44 x 34 with a 6 x 6 hole.
    expect(kernel.getVolume(grown)).toBeCloseTo((44 * 34 - 36) * HEIGHT, 0);
  });

  it("leaves what the kernel cannot do to the polygon stroke", () => {
    expect(buildStrokedSketchSolid(kernel, roundedRectangle(), stroke("inside", 2, "bevel"), HEIGHT)).toBeNull();
    // A stroke wider than the outline is thick: the inside is gone.
    expect(buildStrokedSketchSolid(kernel, roundedRectangle(), stroke("inside", 20), HEIGHT)).toBeNull();
    // A pointed corner would run into a spike.
    const needle = loop("n", [[0, 0], [40, 0], [0, 4]]);
    expect(buildStrokedSketchSolid(kernel, needle, stroke("outside", 2, "miter"), HEIGHT)).toBeNull();
    expect(buildStrokedSketchSolid(kernel, needle, stroke("outside", 2, "round"), HEIGHT)).not.toBeNull();
    // An open line is a stripe, not an outline.
    const open: SketchProfile = {
      points: [{ id: "p", x: 0, z: 0 }, { id: "q", x: 10, z: 0 }, { id: "r", x: 10, z: 10 }],
      segments: [{ id: "pq", kind: "line", startId: "p", endId: "q" }, { id: "qr", kind: "line", startId: "q", endId: "r" }],
    };
    expect(buildStrokedSketchSolid(kernel, open, stroke("center", 2), HEIGHT)).toBeNull();
  });
});
