import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { mateMotion, shortestTurn } from "@/lib/mateFaces";

const v = (x: number, y: number, z: number) => ({ x, y, z });

describe("aligning one face with another", () => {
  // A body whose right face (+x) sits at x = 10, and a target whose left face (-x) sits at x = 50.
  const source = { normal: v(1, 0, 0), point: v(10, 3, 4) };
  const target = { normal: v(-1, 0, 0), point: v(50, 0, 0) };

  it("slides face to face without turning when the faces already look at each other", () => {
    const motion = mateMotion(source, target, "against");
    expect(motion.rotation).toBeNull();
    expect(motion.translation.x).toBeCloseTo(40);
    expect(motion.translation.y).toBeCloseTo(0);
    expect(motion.translation.z).toBeCloseTo(0);
  });

  it("leaves the gap asked for, out of the target face", () => {
    const motion = mateMotion(source, target, "against", 2);
    expect(motion.translation.x).toBeCloseTo(38);
  });

  it("turns the face round to lie flush beside the other", () => {
    const motion = mateMotion(source, target, "flush");
    expect(motion.rotation).not.toBeNull();
    const turned = new THREE.Vector3(1, 0, 0).applyQuaternion(motion.rotation!);
    expect(turned.x).toBeCloseTo(-1);
    // About the clicked point, so the face stays at x = 10 and then slides to x = 50.
    expect(motion.pivot.x).toBeCloseTo(10);
    expect(motion.translation.x).toBeCloseTo(40);
  });

  it("only slides along the target's normal, keeping the body's place sideways", () => {
    const top = { normal: v(0, 1, 0), point: v(7, 20, -3) };
    const bottom = { normal: v(0, -1, 0), point: v(-5, 5, 9) };
    const motion = mateMotion(bottom, top, "against");
    expect(motion.translation.x).toBeCloseTo(0);
    expect(motion.translation.z).toBeCloseTo(0);
    expect(motion.translation.y).toBeCloseTo(15);
  });

  it("takes the shortest turn, also for opposite directions", () => {
    const quarter = shortestTurn(v(1, 0, 0), v(0, 0, 1));
    expect(new THREE.Vector3(1, 0, 0).applyQuaternion(quarter).z).toBeCloseTo(1);
    const half = shortestTurn(v(0, 1, 0), v(0, -1, 0));
    expect(new THREE.Vector3(0, 1, 0).applyQuaternion(half).y).toBeCloseTo(-1);
  });
});
