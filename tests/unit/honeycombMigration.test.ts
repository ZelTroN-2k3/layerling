import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { honeycombReplacementParts } from "@/lib/honeycombMigration";
import { quaternionForShape } from "@/lib/geometryRotation";
import { makeShapeFromAsset } from "@/lib/shapeCatalog";

const honeycombAsset = { id: "honeycomb", name: "Honeycomb", src: "honeycomb.png", kind: "honeycomb" as const, color: "#0ea5e9" };

describe("a honeycomb in an older design", () => {
  it("becomes a box with hexagonal holes of the same cell size, wall and frame", () => {
    const honeycomb = makeShapeFromAsset(honeycombAsset, { x: 10, z: -5, elevation: 2 }, { width: 60, depth: 40, height: 3, honeycombCellSize: 8, honeycombWallThickness: 1.6, honeycombFrameWidth: 3 });
    const parts = honeycombReplacementParts(honeycomb);
    expect(parts).not.toBeNull();
    const { body, holes } = parts!;
    expect(body).toMatchObject({ kind: "box", x: 10, z: -5, elevation: 2, width: 60, depth: 40, height: 3 });
    expect(holes.length).toBeGreaterThanOrEqual(12);
    holes.forEach((hole) => {
      expect(hole).toMatchObject({ kind: "polygon", hole: true, sides: 6 });
      // The cell: 8 mm across the flats, standing through the plate from its top.
      expect(hole.width).toBeCloseTo(8, 4);
      expect(hole.depth).toBeCloseTo(8 * 2 / Math.sqrt(3), 4);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternionForShape(hole));
      expect(up.y).toBeCloseTo(1, 4);
      // Inside the frame: the hexagon's reach is half its corner size from the centre.
      expect(Math.abs(hole.x - 10) + hole.width / 2).toBeLessThanOrEqual(30 - 3 + 1e-6);
      expect(Math.abs(hole.z + 5) + hole.depth / 2).toBeLessThanOrEqual(20 - 3 + 1e-6);
    });
  });

  it("follows a turned honeycomb", () => {
    const honeycomb = { ...makeShapeFromAsset(honeycombAsset, { x: 0, z: 0, elevation: 0 }), rotationX: 90 };
    const parts = honeycombReplacementParts(honeycomb);
    expect(parts).not.toBeNull();
    const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternionForShape(honeycomb));
    parts!.holes.forEach((hole) => {
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternionForShape(hole));
      expect(up.dot(normal)).toBeCloseTo(1, 4);
    });
  });

  it("leaves a honeycomb that is a hole as it is, and anything else too", () => {
    const honeycomb = makeShapeFromAsset(honeycombAsset);
    expect(honeycombReplacementParts({ ...honeycomb, hole: true })).toBeNull();
    expect(honeycombReplacementParts({ ...honeycomb, kind: "box" })).toBeNull();
  });
});
