import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  createLoftGeometry,
  loftFrameSize,
  loftMeasures,
  loftStoredMeasures,
  loftMeasuresPatch,
  loftProfileLoops,
  maxLoftWall,
  normalizeLoftMeasures,
  type LoftShapeFields,
} from "@/lib/loftGeometry";
import { validateCadProfile } from "@/lib/cadProfileSolid";

function loft(fields: Partial<LoftShapeFields>): LoftShapeFields {
  const base: LoftShapeFields = {
    size: 40,
    height: 30,
    loftBottomOutline: "rectangle",
    loftTopOutline: "round",
    loftBottomWidth: 40,
    loftBottomDepth: 40,
    loftTopWidth: 30,
    loftTopDepth: 30,
    loftBottomCorner: 0,
    loftTopCorner: 0,
    loftOffsetX: 0,
    loftOffsetZ: 0,
    loftWall: 0,
    ...fields,
  };
  // The frame is what both ends need, as the catalog and the inspector set it.
  const { width, depth } = loftFrameSize(loftStoredMeasures(base));
  return { width, depth, ...base, ...fields };
}

/** Signed volume and how many edges are not shared by exactly two triangles (0 = closed). */
function meshCheck(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  const key = (i: number) => [position.getX(i), position.getY(i), position.getZ(i)].map((v) => Math.round(v * 1e4)).join(",");
  const ids = new Map<string, number>();
  const id = (i: number) => {
    const k = key(i);
    if (!ids.has(k)) ids.set(k, ids.size);
    return ids.get(k) as number;
  };
  const edges = new Map<string, number>();
  let volume = 0;
  for (let i = 0; i < position.count; i += 3) {
    const [a, b, c] = [0, 1, 2].map((k) => [position.getX(i + k), position.getY(i + k), position.getZ(i + k)]);
    volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    const v = [id(i), id(i + 1), id(i + 2)];
    for (let e = 0; e < 3; e += 1) {
      const [p, q] = [v[e], v[(e + 1) % 3]];
      if (p === q) continue;
      const edge = `${Math.min(p, q)}-${Math.max(p, q)}`;
      edges.set(edge, (edges.get(edge) ?? 0) + 1);
    }
  }
  const open = [...edges.values()].filter((count) => count !== 2).length;
  geometry.computeBoundingBox();
  return { volume, open, box: geometry.boundingBox as THREE.Box3 };
}

describe("transition (loft, #188)", () => {
  it("joins a square to a circle as a closed body facing outwards", () => {
    const { volume, open, box } = meshCheck(createLoftGeometry(loft({})));
    expect(open).toBe(0);
    expect(volume).toBeGreaterThan(0);
    // Between the volume of the circle's and the square's prism.
    expect(volume).toBeLessThan(40 * 40 * 30);
    expect(volume).toBeGreaterThan(Math.PI * 15 * 15 * 30);
    expect(box.min.x).toBeCloseTo(-20, 5);
    expect(box.max.x).toBeCloseTo(20, 5);
    expect(box.min.y).toBeCloseTo(0, 5);
    expect(box.max.y).toBeCloseTo(30, 5);
  });

  it("has the frustum's volume between two squares", () => {
    const shape = loft({ loftBottomOutline: "rectangle", loftTopOutline: "rectangle", loftTopWidth: 20, loftTopDepth: 20 });
    const { volume, open } = meshCheck(createLoftGeometry(shape));
    expect(open).toBe(0);
    const [a, b, h] = [40 * 40, 20 * 20, 30];
    expect(volume).toBeCloseTo((h / 3) * (a + b + Math.sqrt(a * b)), 3);
  });

  it("is a tube open at both ends with a wall", () => {
    const solid = meshCheck(createLoftGeometry(loft({ loftBottomOutline: "round", loftTopOutline: "round", loftBottomWidth: 30, loftBottomDepth: 30, loftTopWidth: 30, loftTopDepth: 30 })));
    const tube = meshCheck(createLoftGeometry(loft({ loftBottomOutline: "round", loftTopOutline: "round", loftBottomWidth: 30, loftBottomDepth: 30, loftTopWidth: 30, loftTopDepth: 30, loftWall: 2 })));
    expect(tube.open).toBe(0);
    expect(tube.volume).toBeGreaterThan(0);
    // A pipe of 30 mm outside, 26 mm inside, 30 mm long - the polygonal mesh a little under the round one.
    const pipe = Math.PI * (15 * 15 - 13 * 13) * 30;
    expect(tube.volume).toBeGreaterThan(pipe * 0.99);
    expect(tube.volume).toBeLessThan(pipe * 1.001);
    expect(solid.volume).toBeGreaterThan(tube.volume);
  });

  it("cuts both ends into the same pieces, starting at the same angle", () => {
    for (const fields of [
      {},
      { loftBottomCorner: 5 },
      { loftBottomOutline: "polygon" as const, loftBottomSides: 6, loftTopOutline: "rectangle" as const },
      { loftBottomOutline: "polygon" as const, loftBottomSides: 5, loftTopOutline: "polygon" as const, loftTopSides: 7, loftOffsetX: 6 },
      { loftWall: 2, loftBottomCorner: 1 },
    ]) {
      const shape = loft(fields);
      const { loops, topLoops } = loftProfileLoops(shape);
      expect(topLoops.length).toBe(loops.length);
      loops.forEach((loop, index) => {
        expect(topLoops[index].segments.length).toBe(loop.segments.length);
        expect(loop.segments.length).toBeGreaterThanOrEqual(4);
      });
      expect(() => validateCadProfile({ kind: "loft", loops, topLoops, height: 30 })).not.toThrow();
      expect(meshCheck(createLoftGeometry(shape)).open).toBe(0);
    }
  });

  it("fills its frame when the frame is dragged bigger, corners and wall keeping their size", () => {
    const shape = loft({ loftBottomCorner: 4, loftWall: 2 });
    const stretched = { ...shape, width: (shape.width as number) * 2 };
    const measures = loftMeasures(stretched);
    expect(measures.bottomWidth).toBeCloseTo(80, 6);
    expect(measures.topWidth).toBeCloseTo(60, 6);
    expect(measures.bottomDepth).toBeCloseTo(40, 6);
    expect(measures.bottomCorner).toBe(4);
    expect(measures.wall).toBe(2);
    const { box } = meshCheck(createLoftGeometry(stretched));
    expect(box.max.x - box.min.x).toBeCloseTo(80, 5);
  });

  it("keeps the bottom in place when the top moves sideways", () => {
    const shape = loft({});
    const { patch, shift } = loftMeasuresPatch(shape, { offsetX: 20 });
    // The top (30 wide) now reaches from 5 to 35, the bottom from -20 to 20: frame 55 wide, middle at 7.5.
    expect(patch.width).toBeCloseTo(55, 6);
    expect(shift.x).toBeCloseTo(7.5, 6);
    expect(shift.z).toBeCloseTo(0, 6);
    expect(patch.loftOffsetX).toBe(20);
  });

  it("keeps the wall short of closing the opening", () => {
    const measures = normalizeLoftMeasures({ bottomWidth: 10, bottomDepth: 10, topWidth: 6, topDepth: 6, wall: 5 });
    expect(measures.wall).toBeCloseTo(maxLoftWall(measures), 9);
    expect(measures.wall).toBeLessThan(3);
  });
});

