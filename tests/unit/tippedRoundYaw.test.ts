import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { quaternionForShape } from "@/lib/geometryRotation";
import { shapeYawDegrees } from "@/lib/stepExport";
import { meshYawDegrees } from "@/lib/workplaneShapes";
import type { WorkplaneShape } from "@/types/layerling";

const cylinder = (extra: Partial<WorkplaneShape>) => ({ id: "c", name: "C", kind: "cylinder", x: 0, z: 0, size: 6, width: 6, depth: 6, height: 10, rotation: 0, ...extra }) as WorkplaneShape;

/** Where the cylinder's own axis points in the world with this yaw. */
const axisWith = (shape: WorkplaneShape, yaw: number) => new THREE.Vector3(0, 1, 0).applyQuaternion(quaternionForShape({ ...shape, rotation: yaw }));

describe("the yaw of a round body that lies on its side (forum 617836)", () => {
  it("keeps the yaw of a cylinder tipped about Z: it decides where it points", () => {
    for (const rotation of [0, 45, 120, 240]) {
      const pin = cylinder({ rotationZ: 90, rotation });
      expect(meshYawDegrees(pin)).toBe(rotation);
      expect(shapeYawDegrees(pin)).toBe(rotation);
      // What the mesh and STEP use points where the view shows it.
      expect(axisWith(pin, meshYawDegrees(pin)).distanceTo(axisWith(pin, rotation))).toBeLessThan(1e-9);
    }
  });

  it("still drops a yaw that only spins a standing (or X-tipped) cylinder about its own axis", () => {
    expect(meshYawDegrees(cylinder({ rotation: 90 }))).toBe(0);
    expect(shapeYawDegrees(cylinder({ rotation: 90 }))).toBe(0);
    const tippedX = cylinder({ rotationX: 90, rotation: 90 });
    expect(axisWith(tippedX, meshYawDegrees(tippedX)).distanceTo(axisWith(tippedX, 90))).toBeLessThan(1e-9);
  });
});
