import type { SectionLoop, SectionPoint } from "@/lib/sectionSvg";
import type { SectionPlaneAxis } from "@/lib/sectionView";

/**
 * Messen auf der Schnittebene: Wandstaerken, Spalte und Passungen direkt am
 * aufgeschnittenen Teil. Gerechnet wird in den Blattkoordinaten des
 * Schnitt-SVG (u nach rechts, v nach unten, siehe projectSectionPoint), damit
 * Messung und SVG dieselben Umrisse sehen.
 */

/** The way back from projectSectionPoint: a point of the sheet onto the plane, editor world (y up). */
export function sectionPointToWorld(point: SectionPoint, axis: SectionPlaneAxis, offset: number): [number, number, number] {
  if (axis === "x") return [offset, -point.v, -point.u];
  if (axis === "y") return [point.u, offset, point.v];
  return [point.u, -point.v, offset];
}

export type SectionSnapKind = "perpendicular" | "corner" | "outline" | "free";
export type SectionSnap = { point: SectionPoint; kind: SectionSnapKind };

function segmentsOf(loop: SectionLoop) {
  const { points } = loop;
  const count = loop.closed ? points.length : points.length - 1;
  const segments: Array<[SectionPoint, SectionPoint]> = [];
  for (let index = 0; index < count; index += 1) {
    segments.push([points[index], points[(index + 1) % points.length]]);
  }
  return segments;
}

/** Where on segment a-b the point p falls, as a share 0..1 of its length (unclamped). */
function along(p: SectionPoint, a: SectionPoint, b: SectionPoint) {
  const du = b.u - a.u;
  const dv = b.v - a.v;
  const lengthSq = du * du + dv * dv;
  return lengthSq < 1e-18 ? 0 : ((p.u - a.u) * du + (p.v - a.v) * dv) / lengthSq;
}

function lerp(a: SectionPoint, b: SectionPoint, t: number): SectionPoint {
  return { u: a.u + (b.u - a.u) * t, v: a.v + (b.v - a.v) * t };
}

function distance(a: SectionPoint, b: SectionPoint) {
  return Math.hypot(a.u - b.u, a.v - b.v);
}

/**
 * Snap a point of the cutting plane onto the cut's outline, `radius` in sheet
 * millimetres. A corner right under the cursor wins. Then, with a first point
 * `from`, the foot of the perpendicular from it onto the wall near the cursor
 * - wherever along that wall the cursor is, so a click anywhere on the
 * opposite wall gives the wall thickness or the gap. Then the nearest point of
 * the outline; off the outline the point stays where it is.
 */
export function snapSectionPoint(target: SectionPoint, loops: readonly SectionLoop[], radius: number, from: SectionPoint | null = null): SectionSnap {
  let perpendicular: SectionPoint | null = null;
  let perpendicularDistance = radius;
  let corner: SectionPoint | null = null;
  let cornerDistance = radius * 0.6;
  let nearest: SectionPoint | null = null;
  let nearestDistance = radius;
  loops.forEach((loop) => {
    if (loop.points.length === 1) {
      const only = loop.points[0];
      if (distance(only, target) <= cornerDistance) {
        corner = only;
        cornerDistance = distance(only, target);
      }
      return;
    }
    segmentsOf(loop).forEach(([a, b]) => {
      const t = along(target, a, b);
      const closest = lerp(a, b, Math.min(1, Math.max(0, t)));
      const away = distance(closest, target);
      if (away > radius) return;
      if (away < nearestDistance) {
        nearestDistance = away;
        nearest = closest;
      }
      [a, b].forEach((end) => {
        const endAway = distance(end, target);
        if (endAway < cornerDistance) {
          cornerDistance = endAway;
          corner = end;
        }
      });
      if (from) {
        // Only a foot that lands on the segment itself: then the line from
        // `from` meets this wall square. On a curved wall that is the one
        // segment across from it; segments beside `from` on its own wall never
        // qualify, and its own segment gives back `from`, which measures nothing.
        const footShare = along(from, a, b);
        if (footShare < 0 || footShare > 1) return;
        const foot = lerp(a, b, footShare);
        if (distance(foot, from) < 1e-6) return;
        if (away < perpendicularDistance) {
          perpendicularDistance = away;
          perpendicular = foot;
        }
      }
    });
  });
  if (corner) return { point: corner, kind: "corner" };
  if (perpendicular) return { point: perpendicular, kind: "perpendicular" };
  if (nearest) return { point: nearest, kind: "outline" };
  return { point: { ...target }, kind: "free" };
}

/**
 * The distance between two points of the cut, and its parts along the
 * editor's axes as the position fields name them: X (width), Y (depth, z in
 * the scene) and Z (height, y in the scene).
 */
export function sectionMeasurement(a: SectionPoint, b: SectionPoint, axis: SectionPlaneAxis, offset: number) {
  const [ax, ay, az] = sectionPointToWorld(a, axis, offset);
  const [bx, by, bz] = sectionPointToWorld(b, axis, offset);
  const deltaX = bx - ax;
  const deltaDepth = bz - az;
  const deltaHeight = by - ay;
  return {
    distance: Math.hypot(deltaX, deltaDepth, deltaHeight),
    deltaX,
    deltaDepth,
    deltaHeight,
  };
}