// #205: the sections turn and tilt evenly on the way up.
describe("a twisted and tilted transition", () => {
  it("stays closed, on the plate, up to its height and inside its frame", () => {
    for (const fields of [{ loftTwist: 90 }, { loftTiltX: 25, loftTiltZ: -15 }, { loftTwist: -180, loftTiltX: 20, loftWall: 2, loftBottomCorner: 4 }]) {
      const shape = loft(fields);
      const { volume, open, box } = meshCheck(createLoftGeometry(shape));
      expect(open).toBe(0);
      expect(volume).toBeGreaterThan(0);
      expect(box.min.y).toBeGreaterThanOrEqual(-1e-6);
      expect(box.max.y).toBeCloseTo(30, 3);
      expect(box.max.x - box.min.x).toBeLessThanOrEqual(shape.width! + 1e-3);
      expect(box.max.z - box.min.z).toBeLessThanOrEqual(shape.depth! + 1e-3);
    }
  });

  it("frames a turned top by where it really reaches", () => {
    // A square turned by 45 degrees reaches out by its half diagonal.
    const turned = loftFrameSize(loftStoredMeasures(loft({ loftBottomOutline: "rectangle", loftTopOutline: "rectangle", loftBottomWidth: 10, loftBottomDepth: 10, loftTopWidth: 40, loftTopDepth: 40, loftTwist: 45 })));
    expect(turned.width).toBeCloseTo(40 * Math.SQRT2, 1);
  });

  it("hands the kernel its turn, its tilt, the top's middle height and pieces of one kind", () => {
    const part = loftProfileLoops(loft({ loftTwist: 60, loftTiltX: 10 }));
    expect(part.twist).toBe(60);
    expect(part.tilt).toEqual({ x: 10, z: 0 });
    expect(part.height).toBeLessThan(30);
    expect([...part.loops, ...part.topLoops].every((loop) => loop.segments.every((segment) => segment.kind === "bezier"))).toBe(true);
    expect(() => validateCadProfile({ kind: "loft", loops: part.loops, topLoops: part.topLoops, height: part.height!, twist: part.twist, tilt: part.tilt })).not.toThrow();
    // Untouched, it stays the ruled loft it was.
    expect(loftProfileLoops(loft({})).twist).toBeUndefined();
  });

  it("gives way when the frame is too low for the tilt, so the top stays above the plate", () => {
    const { box } = meshCheck(createLoftGeometry(loft({ loftTiltX: 45, height: 8 })));
    expect(box.min.y).toBeGreaterThanOrEqual(-1e-6);
    expect(box.max.y).toBeCloseTo(8, 3);
  });
});
