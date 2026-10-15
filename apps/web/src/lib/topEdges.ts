import type { CadModifierEdge } from "@/lib/cadModifierTypes";

/**
 * The edges along the very top of a body (#154): every point of the edge at the body's highest
 * level, such as the rim of a cookie cutter built from a stroked sketch. Picked from `candidateIds`
 * (the edges the tool offers at its threshold); the points are in the world, y up.
 */
export function topCadModifierEdgeIds(edges: readonly CadModifierEdge[], candidateIds: readonly number[]): number[] {
  const candidates = new Set(candidateIds);
  let top = Number.NEGATIVE_INFINITY;
  let bottom = Number.POSITIVE_INFINITY;
  edges.forEach((edge) => {
    for (let index = 1; index < edge.points.length; index += 3) {
      top = Math.max(top, edge.points[index]);
      bottom = Math.min(bottom, edge.points[index]);
    }
  });
  if (!Number.isFinite(top)) return [];
  const tolerance = Math.max(0.001, (top - bottom) * 1e-4);
  return edges
    .filter((edge) => candidates.has(edge.id) && edge.points.length >= 6)
    .filter((edge) => {
      for (let index = 1; index < edge.points.length; index += 3) {
        if (edge.points[index] < top - tolerance) return false;
      }
      return true;
    })
    .map((edge) => edge.id);
}
