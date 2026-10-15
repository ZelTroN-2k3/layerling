import * as THREE from "three";
import type { WorkplaneShape } from "@/types/layerling";
import { hingeLocalParts } from "@/lib/hingeGeometry";
import { meshYawDegrees, mirrorSign } from "@/lib/workplaneShapes";

/**
 * The hinge's exact parts placed in the world, as ordinary shapes the edge
 * tool and the STEP export already build exactly. A lying cylinder or tube is
 * turned only about x and z: round shapes ignore their yaw when they are
 * placed, and being round, any turn that lays the axis the right way is the
 * same body.
 */
export function hingeWorldParts(hinge: WorkplaneShape): WorkplaneShape[] {
  const centerY = hinge.height / 2;
  const turn = new THREE.Euler(
    THREE.MathUtils.degToRad(hinge.rotationX ?? 0),
    THREE.MathUtils.degToRad(meshYawDegrees(hinge)),
    THREE.MathUtils.degToRad(hinge.rotationZ ?? 0),
    "XYZ",
  );
  const quaternion = new THREE.Quaternion().setFromEuler(turn);
  const matrix = new THREE.Matrix4()
    .makeTranslation(hinge.x, (hinge.elevation ?? 0) + centerY, hinge.z)
    .multiply(new THREE.Matrix4().makeRotationFromQuaternion(quaternion))
    .multiply(new THREE.Matrix4().makeScale(mirrorSign(hinge.mirrorX), mirrorSign(hinge.mirrorY), mirrorSign(hinge.mirrorZ)))
    .multiply(new THREE.Matrix4().makeTranslation(0, -centerY, 0));
  return hingeLocalParts({ ...hinge, depth: hinge.depth ?? hinge.width }).map((part, index) => {
    const center = new THREE.Vector3(part.x, (part.elevation ?? 0) + part.height / 2, part.z).applyMatrix4(matrix);
    let rotation = { rotationX: hinge.rotationX ?? 0, rotation: hinge.rotation, rotationZ: hinge.rotationZ ?? 0 };
    if (part.kind !== "box") {
      // Where the axis points: along the hinge's own x.
      const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion).normalize();
      const sinZ = THREE.MathUtils.clamp(-axis.x, -1, 1);
      const rotationZ = Math.asin(sinZ);
      const rotationX = Math.atan2(axis.z, axis.y);
      rotation = { rotationX: THREE.MathUtils.radToDeg(rotationX), rotation: 0, rotationZ: THREE.MathUtils.radToDeg(rotationZ) };
    }
    return {
      id: `${hinge.id}-part-${index}`,
      name: hinge.name,
      kind: part.kind,
      color: hinge.color,
      x: center.x,
      z: center.z,
      elevation: center.y - part.height / 2,
      size: Math.max(part.width, part.depth ?? part.width),
      width: part.width,
      depth: part.depth,
      height: part.height,
      ...rotation,
      bevel: part.bevel,
    };
  });
}
