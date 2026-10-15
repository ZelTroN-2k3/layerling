import manifoldModule, { type ManifoldToplevel } from "manifold-3d";
import { beforeAll, describe, expect, it } from "vitest";
import { normalizeSketchStroke, strokedSketchProfile } from "@/lib/sketchStroke";
import type { SketchProfile, SketchStroke } from "@/types/layerling";

let runtime: ManifoldToplevel;

beforeAll(async () => {
  runtime = await manifoldModule();
  runtime.setup();
});

function polyline(points: Array<[number, number]>, closed: boolean, stroke?: Partial<SketchStroke>): SketchProfile {
  const ids = points.map((_, index) => `p${index}`);
  const segments = ids.slice(0, closed ? ids.length : ids.length - 1).map((id, index) => ({
    id: `s${index}`,
    startId: id,
    endId: ids[(index + 1) % ids.length],
    kind: "line" as const,
  }));
  return {
    points: points.map(([x, z], index) => ({ id: ids[index], x, z })),
    segments,
    ...(stroke ? { stroke: { width: 2, align: "center", join: "miter", cap: "flat", ...stroke } } : {}),
  };
}

function area(profile: SketchProfile | null) {
  if (!profile) return 0;
  const byId = new Map(profile.points.map((point) => [point.id, point]));
  // Every loop's segments in order; shoelace over each, holes come out negative.
  return profile.segments.reduce((sum, segment) => {
    const a = byId.get(segment.startId)!;
    const b = byId.get(segment.endId)!;
    return sum + (a.x * b.z - b.x * a.z) / 2;
  }, 0);
}

const square = (stroke: Partial<SketchStroke>) => polyline([[0, 0], [10, 0], [10, 10], [0, 10]], true, stroke);

describe("sketch stroke (#154)", () => {
  it("leaves a sketch without a stroke alone", () => {
    expect(strokedSketchProfile(runtime, polyline([[0, 0], [10, 0], [10, 10]], true))).toBeNull();
  });

  it("turns a closed outline into a frame inside, outside or centred on the line", () => {
    expect(Math.abs(area(strokedSketchProfile(runtime, square({ width: 1, align: "outside" }))))).toBeCloseTo(12 * 12 - 100, 6);
    expect(Math.abs(area(strokedSketchProfile(runtime, square({ width: 1, align: "inside" }))))).toBeCloseTo(100 - 8 * 8, 6);
    expect(Math.abs(area(strokedSketchProfile(runtime, square({ width: 2, align: "center" }))))).toBeCloseTo(12 * 12 - 8 * 8, 6);
  });

  it("gives an open line a width, with flat, square or round ends", () => {
    const line = (cap: SketchStroke["cap"]) => Math.abs(area(strokedSketchProfile(runtime, polyline([[0, 0], [10, 0]], false, { width: 2, cap }))));
    expect(line("flat")).toBeCloseTo(20, 6);
    expect(line("square")).toBeCloseTo(24, 6);
    expect(line("round")).toBeCloseTo(20 + Math.PI, 1);
  });

  it("fills the corner of a bent line as chosen", () => {
    const bent = (join: SketchStroke["join"]) => Math.abs(area(strokedSketchProfile(runtime, polyline([[0, 0], [10, 0], [10, 10]], false, { width: 2, join }))));
    // Two 10 x 2 bars overlap in a 1 x 1 square at the corner; the outer corner adds 1 (miter),
    // half of it (bevel) or a quarter circle (round).
    expect(bent("miter")).toBeCloseTo(40 - 1 + 1, 6);
    expect(bent("bevel")).toBeCloseTo(40 - 1 + 0.5, 6);
    expect(bent("round")).toBeCloseTo(40 - 1 + Math.PI / 4, 1);
  });

  it("'Wider' keeps the area and grows it by the width all round (#215)", () => {
    // A 10 x 10 square widened by 1 with sharp corners is a 12 x 12 square; with round corners the corners are quarter circles.
    expect(area(strokedSketchProfile(runtime, square({ width: 1, align: "grow", join: "miter" })))).toBeCloseTo(144, 4);
    expect(area(strokedSketchProfile(runtime, square({ width: 1, align: "grow", join: "round" })))).toBeCloseTo(100 + 40 + Math.PI, 1);
    // An open line widened is the same as a centred stroke of that width.
    const open = (align: SketchStroke["align"]) => Math.abs(area(strokedSketchProfile(runtime, polyline([[0, 0], [10, 0]], false, { width: 2, align }))));
    expect(open("grow")).toBeCloseTo(open("center"), 6);
  });

  it("keeps a stroke's settings within range", () => {
    expect(normalizeSketchStroke({ width: -1 })).toBeUndefined();
    expect(normalizeSketchStroke({ width: 0.2, align: "sideways" })).toEqual({ width: 0.2, align: "center", join: "miter", cap: "flat" });
  });
});

describe("a stroke for a revolve (#347)", () => {
  const wall = (stroke: Partial<SketchStroke> = {}) => polyline([[-20, 0], [-20, -10], [-8, -20]], false, { width: 2, ...stroke });
  const xs = (profile: SketchProfile | null) => (profile?.points ?? []).map((point) => point.x);

  it("keeps a wall left of the axis as it is", () => {
    const stroked = strokedSketchProfile(runtime, wall(), { clipToRevolveSide: true });
    expect(stroked).not.toBeNull();
    expect(Math.max(...xs(stroked))).toBeLessThanOrEqual(0);
    expect(Math.abs(area(stroked))).toBeCloseTo(Math.abs(area(strokedSketchProfile(runtime, wall()))), 6);
  });

  it("cuts a wall that reaches across the axis off at the axis", () => {
    const across = polyline([[-6, 0], [4, 0]], false, { width: 4 });
    const free = strokedSketchProfile(runtime, across);
    const clipped = strokedSketchProfile(runtime, across, { clipToRevolveSide: true });
    expect(Math.max(...xs(free))).toBeCloseTo(4, 6);
    expect(Math.max(...xs(clipped))).toBeLessThanOrEqual(1e-9);
    expect(Math.abs(area(clipped))).toBeCloseTo(6 * 4, 6);
  });

  it("leaves nothing when the whole line lies right of the axis", () => {
    expect(strokedSketchProfile(runtime, polyline([[5, 0], [15, 0]], false, { width: 2 }), { clipToRevolveSide: true })).toBeNull();
  });
});
