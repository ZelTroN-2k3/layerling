import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { circleOfEdgePoints, pointAcrossCircle, pointOnCircle } from "@/lib/tapeCircle";

/** A ring of `count` points on a circle, as a display edge has them; `closed` repeats the first point at the end. */
function ring(center: THREE.Vector3, radius: number, count: number, closed = true, normal = new THREE.Vector3(0, 1, 0), span = Math.PI * 2) {
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal.clone().normalize());
  const points: THREE.Vector3[] = [];
  const steps = closed ? count : count - 1;
  for (let index = 0; index <= steps; index += 1) {
    const angle = (index / steps) * span;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius).applyQuaternion(quaternion).add(center));
  }
  return points;
}

describe("the circle of an edge, for the diameter of a measurement (#308)", () => {
  it("finds the centre and radius of a ring", () => {
    const center = new THREE.Vector3(12, 5, -7);
    const circle = circleOfEdgePoints(ring(center, 15, 64));
    expect(circle).not.toBeNull();
    expect(circle!.center.distanceTo(center)).toBeCloseTo(0, 6);
    expect(circle!.radius).toBeCloseTo(15, 6);
    expect(Math.abs(circle!.normal.y)).toBeCloseTo(1, 6);
  });

  it("finds it on a tilted ring and on an arc as well", () => {
    const center = new THREE.Vector3(-3, 2, 9);
    const tilted = circleOfEdgePoints(ring(center, 8, 48, true, new THREE.Vector3(1, 2, 3)));
    expect(tilted!.center.distanceTo(center)).toBeCloseTo(0, 6);
    expect(tilted!.radius).toBeCloseTo(8, 6);
    const arc = circleOfEdgePoints(ring(center, 8, 24, false, new THREE.Vector3(0, 0, 1), Math.PI * 0.8));
    expect(arc!.center.distanceTo(center)).toBeCloseTo(0, 6);
    expect(arc!.radius).toBeCloseTo(8, 6);
  });

  it("says no for a straight edge, an ellipse and a path that leaves the plane", () => {
    const line = Array.from({ length: 10 }, (_, index) => new THREE.Vector3(index, 0, 0));
    expect(circleOfEdgePoints(line)).toBeNull();
    const ellipse = ring(new THREE.Vector3(), 10, 64).map((point) => new THREE.Vector3(point.x * 1.5, point.y, point.z));
    expect(circleOfEdgePoints(ellipse)).toBeNull();
    const helix = ring(new THREE.Vector3(), 10, 64).map((point, index) => new THREE.Vector3(point.x, index * 0.2, point.z));
    expect(circleOfEdgePoints(helix)).toBeNull();
    expect(circleOfEdgePoints(ring(new THREE.Vector3(), 10, 3, false))).toBeNull();
  });

  it("gives the point across the circle, which makes the exact diameter", () => {
    const center = new THREE.Vector3(12, 5, -7);
    const circle = circleOfEdgePoints(ring(center, 15, 64))!;
    const start = new THREE.Vector3(12 + 15 * Math.cos(1), 5, -7 + 15 * Math.sin(1));
    const across = pointAcrossCircle(circle, start)!;
    expect(across.distanceTo(start)).toBeCloseTo(30, 6);
    expect(across.clone().add(start).multiplyScalar(0.5).distanceTo(center)).toBeCloseTo(0, 6);
  });

  it("puts a point from the side of the polygon onto the true circle", () => {
    const polygon = ring(new THREE.Vector3(0, 3, 0), 15, 24);
    const circle = circleOfEdgePoints(polygon)!;
    // The middle of a side lies inside the circle by the sagitta.
    const middle = polygon[0].clone().add(polygon[1]).multiplyScalar(0.5);
    expect(middle.clone().sub(circle.center).length()).toBeLessThan(15 - 0.05);
    const placed = pointOnCircle(circle, middle);
    expect(placed.clone().sub(circle.center).length()).toBeCloseTo(15, 9);
    expect(placed.y).toBeCloseTo(3, 9);
    // Two such points across each other are exactly a diameter apart.
    const across = pointAcrossCircle(circle, placed)!;
    expect(across.distanceTo(placed)).toBeCloseTo(30, 9);
  });

  it("gives nothing when the first point is not on the circle", () => {
    const circle = circleOfEdgePoints(ring(new THREE.Vector3(), 15, 64))!;
    expect(pointAcrossCircle(circle, new THREE.Vector3(3, 0, 3))).toBeNull();
  });
});
