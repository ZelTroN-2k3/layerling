import { describe, expect, it } from "vitest";
import { createTeardropGeometry, teardropContourPoints, teardropHeightForTipAngle, teardropTipAngle } from "@/lib/teardropGeometry";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";

function signedVolume(width: number, depth: number, height: number) {
  const geometry = createTeardropGeometry({ width, depth, height });
  const position = geometry.getAttribute("position");
  let volume = 0;
  for (let i = 0; i < position.count; i += 3) {
    const [a, b, c] = [0, 1, 2].map((k) => [position.getX(i + k), position.getY(i + k), position.getZ(i + k)]);
    volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  return volume;
}

describe("teardrop", () => {
  it("has a 90 degree tip when the height is a round part plus a 45 degree roof", () => {
    const height = teardropHeightForTipAngle(6, 90);
    expect(height).toBeCloseTo(3 + 3 * Math.SQRT2, 9);
    expect(teardropTipAngle(6, height)).toBeCloseTo(90, 6);
    expect(teardropTipAngle(6, teardropHeightForTipAngle(6, 60))).toBeCloseTo(60, 6);
  });

  it("reports a round outline when the height leaves no room for a tip", () => {
    expect(teardropTipAngle(6, 6)).toBe(180);
  });

  it("fills its frame: the round part at the bottom, the tip on top, centred in width", () => {
    const height = teardropHeightForTipAngle(6, 90);
    const points = teardropContourPoints(6, height);
    const ys = points.map((p) => p.y);
    const xs = points.map((p) => p.x);
    expect(Math.min(...ys)).toBeCloseTo(0, 6);
    expect(Math.max(...ys)).toBeCloseTo(height, 6);
    expect(Math.max(...xs)).toBeCloseTo(3, 6);
    expect(Math.min(...xs)).toBeCloseTo(-3, 6);
    expect(points[points.length - 1]).toEqual({ x: 0, y: expect.closeTo(height, 6) });
  });

  it("has flanks that rise at 45 degrees for the default", () => {
    const points = teardropContourPoints(6, teardropHeightForTipAngle(6, 90));
    const tip = points[points.length - 1];
    const lastArc = points[points.length - 2];
    expect(Math.abs((tip.y - lastArc.y) / (tip.x - lastArc.x))).toBeCloseTo(1, 3);
  });

  it("builds a closed body of the right volume with outward faces", () => {
    const width = 6;
    const depth = 20;
    const height = teardropHeightForTipAngle(width, 90);
    const geometry = createTeardropGeometry({ width, depth, height });
    const position = geometry.getAttribute("position");
    const key = (i: number) => [position.getX(i), position.getY(i), position.getZ(i)].map((v) => v.toFixed(4)).join(",");
    const edges = new Map<string, number>();
    for (let i = 0; i < position.count; i += 3) {
      for (let k = 0; k < 3; k += 1) {
        const a = key(i + k);
        const b = key(i + ((k + 1) % 3));
        const edge = a < b ? `${a}|${b}` : `${b}|${a}`;
        edges.set(edge, (edges.get(edge) ?? 0) + 1);
      }
    }
    expect([...edges.values()].every((count) => count === 2)).toBe(true);
    // Circle plus the kite between the tip and the two tangent points, times the length.
    const radius = width / 2;
    const rise = radius * Math.SQRT2;
    const kite = radius * Math.sqrt(rise * rise - radius * radius);
    const expected = (Math.PI * radius * radius + kite - (radius * radius * Math.acos(radius / rise))) * depth;
    // The outline is a polygon inside the circle, so allow a little below the exact value.
    expect(signedVolume(width, depth, height)).toBeGreaterThan(0);
    expect(signedVolume(width, depth, height)).toBeGreaterThan(expected * 0.97);
    expect(signedVolume(width, depth, height)).toBeLessThan(expected * 1.001);
    geometry.computeBoundingBox();
    expect(geometry.boundingBox?.max.y).toBeCloseTo(height, 5);
    expect(geometry.boundingBox?.max.z).toBeCloseTo(10, 5);
    expect(geometry.boundingBox?.min.z).toBeCloseTo(-10, 5);
  });

  it("is in the shape list with a 90 degree tip", () => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "teardrop");
    expect(asset).toBeDefined();
    const shape = makeShapeFromAsset(asset!);
    expect(shape.width).toBe(6);
    expect(shape.depth).toBe(20);
    expect(teardropTipAngle(shape.width, shape.height)).toBeCloseTo(90, 0);
  });
});
