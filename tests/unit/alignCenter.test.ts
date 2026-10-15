import { describe, expect, it } from "vitest";
import { alignNaturalCenter } from "@/lib/alignCenter";
import { meshForShape } from "@/lib/editorMeshCore";
import { canonicalizeShape } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

function shape(overrides: Partial<WorkplaneShape>): WorkplaneShape {
  return canonicalizeShape({
    id: "s1",
    name: "Shape",
    kind: "polygon",
    color: "#5b5ce2",
    x: 10,
    z: -4,
    elevation: 0,
    size: 40,
    width: 40,
    depth: 40,
    height: 10,
    rotation: 0,
    ...overrides,
  });
}

/** The middle of the circle a regular polygon's corners lie on: the average of the corners of the base. */
function cornerAverage(source: WorkplaneShape) {
  const mesh = meshForShape(source);
  const base = mesh.vertices.filter(([, y]) => Math.abs(y - (source.elevation ?? 0)) < 1e-6);
  const unique = new Map(base.map(([x, , z]) => [`${x.toFixed(5)},${z.toFixed(5)}`, [x, z] as const]));
  const points = [...unique.values()];
  return { x: points.reduce((sum, [x]) => sum + x, 0) / points.length, z: points.reduce((sum, [, z]) => sum + z, 0) / points.length };
}

describe("the middle the align tool means (#268)", () => {
  it("is the middle of the circle a triangle's corners lie on, not the middle of its box", () => {
    const triangle = shape({ sides: 3, width: 34.641, depth: 30 });
    const center = alignNaturalCenter(triangle)!;
    expect(center).not.toBeNull();
    const corners = cornerAverage(triangle);
    expect(center.x).toBeCloseTo(corners.x, 3);
    expect(center.z).toBeCloseTo(corners.z, 3);
    // The box's middle is the shape's own position, 5 mm away for a 20 mm circumradius.
    expect(Math.abs(center.z - triangle.z)).toBeCloseTo(5, 3);
  });

  it("is the circle's middle for a pentagon too, about 1.9 mm from the box's", () => {
    const pentagon = shape({ sides: 5, width: 38.042, depth: 36.18 });
    const center = alignNaturalCenter(pentagon)!;
    const corners = cornerAverage(pentagon);
    expect(center.x).toBeCloseTo(corners.x, 3);
    expect(center.z).toBeCloseTo(corners.z, 3);
    expect(Math.abs(center.z - pentagon.z)).toBeCloseTo(1.9098, 3);
  });

  it("is the star's own middle, which is not the middle of its box", () => {
    const star = shape({ kind: "star", starPoints: 5 });
    const center = alignNaturalCenter(star)!;
    expect(center.x).toBeCloseTo(star.x, 6);
    expect(center.z).toBeCloseTo(star.z, 6);
  });

  it("is nothing special where the shape's middle is its box's", () => {
    expect(alignNaturalCenter(shape({ sides: 6, width: 34.641, depth: 40 }))).toBeNull();
    expect(alignNaturalCenter(shape({ sides: 4, width: 30, depth: 30 }))).toBeNull();
    expect(alignNaturalCenter(shape({ kind: "cylinder" }))).toBeNull();
    expect(alignNaturalCenter(shape({ kind: "box" }))).toBeNull();
  });

  it("turns with the shape", () => {
    const triangle = shape({ sides: 3, width: 34.641, depth: 30, rotation: 90 });
    const center = alignNaturalCenter(triangle)!;
    // Turned a quarter, the 5 mm that lay along z lie along x.
    expect(Math.abs(center.x - triangle.x)).toBeCloseTo(5, 3);
    expect(center.z).toBeCloseTo(triangle.z, 3);
  });
});

describe("the middle of a teardrop hole (#268)", () => {
  it("is the middle of its round part, below the middle of the box with the tip", () => {
    const drop = shape({ kind: "teardrop", width: 9.5, depth: 20, height: 11.4724, elevation: 3 });
    const center = alignNaturalCenter(drop)!;
    expect(center).not.toBeNull();
    // The round part's middle stands 4.75 above the bottom of the shape; the box's middle 5.74.
    expect(center.y).toBeCloseTo(3 + 4.75, 3);
    expect(center.x).toBeCloseTo(10, 6);
    expect(center.z).toBeCloseTo(-4, 6);
    // Seen in the real mesh: the lowest point of the round part is 4.75 below it, the tip 6.72 above.
    const ys = meshForShape(drop).vertices.map(([, y]) => y);
    expect(center.y - Math.min(...ys)).toBeCloseTo(4.75, 2);
    expect(Math.max(...ys) - center.y).toBeCloseTo(4.75 / Math.sin(Math.PI / 4), 1);
  });
});
