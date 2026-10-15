import { describe, expect, it } from "vitest";
import { countersinkDepth, createScrewHoleGeometry, normalizeScrewHoleAngle, normalizeScrewHoleHeadDepth, normalizeScrewHoleShaft, screwHoleProfile } from "@/lib/screwHoleGeometry";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";

function stats(geometry: ReturnType<typeof createScrewHoleGeometry>) {
  const position = geometry.getAttribute("position");
  const key = (i: number) => [position.getX(i), position.getY(i), position.getZ(i)].map((v) => v.toFixed(4)).join(",");
  const edges = new Map<string, number>();
  let volume = 0;
  for (let i = 0; i < position.count; i += 3) {
    const [a, b, c] = [0, 1, 2].map((k) => [position.getX(i + k), position.getY(i + k), position.getZ(i + k)]);
    volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
    for (let k = 0; k < 3; k += 1) {
      const p = key(i + k);
      const q = key(i + ((k + 1) % 3));
      const edge = p < q ? `${p}|${q}` : `${q}|${p}`;
      edges.set(edge, (edges.get(edge) ?? 0) + 1);
    }
  }
  return { volume, closed: [...edges.values()].every((count) => count === 2) };
}

describe("screw holes", () => {
  it("counterbore: a shaft below a cylindrical pocket, head end on top", () => {
    const profile = screwHoleProfile({ kind: "counterbore", width: 6.4, height: 12, screwHoleShaft: 3.4, screwHoleHeadDepth: 3.2 });
    expect(profile).toEqual([
      { r: 1.7, y: 0 },
      { r: 1.7, y: expect.closeTo(8.8, 9) },
      { r: 3.2, y: expect.closeTo(8.8, 9) },
      { r: 3.2, y: 12 },
    ]);
  });

  it("countersink: a 90 degree cone from the shaft up to the head diameter", () => {
    const depth = countersinkDepth(6.6, 3.4, 90);
    expect(depth).toBeCloseTo(1.6, 9);
    const profile = screwHoleProfile({ kind: "countersink", width: 6.6, height: 8, screwHoleShaft: 3.4, screwHoleAngle: 90 });
    expect(profile[1]).toEqual({ r: 1.7, y: expect.closeTo(6.4, 9) });
    expect(profile[2]).toEqual({ r: 3.3, y: 8 });
  });

  it("keeps a countersink inside its height by opening it more steeply", () => {
    const profile = screwHoleProfile({ kind: "countersink", width: 20, height: 4, screwHoleShaft: 3.4, screwHoleAngle: 60 });
    expect(profile[1].y).toBeCloseTo(0.2, 9);
    expect(profile[2]).toEqual({ r: 10, y: 4 });
  });

  it("keeps the shaft narrower than the head and the pocket shallower than the hole", () => {
    expect(normalizeScrewHoleShaft(9, 6)).toBeCloseTo(5.7);
    expect(normalizeScrewHoleShaft(undefined, 6.4)).toBe(3.4);
    expect(normalizeScrewHoleHeadDepth(50, 12)).toBeCloseTo(11.8);
    expect(normalizeScrewHoleAngle(500)).toBe(150);
    expect(normalizeScrewHoleAngle(1)).toBe(30);
  });

  it.each(["counterbore", "countersink"] as const)("builds a closed %s with outward faces and the right volume", (kind) => {
    const width = kind === "counterbore" ? 6.4 : 6.6;
    const height = kind === "counterbore" ? 12 : 8;
    const geometry = createScrewHoleGeometry({ kind, width, depth: width, height, screwHoleShaft: 3.4, screwHoleHeadDepth: 3.2, screwHoleAngle: 90 });
    const { volume, closed } = stats(geometry);
    expect(closed).toBe(true);
    const shaft = Math.PI * 1.7 ** 2;
    const exact = kind === "counterbore"
      ? shaft * (height - 3.2) + Math.PI * 3.2 ** 2 * 3.2
      : shaft * (height - 1.6) + (Math.PI * 1.6 / 3) * (1.7 ** 2 + 1.7 * 3.3 + 3.3 ** 2);
    expect(volume).toBeGreaterThan(exact * 0.99);
    expect(volume).toBeLessThan(exact * 1.001);
    expect(geometry.boundingBox?.max.y).toBeCloseTo(height, 6);
    expect(geometry.boundingBox?.min.y).toBeCloseTo(0, 6);
    expect(geometry.boundingBox?.max.x).toBeCloseTo(width / 2, 2);
  });

  it("stretches along z when depth differs from width", () => {
    const geometry = createScrewHoleGeometry({ kind: "counterbore", width: 6, depth: 9, height: 10 });
    expect(geometry.boundingBox?.max.z).toBeCloseTo(4.5, 2);
    expect(geometry.boundingBox?.max.x).toBeCloseTo(3, 2);
  });

  it("is in the shape list, before the teardrop, with the M3 defaults", () => {
    const kinds = toolbarShapeAssets.map((entry) => entry.kind);
    expect(kinds.indexOf("counterbore")).toBe(kinds.indexOf("bentTube") + 1);
    expect(kinds.indexOf("countersink")).toBe(kinds.indexOf("counterbore") + 1);
    expect(kinds.indexOf("teardrop")).toBe(kinds.indexOf("countersink") + 1);
    const counterbore = makeShapeFromAsset(toolbarShapeAssets.find((entry) => entry.kind === "counterbore")!);
    expect(counterbore).toMatchObject({ width: 6.4, depth: 6.4, height: 12, screwHoleShaft: 3.4, screwHoleHeadDepth: 3.2 });
    const countersink = makeShapeFromAsset(toolbarShapeAssets.find((entry) => entry.kind === "countersink")!);
    expect(countersink).toMatchObject({ width: 6.6, depth: 6.6, height: 8, screwHoleShaft: 3.4, screwHoleAngle: 90 });
  });
});
