import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { describe, expect, it } from "vitest";

describe("the size a bundle's content is stretched from (#152)", () => {
  it("is the real extent of the parts: a turned part's bounding box is wider than the part", () => {
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 12, 48));
    cylinder.rotation.y = THREE.MathUtils.degToRad(30);
    const content = new THREE.Group().add(cylinder);
    content.updateMatrixWorld(true);
    const loose = new THREE.Box3().setFromObject(content).getSize(new THREE.Vector3());
    const exact = new THREE.Box3().setFromObject(content, true).getSize(new THREE.Vector3());
    // Measured loosely, the content would count as wider than it is and be shrunk to fit.
    expect(loose.x).toBeGreaterThan(exact.x + 1);
    expect(exact.x).toBeCloseTo(16, 1);
  });

  it("is measured exactly where the viewport stretches a group's content", () => {
    const source = readFileSync(fileURLToPath(new URL("../../apps/web/src/components/WorkplaneViewport.tsx", import.meta.url)), "utf8");
    expect(source).toContain("new THREE.Box3().setFromObject(content, true)");
    expect(source).not.toContain("new THREE.Box3().setFromObject(content);");
  });
});
