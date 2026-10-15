import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  GEOMETRY_FINE_ROTATION_STEP_DEGREES,
  GEOMETRY_ROTATION_STEP_DEGREES,
  geometryRotationDegreesForShortcut,
  geometryRotationDelta,
  composedShapeRotation,
  rotatedGeometryShapePatch,
} from "@/lib/geometryRotation";
import { horizontalPlacementWorkplane, placementWorkplaneFromSurface } from "@/lib/placementWorkplane";
import type { WorkplaneShape } from "@/types/layerling";

function shape(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "box-1",
    name: "Box",
    kind: "box",
    color: "#d41721",
    x: 0,
    z: 0,
    elevation: 0,
    size: 20,
    width: 20,
    depth: 20,
    height: 20,
    rotation: 0,
    locked: false,
    hidden: false,
    ...overrides,
  };
}

function shortcut(overrides: Partial<Parameters<typeof geometryRotationDegreesForShortcut>[0]> = {}) {
  return geometryRotationDegreesForShortcut({
    altKey: false,
    code: "KeyR",
    ctrlKey: false,
    key: "r",
    metaKey: false,
    shiftKey: false,
    ...overrides,
  });
}

describe("geometry rotation shortcut", () => {
  it("maps R to 45 degrees and Shift+R to 22.5 degrees", () => {
    expect(shortcut()).toBe(GEOMETRY_ROTATION_STEP_DEGREES);
    expect(shortcut({ key: "R", shiftKey: true })).toBe(GEOMETRY_FINE_ROTATION_STEP_DEGREES);
  });

  it("does not intercept browser, command, Alt, or unrelated shortcuts", () => {
    expect(shortcut({ ctrlKey: true })).toBeNull();
    expect(shortcut({ metaKey: true })).toBeNull();
    expect(shortcut({ altKey: true })).toBeNull();
    expect(shortcut({ code: "KeyT", key: "t" })).toBeNull();
  });

  it("uses the physical R key even when the keyboard layout reports another character", () => {
    expect(shortcut({ key: "ρ" })).toBe(GEOMETRY_ROTATION_STEP_DEGREES);
  });
});

