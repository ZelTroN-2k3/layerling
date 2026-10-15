import type { SketchProfile, SketchSegment } from "@/types/layerling";

/**
 * Construction lines in a sketch (#229): lines that help to place points - drawn dashed, never
 * part of the body, and a point snaps to where they cross. They are ordinary segments with
 * `construction` set, so they move, copy and delete like any line; only the outline leaves them out.
 */
export const isConstructionSegment = (segment: Pick<SketchSegment, "construction">) => segment.construction === true;

export function constructionSegmentCount(profile: SketchProfile) {
  return profile.segments.filter(isConstructionSegment).length;
}

/**
 * The profile as the body sees it: without its construction lines, and without the points that
 * only they use. A point no line uses at all stays as it was.
 */
export function solidSketchProfile(profile: SketchProfile): SketchProfile {
  if (!profile.segments.some(isConstructionSegment)) return profile;
  const segments = profile.segments.filter((segment) => !isConstructionSegment(segment));
  const solidUsed = new Set(segments.flatMap((segment) => [segment.startId, segment.endId]));
  const constructionOnly = new Set(
    profile.segments.filter(isConstructionSegment).flatMap((segment) => [segment.startId, segment.endId]).filter((id) => !solidUsed.has(id)),
  );
  return { ...profile, points: profile.points.filter((point) => !constructionOnly.has(point.id)), segments };
}

/** The segments with `construction` set or taken off; the rest of the profile as it was. */
export function withSegmentsConstruction(profile: SketchProfile, ids: ReadonlySet<string>, construction: boolean): SketchProfile {
  return {
    ...profile,
    segments: profile.segments.map((segment) => {
      if (!ids.has(segment.id)) return segment;
      const { construction: _was, ...rest } = segment;
      return construction ? { ...rest, construction: true } : rest;
    }),
  };
}

type Plane = { x: number; z: number };

/** Where two straight pieces cross, null when they miss or run side by side. */
export function crossingOfPieces(a: readonly [Plane, Plane], b: readonly [Plane, Plane]): Plane | null {
  const [p, p2] = a;
  const [q, q2] = b;
  const rX = p2.x - p.x;
  const rZ = p2.z - p.z;
  const sX = q2.x - q.x;
  const sZ = q2.z - q.z;
  const denominator = rX * sZ - rZ * sX;
  if (Math.abs(denominator) < 1e-12) return null;
  const t = ((q.x - p.x) * sZ - (q.z - p.z) * sX) / denominator;
  const u = ((q.x - p.x) * rZ - (q.z - p.z) * rX) / denominator;
  const slack = 1e-9;
  if (t < -slack || t > 1 + slack || u < -slack || u > 1 + slack) return null;
  return { x: p.x + t * rX, z: p.z + t * rZ };
}

/**
 * The points a new point snaps to besides the ends of the lines: where a construction line
 * crosses another straight line, construction or not. Curved segments are left out. A crossing
 * that is a point already is not listed again.
 */
export function constructionCrossings(profile: SketchProfile): Plane[] {
  const pointById = new Map(profile.points.map((point) => [point.id, point]));
  const straight = profile.segments.flatMap((segment) => {
    if ((segment.kind ?? "line") !== "line") return [];
    const start = pointById.get(segment.startId);
    const end = pointById.get(segment.endId);
    return start && end ? [{ segment, start, end }] : [];
  });
  const crossings: Plane[] = [];
  const known = (point: Plane) => crossings.some((entry) => Math.hypot(entry.x - point.x, entry.z - point.z) < 1e-6)
    || profile.points.some((entry) => Math.hypot(entry.x - point.x, entry.z - point.z) < 1e-6);
  straight.forEach((first, index) => {
    if (!isConstructionSegment(first.segment)) return;
    straight.forEach((second, otherIndex) => {
      // Two construction lines are looked at once, from the one that comes first.
      if (otherIndex === index || (isConstructionSegment(second.segment) && otherIndex < index)) return;
      const crossing = crossingOfPieces([first.start, first.end], [second.start, second.end]);
      if (crossing && !known(crossing)) crossings.push(crossing);
    });
  });
  return crossings;
}
