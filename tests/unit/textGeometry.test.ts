import { beforeAll, describe, expect, it } from "vitest";
import { loadTextFonts } from "@/lib/textFonts";
import { createTextGeometry, curvedTextFootprint, curvedTextPatch } from "@/lib/textGeometry";
import type { WorkplaneShape } from "@/types/layerling";

function mockShape(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "test-text",
    name: "Text",
    kind: "text",
    color: "#ff0000",
    x: 0,
    z: 0,
    size: 40,
    width: 40,
    depth: 20,
    height: 10,
    rotation: 0,
    text: "TEST",
    ...overrides,
  };
}

describe("textGeometry", () => {
  beforeAll(async () => {
    await loadTextFonts();
  });

  it("builds flat linear text geometry with correct height and centered base", () => {
    const shape = mockShape({ text: "HELLO", height: 8 });
    const geometry = createTextGeometry(shape);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;

    expect(box.min.y).toBeCloseTo(0, 3);
    expect(box.max.y).toBeCloseTo(8, 3);
    expect(box.min.x).toBeLessThan(0);
    expect(box.max.x).toBeGreaterThan(0);
  });

  it("builds curved text geometry along an arc", () => {
    const shape = mockShape({
      text: "CIRCULAR",
      textCurved: true,
      textRadius: 40,
      height: 6,
    });
    const geometry = createTextGeometry(shape);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;

    expect(box.min.y).toBeCloseTo(0, 3);
    expect(box.max.y).toBeCloseTo(6, 3);
    // Position attribute must be present and contain triangles
    const pos = geometry.getAttribute("position");
    expect(pos.count).toBeGreaterThan(100);
  });

  it("supports inward facing curved text", () => {
    const shape = mockShape({
      text: "INWARD",
      textCurved: true,
      textRadius: 35,
      textInward: true,
      height: 5,
    });
    const geometry = createTextGeometry(shape);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;

    expect(box.min.y).toBeCloseTo(0, 3);
    expect(box.max.y).toBeCloseTo(5, 3);
    const pos = geometry.getAttribute("position");
    expect(pos.count).toBeGreaterThan(100);
  });

  it("handles spaces and whitespace gracefully", () => {
    const shape = mockShape({
      text: "A B C",
      textCurved: true,
      textRadius: 50,
      height: 4,
    });
    const geometry = createTextGeometry(shape);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;

    expect(box.min.y).toBeCloseTo(0, 3);
    expect(box.max.y).toBeCloseTo(4, 3);
  });

  it("keeps every letter on one baseline instead of centring each on its own", () => {
    // Nearest point of the lettering to the circle centre: the baseline sits on the radius.
    const innerRadius = (text: string) => {
      const shape = mockShape({ text, textCurved: true, textRadius: 40, textSize: 10 });
      const geometry = createTextGeometry({ ...shape, ...curvedTextFootprint(shape) });
      const position = geometry.getAttribute("position");
      let inner = Infinity;
      for (let index = 0; index < position.count; index += 1) {
        inner = Math.min(inner, Math.hypot(position.getX(index), position.getZ(index)));
      }
      return inner;
    };
    // "x", "." and "H" stand on the baseline ...
    expect(innerRadius("x")).toBeCloseTo(40, 0);
    expect(innerRadius(".")).toBeCloseTo(40, 0);
    expect(innerRadius("H")).toBeCloseTo(40, 0);
    // ... and "g" hangs below it, towards the centre.
    expect(innerRadius("g")).toBeLessThan(38);
  });

  it("keeps the circle centre in the middle of its box, with the lettering inside", () => {
    const base = mockShape({ text: "Layerling", textCurved: true, textRadius: 40, textSize: 8 });
    const footprint = curvedTextFootprint(base);
    const geometry = createTextGeometry({ ...base, ...footprint });
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    expect(Math.max(-box.min.x, box.max.x)).toBeCloseTo(footprint.width / 2, 2);
    expect(Math.max(-box.min.z, box.max.z)).toBeCloseTo(footprint.depth / 2, 2);
    // A word along the top of the circle lies above its centre.
    expect(box.max.z).toBeLessThan(0);
  });

  it("turns the letters upside down in place, the line stays where it is", () => {
    const measure = (text: string, textFlipped: boolean) => {
      const shape = mockShape({ text, textCurved: true, textRadius: 40, textSize: 10, textFlipped });
      const geometry = createTextGeometry({ ...shape, ...curvedTextFootprint(shape) });
      geometry.computeBoundingBox();
      const position = geometry.getAttribute("position");
      let inner = Infinity;
      let outer = 0;
      for (let index = 0; index < position.count; index += 1) {
        const distance = Math.hypot(position.getX(index), position.getZ(index));
        inner = Math.min(inner, distance);
        outer = Math.max(outer, distance);
      }
      return { inner, outer, maxZ: geometry.boundingBox!.max.z };
    };
    // Capitals fill the same band either way, above the circle.
    const upright = measure("HHH", false);
    const flipped = measure("HHH", true);
    expect(flipped.maxZ).toBeLessThan(0);
    expect(flipped.inner).toBeCloseTo(upright.inner, 1);
    expect(flipped.outer).toBeCloseTo(upright.outer, 1);
    // A descender turns round with its letter: inward upright, outward flipped.
    expect(measure("HgH", false).inner).toBeLessThan(38);
    expect(measure("HgH", true).inner).toBeCloseTo(40, 0);
    expect(measure("HgH", true).outer).toBeGreaterThan(upright.outer + 1);
  });

  it("takes the straight letter size when the curve is switched on, and the box follows", () => {
    const straight = mockShape({ text: "TEXT", width: 86, depth: 28 });
    const patch = curvedTextPatch(straight, { textCurved: true });
    expect(patch.textSize).toBeGreaterThan(20);
    expect(patch.textRadius).toBeGreaterThan(5);
    const footprint = curvedTextFootprint({ ...straight, ...patch } as WorkplaneShape);
    expect(patch.width).toBeCloseTo(footprint.width, 5);
    expect(patch.depth).toBeCloseTo(footprint.depth, 5);
  });

  it("scales radius and letter size together when a handle is pulled", () => {
    const curved = mockShape({ text: "RING", textCurved: true, textRadius: 30, textSize: 6 });
    const footprint = curvedTextFootprint(curved);
    const shape = { ...curved, ...footprint };
    const patch = curvedTextPatch(shape, { width: footprint.width * 2 });
    expect(patch.textRadius).toBeCloseTo(60, 1);
    expect(patch.textSize).toBeCloseTo(12, 1);
    expect(patch.width).toBeCloseTo(footprint.width * 2, 0);
  });

  it("shrinks letters that would not fit on the circle", () => {
    const footprint = curvedTextFootprint(mockShape({ text: "THIS IS A VERY LONG CURVED TEXT STRING", textCurved: true, textRadius: 30, textSize: 10 }));
    expect(footprint.width).toBeLessThanOrEqual(2 * (30 + 10));
  });
});