describe("geometry rotation transform", () => {
  it("rotates an object 45 degrees around the base workplane normal", () => {
    const delta = geometryRotationDelta(horizontalPlacementWorkplane(), 45);
    const patch = rotatedGeometryShapePatch(shape(), delta, null);

    expect(patch).toMatchObject({ rotationX: 0, rotation: 45, rotationZ: 0 });
    expect(patch).not.toHaveProperty("x");
    expect(patch).not.toHaveProperty("elevation");
  });

  it("preserves the fine 22.5-degree step on an oriented workplane", () => {
    const vertical = placementWorkplaneFromSurface(
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
    );
    const delta = geometryRotationDelta(vertical, 22.5);
    const patch = rotatedGeometryShapePatch(shape(), delta, null);

    expect(patch).toMatchObject({ rotationX: 22.5, rotation: 0, rotationZ: 0 });
  });

  it("rotates multi-object centers around the shared selection pivot", () => {
    const delta = geometryRotationDelta(horizontalPlacementWorkplane(), 90);
    const patch = rotatedGeometryShapePatch(shape({ x: 10, elevation: 4 }), delta, new THREE.Vector3(0, 14, 0));

    expect(patch.x).toBeCloseTo(0, 8);
    expect(patch.z).toBeCloseTo(-10, 8);
    expect(patch.elevation).toBeCloseTo(4, 8);
  });

  it("pre-multiplies the shortcut around the world workplane axis for compound rotations", () => {
    const source = shape({ rotationX: 18, rotation: 31, rotationZ: 12 });
    const delta = geometryRotationDelta(horizontalPlacementWorkplane(), 22.5);
    const patch = rotatedGeometryShapePatch(source, delta, null);
    const actual = new THREE.Quaternion().setFromEuler(new THREE.Euler(
      THREE.MathUtils.degToRad(patch.rotationX ?? 0),
      THREE.MathUtils.degToRad(patch.rotation ?? 0),
      THREE.MathUtils.degToRad(patch.rotationZ ?? 0),
      "XYZ",
    ));
    const sourceQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(
      THREE.MathUtils.degToRad(source.rotationX ?? 0),
      THREE.MathUtils.degToRad(source.rotation),
      THREE.MathUtils.degToRad(source.rotationZ ?? 0),
      "XYZ",
    ));
    const expected = delta.clone().multiply(sourceQuaternion);

    expect(actual.angleTo(expected)).toBeLessThan(0.002);
  });

  it("falls back to the world-up axis for a malformed workplane normal", () => {
    const malformed = { ...horizontalPlacementWorkplane(), normal: { x: 0, y: 0, z: 0 } };
    const patch = rotatedGeometryShapePatch(shape(), geometryRotationDelta(malformed, 45), null);

    expect(patch).toMatchObject({ rotationX: 0, rotation: 45, rotationZ: 0 });
  });

  /*
   * Eine gedrehte Form wird in ein Netz gebacken. Wer sie danach noch einmal
   * dreht, dreht das Netz - die urspruengliche Form muss beide Drehungen
   * kennen, um neu gebaut werden zu koennen. Ueber Eulerwinkel liesse sich das
   * nicht addieren.
   */
  it("verkettet zwei Drehungen, statt sie zu addieren", () => {
    const keine = { rotation: 0, rotationX: 0, rotationZ: 0 };
    expect(composedShapeRotation(keine, { rotation: 30, rotationX: 0, rotationZ: 0 }))
      .toEqual({ rotation: 30, rotationX: 0, rotationZ: 0 });

    // Zweimal 30 Grad um dieselbe Achse sind 60.
    expect(composedShapeRotation({ rotation: 30, rotationX: 0, rotationZ: 0 }, { rotation: 30, rotationX: 0, rotationZ: 0 }).rotation)
      .toBeCloseTo(60, 6);

    // Um verschiedene Achsen ist das Ergebnis keine Summe mehr: 90 Grad
    // gekippt und dann 90 Grad gegiert ergibt eine Drehung um die dritte
    // Achse. Genau hier gehen Eulerwinkel schief.
    /*
     * Um verschiedene Achsen zaehlt nicht das Ergebnis der Winkel, sondern
     * was mit einem Punkt geschieht. Also wird genau das geprueft: erst
     * innen, dann aussen drehen muss dasselbe ergeben wie die verkettete
     * Drehung in einem Zug.
     */
    const aussen = { rotation: 90, rotationX: 0, rotationZ: 0 };
    const innen = { rotation: 0, rotationX: 90, rotationZ: 0 };
    const alsEuler = (r: { rotation: number; rotationX: number; rotationZ: number }) => new THREE.Euler(
      THREE.MathUtils.degToRad(r.rotationX),
      THREE.MathUtils.degToRad(r.rotation),
      THREE.MathUtils.degToRad(r.rotationZ),
      "XYZ",
    );
    const punkt = new THREE.Vector3(1, 2, 3);
    const nacheinander = punkt.clone().applyEuler(alsEuler(innen)).applyEuler(alsEuler(aussen));
    const verkettet = punkt.clone().applyEuler(alsEuler(composedShapeRotation(aussen, innen)));
    expect(verkettet.x).toBeCloseTo(nacheinander.x, 5);
    expect(verkettet.y).toBeCloseTo(nacheinander.y, 5);
    expect(verkettet.z).toBeCloseTo(nacheinander.z, 5);
    // Und die Summe der Winkel waere etwas anderes gewesen.
    const summiert = punkt.clone().applyEuler(alsEuler({ rotation: 90, rotationX: 90, rotationZ: 0 }));
    expect(Math.hypot(summiert.x - verkettet.x, summiert.y - verkettet.y, summiert.z - verkettet.z)).toBeGreaterThan(1);

    // Und eine Drehung mit ihrer Gegendrehung hebt sich auf.
    const aufgehoben = composedShapeRotation({ rotation: -45, rotationX: 0, rotationZ: 0 }, { rotation: 45, rotationX: 0, rotationZ: 0 });
    expect(aufgehoben).toEqual({ rotation: 0, rotationX: 0, rotationZ: 0 });
  });
});
