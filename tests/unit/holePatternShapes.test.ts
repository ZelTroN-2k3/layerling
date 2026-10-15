import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { DEFAULT_HOLE_PATTERN } from "@/lib/holePattern";
import { holeDepth, holePatternShapes, readPerforableFace, HOLE_OVERSHOOT } from "@/lib/holePatternShapes";
import { quaternionForShape } from "@/lib/geometryRotation";

/** World triangles of a box from (-w/2, 0, -d/2) to (w/2, h, d/2), two per side. */
function boxTriangles(w: number, h: number, d: number) {
  const geometry = new THREE.BoxGeometry(w, h, d).toNonIndexed();
  geometry.translate(0, h / 2, 0);
  return Array.from(geometry.getAttribute("position").array as Float32Array);
}

describe("hole pattern shapes", () => {
  const positions = boxTriangles(100, 60, 20);
  const settings = { ...DEFAULT_HOLE_PATTERN, form: "hexagon" as const, size: 6, spacing: 9, arrangement: "staggered" as const, margin: 4, depth: null };

  it("reads a flat face and the thickness behind it", () => {
    const read = readPerforableFace(positions, { x: 5, y: 30, z: 10 }, { x: 0, y: 0, z: 1 });
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.face.thickness).toBeCloseTo(20, 4);
    expect(read.face.outline.loops).toHaveLength(1);
  });

  it("puts ordinary hole shapes on the face, reaching through the body", () => {
    const read = readPerforableFace(positions, { x: 5, y: 30, z: 10 }, { x: 0, y: 0, z: 1 });
    if (!read.ok) throw new Error("no face");
    const plan = holePatternShapes(read.face, settings, "Hole");
    expect(plan.holes.length).toBeGreaterThan(40);
    const depth = holeDepth(read.face, settings);
    expect(depth).toBeCloseTo(20 + HOLE_OVERSHOOT, 6);
    plan.holes.forEach((hole) => {
      expect(hole.hole).toBe(true);
      expect(hole.kind).toBe("polygon");
      expect(hole.sides).toBe(6);
      expect(hole.height).toBeCloseTo(depth + HOLE_OVERSHOOT, 6);
      // The hole's own up axis points out of the face, along +z.
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternionForShape(hole));
      expect(up.z).toBeCloseTo(1, 4);
      // It stands on the face: its top lies HOLE_OVERSHOOT outside, its bottom behind the far side.
      const centre = new THREE.Vector3(hole.x, (hole.elevation ?? 0) + hole.height / 2, hole.z);
      const top = centre.clone().addScaledVector(up, hole.height / 2);
      const bottom = centre.clone().addScaledVector(up, -hole.height / 2);
      expect(top.z).toBeCloseTo(10 + HOLE_OVERSHOOT, 4);
      expect(bottom.z).toBeLessThan(-10);
      // Inside the face with the margin kept.
      expect(Math.abs(centre.x)).toBeLessThanOrEqual(50 - 4);
      expect(centre.y).toBeGreaterThanOrEqual(4);
      expect(centre.y).toBeLessThanOrEqual(56);
    });
  });

  it("uses the depth that was asked for", () => {
    const read = readPerforableFace(positions, { x: 0, y: 60, z: 0 }, { x: 0, y: 1, z: 0 });
    if (!read.ok) throw new Error("no face");
    const plan = holePatternShapes(read.face, { ...settings, form: "round", depth: 5 }, "Hole");
    expect(plan.holes.length).toBeGreaterThan(0);
    expect(plan.holes[0].kind).toBe("cylinder");
    expect(plan.holes[0].height).toBeCloseTo(5 + HOLE_OVERSHOOT, 6);
  });

  it("says a curved surface is no face", () => {
    const sphere = new THREE.SphereGeometry(10, 16, 12).toNonIndexed();
    const curved = readPerforableFace(Array.from(sphere.getAttribute("position").array as Float32Array), { x: 0, y: 10, z: 0 }, { x: 0, y: 1, z: 0 });
    expect(curved.ok).toBe(false);
  });
});
