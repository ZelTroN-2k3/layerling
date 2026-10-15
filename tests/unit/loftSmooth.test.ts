import { describe, expect, it } from "vitest";
import { loftEaseShare } from "@/lib/loftEase";
import { createLoftGeometry, loftFrameSize, loftStoredMeasures, normalizeLoftMeasures } from "@/lib/loftGeometry";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * A smooth transition (#271): the sides between the two ends follow an S-curve instead of a
 * straight line, so a hose adapter flares from a narrow to a wide pipe.
 */

function loft(extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  const base = {
    id: "smooth-loft", name: "loft", kind: "loft", x: 0, z: 0, elevation: 0, size: 50, height: 40, rotation: 0, color: "#c0703a",
    loftBottomOutline: "round", loftTopOutline: "round", loftBottomWidth: 25, loftBottomDepth: 25, loftTopWidth: 50, loftTopDepth: 50,
    loftBottomCorner: 0, loftTopCorner: 0, loftOffsetX: 0, loftOffsetZ: 0, loftWall: 0,
    ...extra,
  } as WorkplaneShape;
  const frame = loftFrameSize(loftStoredMeasures(base));
  return { ...base, width: frame.width, depth: frame.depth };
}

function volumeOf(geometry: ReturnType<typeof createLoftGeometry>) {
  const p = geometry.getAttribute("position");
  let total = 0;
  for (let i = 0; i + 2 < p.count; i += 3) {
    const [ax, ay, az] = [p.getX(i), p.getY(i), p.getZ(i)];
    const [bx, by, bz] = [p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1)];
    const [cx, cy, cz] = [p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)];
    total += (ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx)) / 6;
  }
  return total;
}

function edgeUses(geometry: ReturnType<typeof createLoftGeometry>) {
  const p = geometry.getAttribute("position");
  const key = (i: number) => [p.getX(i), p.getY(i), p.getZ(i)].map((v) => v.toFixed(4)).join(",");
  const uses = new Map<string, number>();
  for (let i = 0; i + 2 < p.count; i += 3) {
    const c = [key(i), key(i + 1), key(i + 2)];
    for (let e = 0; e < 3; e += 1) {
      const a = c[e];
      const b = c[(e + 1) % 3];
      const id = a < b ? `${a}:${b}` : `${b}:${a}`;
      uses.set(id, (uses.get(id) ?? 0) + 1);
    }
  }
  return uses;
}

/** The radius of the ring of vertices nearest to a height. */
function radiusNear(geometry: ReturnType<typeof createLoftGeometry>, y: number) {
  const p = geometry.getAttribute("position");
  let best = { distance: Infinity, radius: 0 };
  for (let i = 0; i < p.count; i += 1) {
    const distance = Math.abs(p.getY(i) - y);
    if (distance < best.distance - 1e-9) best = { distance, radius: Math.hypot(p.getX(i), p.getZ(i)) };
  }
  return best.radius;
}

describe("the S-curve of a smooth transition", () => {
  it("is the height share itself when straight, and keeps both ends", () => {
    for (const t of [0, 0.2, 0.5, 0.9, 1]) expect(loftEaseShare(t, 0)).toBe(t);
    for (const smooth of [0, 0.3, 1]) {
      expect(loftEaseShare(0, smooth)).toBe(0);
      expect(loftEaseShare(1, smooth)).toBeCloseTo(1, 12);
    }
  });

  it("runs slowly at the ends and fast in the middle at 100 %, and never goes back", () => {
    expect(loftEaseShare(0.1, 1)).toBeLessThan(0.1);
    expect(loftEaseShare(0.9, 1)).toBeGreaterThan(0.9);
    expect(loftEaseShare(0.5, 1)).toBeCloseTo(0.5, 12);
    let previous = 0;
    for (let step = 1; step <= 100; step += 1) {
      const share = loftEaseShare(step / 100, 1);
      expect(share).toBeGreaterThanOrEqual(previous);
      previous = share;
    }
  });

  it("is a blend: halfway between the straight line and the S-curve at 50 %", () => {
    expect(loftEaseShare(0.25, 0.5)).toBeCloseTo((0.25 + loftEaseShare(0.25, 1)) / 2, 12);
  });

  it("is kept within 0 to 1 whatever is stored", () => {
    expect(normalizeLoftMeasures({ smooth: 5 }).smooth).toBe(1);
    expect(normalizeLoftMeasures({ smooth: -2 }).smooth).toBe(0);
    expect(normalizeLoftMeasures({}).smooth).toBe(0);
  });
});

describe("smooth transition mesh", () => {
  it("is a closed solid with a wall, open at both ends, and keeps its height", () => {
    const geometry = createLoftGeometry(loft({ loftWall: 2, loftSmooth: 1 }));
    expect([...edgeUses(geometry).values()].every((uses) => uses === 2)).toBe(true);
    expect(geometry.boundingBox?.min.y).toBeCloseTo(0, 5);
    expect(geometry.boundingBox?.max.y).toBeCloseTo(40, 5);
    expect(volumeOf(geometry)).toBeGreaterThan(0);
  });

  it("flares like the S-curve: narrower than a cone low down, wider high up", () => {
    const smooth = createLoftGeometry(loft({ loftSmooth: 1 }));
    // A cone from 12.5 to 25 mm reaches 15.625 a quarter of the way up and 21.875 three quarters up.
    expect(radiusNear(smooth, 10)).toBeCloseTo(12.5 + 12.5 * 0.15625, 1);
    expect(radiusNear(smooth, 10)).toBeLessThan(15.625 - 0.5);
    expect(radiusNear(smooth, 30)).toBeCloseTo(12.5 + 12.5 * 0.84375, 1);
    expect(radiusNear(smooth, 30)).toBeGreaterThan(21.875 + 0.5);
  });

  it("has the volume of the integral along the S-curve", () => {
    const radius = (t: number) => 12.5 + (25 - 12.5) * (t * t * (3 - 2 * t));
    let expected = 0;
    const steps = 4000;
    for (let step = 0; step < steps; step += 1) expected += Math.PI * radius((step + 0.5) / steps) ** 2 * (40 / steps);
    const volume = volumeOf(createLoftGeometry(loft({ loftSmooth: 1 })));
    expect(Math.abs(volume - expected) / expected).toBeLessThan(0.01);
  });

  it("with no smoothness is the same mesh as before the setting existed", () => {
    const before = createLoftGeometry(loft());
    const same = createLoftGeometry(loft({ loftSmooth: 0 }));
    expect(same.getAttribute("position").count).toBe(before.getAttribute("position").count);
    expect(volumeOf(same)).toBeCloseTo(volumeOf(before), 6);
  });

  it("works for a transition that is turned and moved sideways too", () => {
    const geometry = createLoftGeometry(loft({ loftTopOutline: "rectangle", loftTopWidth: 40, loftTopDepth: 30, loftTwist: 45, loftOffsetX: 6, loftSmooth: 0.8, loftWall: 1.5 }));
    expect([...edgeUses(geometry).values()].every((uses) => uses === 2)).toBe(true);
    expect(volumeOf(geometry)).toBeGreaterThan(0);
  });
});
