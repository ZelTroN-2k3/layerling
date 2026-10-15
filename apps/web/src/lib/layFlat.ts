import * as THREE from "three";

type Vec = { x: number; y: number; z: number };

/**
 * The outward normal of a clicked triangle. The winding of display meshes is
 * not always consistent (the crescent's caps run the other way round), so the
 * side is taken from the click instead: a face that was hit faces the viewer,
 * so its outward normal points back against the ray.
 */
export function outwardFaceNormal(a: Vec, b: Vec, c: Vec, rayDirection: Vec): Vec | null {
  const ab = new THREE.Vector3(b.x - a.x, b.y - a.y, b.z - a.z);
  const ac = new THREE.Vector3(c.x - a.x, c.y - a.y, c.z - a.z);
  const normal = ab.cross(ac);
  if (normal.lengthSq() < 1e-18) return null;
  normal.normalize();
  if (normal.dot(new THREE.Vector3(rayDirection.x, rayDirection.y, rayDirection.z)) > 0) normal.negate();
  return { x: normal.x, y: normal.y, z: normal.z };
}

/**
 * The turn that lays a face flat on the workplane: its outward normal ends up
 * pointing into the plane (against the workplane's normal). The shortest such
 * turn, so a face that is nearly down only tips a little; a face that points
 * straight up is turned over about a horizontal axis.
 */
export function layFlatRotation(faceNormal: Vec, workplaneNormal: Vec = { x: 0, y: 1, z: 0 }): THREE.Quaternion {
  const from = new THREE.Vector3(faceNormal.x, faceNormal.y, faceNormal.z).normalize();
  const down = new THREE.Vector3(workplaneNormal.x, workplaneNormal.y, workplaneNormal.z).normalize().negate();
  if (from.dot(down) < -1 + 1e-9) {
    // Straight up: any axis in the plane works; pick one across the face.
    const axis = new THREE.Vector3(1, 0, 0).cross(down).lengthSq() > 1e-6
      ? new THREE.Vector3(1, 0, 0).projectOnPlane(down).normalize()
      : new THREE.Vector3(0, 0, 1).projectOnPlane(down).normalize();
    return new THREE.Quaternion().setFromAxisAngle(axis, Math.PI);
  }
  return new THREE.Quaternion().setFromUnitVectors(from, down);
}
