import * as THREE from "three";

/**
 * The circle through three points of an edge, or null when the edge is no circle: the centre, the radius
 * and the unit normal of its plane. Every point of the edge has to lie on it (an arc counts, a full ring too).
 */
export function circleOfEdgePoints(points: readonly THREE.Vector3[]) {
  if (points.length < 4) return null;
  const a = points[0];
  const b = points[Math.floor(points.length / 3)];
  const c = points[Math.floor((points.length * 2) / 3)];
  const ab = b.clone().sub(a);
  const ac = c.clone().sub(a);
  const normal = ab.clone().cross(ac);
  const normalLengthSquared = normal.lengthSq();
  if (normalLengthSquared < 1e-12) return null;
  const center = a.clone().add(
    normal.clone().cross(ab).multiplyScalar(ac.lengthSq()).add(ac.clone().cross(normal).multiplyScalar(ab.lengthSq())).multiplyScalar(1 / (2 * normalLengthSquared)),
  );
  const radius = center.distanceTo(a);
  if (!(radius > 1e-6)) return null;
  const unitNormal = normal.clone().normalize();
  const tolerance = Math.max(1e-4, radius * 5e-3);
  const onCircle = points.every((point) => Math.abs(center.distanceTo(point) - radius) <= tolerance && Math.abs(point.clone().sub(center).dot(unitNormal)) <= tolerance);
  return onCircle ? { center, radius, normal: unitNormal } : null;
}

/**
 * The place on the true circle nearest to `point`. The display edge of a circle is a polygon, and a
 * point on one of its sides lies a little inside the circle; measured from there, a diameter comes out
 * a few hundredths short.
 */
export function pointOnCircle(circle: { center: THREE.Vector3; radius: number; normal: THREE.Vector3 }, point: THREE.Vector3) {
  const offset = point.clone().sub(circle.center);
  offset.addScaledVector(circle.normal, -offset.dot(circle.normal));
  const length = offset.length();
  return length > 1e-9 ? circle.center.clone().addScaledVector(offset, circle.radius / length) : point.clone();
}

/** The point across the circle: the other end of the diameter that starts at `point`, when `point` lies on it. */
export function pointAcrossCircle(circle: { center: THREE.Vector3; radius: number }, point: THREE.Vector3) {
  if (Math.abs(circle.center.distanceTo(point) - circle.radius) > Math.max(1e-4, circle.radius * 0.02)) return null;
  return circle.center.clone().multiplyScalar(2).sub(point);
}
