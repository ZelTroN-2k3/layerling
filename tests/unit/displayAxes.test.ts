import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { displayY, displayYTurn, insideZ, insideZTurn } from "@/lib/displayAxes";
import { quaternionForShape } from "@/lib/geometryRotation";
import { rowOffset } from "@/lib/shapeArray";

describe("right-handed axes on screen (#182)", () => {
  it("shows Y as minus the inside z, and back", () => {
    expect(displayY(12)).toBe(-12);
    expect(insideZ(displayY(-7.5))).toBe(-7.5);
    expect(Object.is(displayY(0), 0)).toBe(true);
  });

  it("agrees with the pattern tool, whose Y already counted towards the back", () => {
    // One step of 10 along Y in the pattern lands where the Y field then reads +10.
    const step = rowOffset({ spacingX: 0, spacingY: 10, spacingZ: 0 }, 1);
    expect(displayY(step.dz)).toBe(10);
  });

  it("is right-handed: X × Y = Z", () => {
    const x = new THREE.Vector3(1, 0, 0);
    const y = new THREE.Vector3(0, 0, insideZ(1)); // one step of Y, inside
    const z = new THREE.Vector3(0, 1, 0); // up
    expect(new THREE.Vector3().crossVectors(x, y).distanceTo(z)).toBeLessThan(1e-12);
  });

  it("turns about Y the right-handed way: +90 about Y takes X to minus Z (down)", () => {
    const turned = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternionForShape({ rotation: 0, rotationX: 0, rotationZ: insideZTurn(90) }));
    expect(turned.distanceTo(new THREE.Vector3(0, -1, 0))).toBeLessThan(1e-9);
    expect(displayYTurn(insideZTurn(35))).toBe(35);
  });
});
