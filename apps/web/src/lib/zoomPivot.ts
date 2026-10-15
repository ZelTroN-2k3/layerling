import * as THREE from "three";

/**
 * How far ahead of the camera the pivot is kept while zooming in at a point that has nothing to
 * zoom towards: the sky above the plate, or a spot past the plate's edge. The wheel moves the camera a
 * share of its distance to the pivot, so a pivot left where it was ended up closer with every notch,
 * the steps shrank and the camera stopped at its closest distance although the way ahead was free.
 */
export const ZOOM_PIVOT_REACH_MM = 50;

/**
 * The pivot to use when the pointer finds no surface: where the old one was if it is still far enough
 * ahead, otherwise on the line of sight, `reach` ahead of the camera, so the camera can go on. The point stays
 * on the line of sight and inside the box the pivot may be in: where the box ends the distance is cut short
 * along the line, never a coordinate at a time, for that turns the view (the camera then looked steeply down
 * near the back edge). Null: leave the pivot alone.
 */
export function pivotKeptAhead(
  camera: THREE.Vector3,
  target: THREE.Vector3,
  forward: THREE.Vector3,
  reach: number,
  limits: { halfWidth: number; halfDepth: number; minY: number; maxY: number } | null,
): THREE.Vector3 | null {
  const distance = camera.distanceTo(target);
  if (distance >= reach) return null;
  let ahead = reach;
  if (limits) {
    const along = (from: number, direction: number, low: number, high: number) => {
      if (Math.abs(direction) < 1e-9) return Number.POSITIVE_INFINITY;
      return Math.max(0, ((direction > 0 ? high : low) - from) / direction);
    };
    ahead = Math.min(
      ahead,
      along(camera.x, forward.x, -limits.halfWidth, limits.halfWidth),
      along(camera.z, forward.z, -limits.halfDepth, limits.halfDepth),
      along(camera.y, forward.y, limits.minY, limits.maxY),
    );
  }
  // At the edge of the box nothing is gained, and the old pivot stays.
  if (!(ahead > distance + 1e-6)) return null;
  return camera.clone().addScaledVector(forward, ahead);
}
