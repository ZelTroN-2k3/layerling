import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { layFlatRotation, outwardFaceNormal } from "@/lib/layFlat";

const turned = (q: THREE.Quaternion, v: { x: number; y: number; z: number }) => new THREE.Vector3(v.x, v.y, v.z).applyQuaternion(q);

describe("lay flat on a face", () => {
  it("takes the side of the face from the click, whatever the winding", () => {
    const a = { x: 0, y: 0, z: 0 };
    const b = { x: 1, y: 0, z: 0 };
    const c = { x: 0, y: 1, z: 0 };
    // Looking at the face from +z: outward is +z for both windings.
    expect(outwardFaceNormal(a, b, c, { x: 0, y: 0, z: -1 })?.z).toBeCloseTo(1);
    expect(outwardFaceNormal(a, c, b, { x: 0, y: 0, z: -1 })?.z).toBeCloseTo(1);
    expect(outwardFaceNormal(a, a, c, { x: 0, y: 0, z: -1 })).toBeNull();
  });

  it("turns a side face down onto the plate", () => {
    const q = layFlatRotation({ x: 1, y: 0, z: 0 });
    const down = turned(q, { x: 1, y: 0, z: 0 });
    expect(down.y).toBeCloseTo(-1);
    // The shortest turn: 90 degrees.
    expect(2 * Math.acos(Math.min(1, Math.abs(q.w)))).toBeCloseTo(Math.PI / 2);
  });

  it("turns a slanted face down", () => {
    const n = new THREE.Vector3(1, 1, 1).normalize();
    expect(turned(layFlatRotation(n), n).y).toBeCloseTo(-1);
  });

  it("turns the top face over", () => {
    const q = layFlatRotation({ x: 0, y: 1, z: 0 });
    expect(turned(q, { x: 0, y: 1, z: 0 }).y).toBeCloseTo(-1);
  });

  it("leaves a face that is already down alone", () => {
    const q = layFlatRotation({ x: 0, y: -1, z: 0 });
    expect(q.w).toBeCloseTo(1);
  });

  it("lays the face into a tilted workplane", () => {
    const workplaneNormal = { x: 1, y: 0, z: 0 };
    const q = layFlatRotation({ x: 0, y: 1, z: 0 }, workplaneNormal);
    expect(turned(q, { x: 0, y: 1, z: 0 }).x).toBeCloseTo(-1);
  });
});
