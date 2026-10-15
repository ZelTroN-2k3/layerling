import { describe, expect, it } from "vitest";
import {
  bakeCadMetadataForShapeTransform,
  cadBrepTransformForShape,
  cadModifierPrimitiveForAnalyticBox,
  cadModifierPrimitiveForAnalyticShape,
  cadModifierPrimitiveForBakedShape,
} from "@/lib/cadBakeMetadata";
import { cadTransformRequiresGeneralTransform } from "@/lib/cadModifierRuntime";
import type { WorkplaneShape } from "@/types/layerling";

function expectTransformClose(actual: number[] | undefined, expected: number[]) {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((value, index) => {
    expect(actual?.[index]).toBeCloseTo(value, 6);
  });
}

function treatedMeshShape(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "treated-mesh",
    name: "Treated Mesh",
    kind: "mesh",
    color: "#d41721",
    x: 10,
    z: 0,
    elevation: 5,
    size: 2,
    width: 2,
    depth: 2,
    height: 2,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    importedMesh: {
      positions: [-1, 0, 0, 1, 0, 0, 0, 2, 0],
      baseWidth: 2,
      baseDepth: 2,
      baseHeight: 2,
      triangleCount: 1,
      sourceFormat: "json",
    },
    edgeTreatments: [{ kind: "fillet", amount: 0.5, edgeCount: 1 }],
    cadDisplayEdges: [{ points: [-1, 0, 0, 1, 0, 0] }],
    cadDisplayEdgesVersion: 2,
    cadBrep: "stored-brep-before-rotation",
    cadBrepFrame: {
      x: 10,
      z: 0,
      elevation: 5,
      width: 2,
      depth: 2,
      height: 2,
    },
    locked: false,
    hidden: false,
    ...overrides,
  };
}

function boxShape(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "box",
    name: "Box",
    kind: "box",
    color: "#d41721",
    x: 4,
    z: -6,
    elevation: 2,
    size: 20,
    width: 20,
    depth: 18,
    height: 16,
    rotation: 32,
    rotationX: 18,
    rotationZ: 24,
    locked: false,
    hidden: false,
    ...overrides,
  };
}

function cylinderShape(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "cylinder-shape",
    name: "Cylinder",
    kind: "cylinder",
    color: "#d97813",
    x: 0,
    z: 0,
    elevation: 0,
    size: 20,
    width: 20,
    depth: 20,
    height: 30,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    locked: false,
    hidden: false,
    ...overrides,
  };
}

function coneShape(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "cone-shape",
    name: "Cone",
    kind: "cone",
    color: "#6e2786",
    x: 0,
    z: 0,
    elevation: 0,
    size: 28,
    width: 28,
    depth: 28,
    height: 40,
    baseRadius: 14,
    topRadius: 0,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    locked: false,
    hidden: false,
    ...overrides,
  };
}

function sphereShape(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "sphere-shape",
    name: "Sphere",
    kind: "sphere",
    color: "#0098c7",
    x: 0,
    z: 0,
    elevation: 0,
    size: 20,
    width: 20,
    depth: 20,
    height: 20,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    locked: false,
    hidden: false,
    ...overrides,
  };
}

function torusShape(overrides: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return {
    id: "torus-shape",
    name: "Torus",
    kind: "torus",
    color: "#d97813",
    x: 0,
    z: 0,
    elevation: 0,
    size: 30,
    width: 30,
    depth: 30,
    height: 10,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    locked: false,
    hidden: false,
    ...overrides,
  };
}

describe("Layerling transform baking", () => {
  it("preserves exact BREP and rebases CAD display edges after wheel rotation", () => {
    const shape = treatedMeshShape({ rotationZ: 90 });
    const baked = bakeCadMetadataForShapeTransform(shape, {
      centerX: 10,
      minY: 5,
      centerZ: 0,
      width: 2,
      depth: 2,
      height: 2,
      yawDegrees: 0,
    });
    const expectedTransform = [0, -1, 0, 16, 1, 0, 0, -4, 0, 0, 1, 0];

    expect(baked.cadBrep).toBe("stored-brep-before-rotation");
    expect(baked.cadBrepFrame).toMatchObject({
      x: 10,
      z: 0,
      elevation: 5,
      width: 2,
      depth: 2,
      height: 2,
    });
    expectTransformClose(baked.cadBrepFrame?.sourceTransform, expectedTransform);
    expect(baked.cadDisplayEdgesVersion).toBe(2);
    expect(baked.cadDisplayEdges?.[0].points).toEqual([1, 0, 0, 1, 2, 0]);

    const bakedShape: WorkplaneShape = {
      ...shape,
      ...baked,
      x: 10,
      z: 0,
      elevation: 5,
      width: 2,
      depth: 2,
      height: 2,
      size: 2,
      rotation: 0,
      rotationX: 0,
      rotationZ: 0,
    };
    expectTransformClose(cadBrepTransformForShape(bakedShape), expectedTransform);
  });

  it("preserves an analytic box primitive when wheel rotation bakes it to a mesh", () => {
    const shape = boxShape();
    const directPrimitive = cadModifierPrimitiveForAnalyticBox(shape);
    expect(directPrimitive?.transform).toBeDefined();

    const baked = bakeCadMetadataForShapeTransform(shape, {
      centerX: 4.5,
      minY: -2,
      centerZ: -5.5,
      width: 27,
      depth: 26,
      height: 25,
      yawDegrees: 32,
    });

    expect(baked.cadPrimitiveFrame).toMatchObject({
      kind: "box",
      width: 20,
      depth: 18,
      height: 16,
      frame: {
        x: 4.5,
        z: -5.5,
        elevation: -2,
        width: 27,
        depth: 26,
        height: 25,
      },
    });
    expectTransformClose(baked.cadPrimitiveFrame?.frame.sourceTransform, directPrimitive?.transform ?? []);

    const bakedShape: WorkplaneShape = {
      ...shape,
      ...baked,
      kind: "mesh",
      x: 4.5,
      z: -5.5,
      elevation: -2,
      width: 27,
      depth: 26,
      height: 25,
      size: 27,
      rotation: 0,
      rotationX: 0,
      rotationZ: 0,
      importedMesh: {
        positions: [-1, 0, 0, 1, 0, 0, 0, 1, 0],
        baseWidth: 27,
        baseDepth: 26,
        baseHeight: 25,
        triangleCount: 1,
        sourceFormat: "json",
      },
    };
    const restoredPrimitive = cadModifierPrimitiveForBakedShape(bakedShape);
    expect(restoredPrimitive).toMatchObject({
      kind: "box",
      width: 20,
      depth: 18,
      height: 16,
    });
    expectTransformClose(restoredPrimitive?.transform, directPrimitive?.transform ?? []);
  });

  it("uses a general CAD transform after resizing a baked rotated box", () => {
    const shape = boxShape({
      x: 0,
      z: 0,
      elevation: 0,
      width: 20,
      depth: 20,
      height: 20,
      rotation: 45,
      rotationX: 0,
      rotationZ: 0,
    });
    const diagonal = Math.sqrt(20 ** 2 + 20 ** 2);
    const baked = bakeCadMetadataForShapeTransform(shape, {
      centerX: 0,
      minY: 0,
      centerZ: 0,
      width: diagonal,
      depth: diagonal,
      height: 20,
      yawDegrees: 45,
    });
    const resizedBakedShape: WorkplaneShape = {
      ...shape,
      ...baked,
      kind: "mesh",
      width: diagonal * 1.8,
      depth: diagonal * 0.75,
      height: 26,
      size: diagonal * 1.8,
      rotation: 0,
      rotationX: 0,
      rotationZ: 0,
      importedMesh: {
        positions: [-10, 0, -10, 10, 0, -10, 10, 20, 10],
        baseWidth: diagonal,
        baseDepth: diagonal,
        baseHeight: 20,
        triangleCount: 1,
        sourceFormat: "json",
      },
    };

    const restoredPrimitive = cadModifierPrimitiveForBakedShape(resizedBakedShape);
    expect(restoredPrimitive?.transform).toBeDefined();
    expect(cadTransformRequiresGeneralTransform(restoredPrimitive?.transform ?? [])).toBe(true);
  });

  it("extracts an analytic cylinder primitive for circular cylinders and skips elliptical ones", () => {
    const circular = cylinderShape();
    const primitive = cadModifierPrimitiveForAnalyticShape(circular);
    expect(primitive).toMatchObject({
      kind: "cylinder",
      radius: 10,
      width: 20,
      depth: 20,
      height: 30,
    });

    const elliptical = cylinderShape({ width: 20, depth: 25 });
    expect(cadModifierPrimitiveForAnalyticShape(elliptical)).toBeNull();
  });

  it("leaves cylinders, cones and balls drawn with few sides to their flat faces", () => {
    // A hexagon bar (a nut pocket, say) is not a round cylinder, and one baked from now on does not come back as one.
    expect(cadModifierPrimitiveForAnalyticShape(cylinderShape({ sides: 6 }))).toBeNull();
    expect(cadModifierPrimitiveForAnalyticShape(cylinderShape({ sides: 12 }))).toBeNull();
    expect(cadModifierPrimitiveForAnalyticShape(cylinderShape({ width: 150, depth: 150, sides: 24 }))).toBeNull();
    // Sides following the size, or the former fixed 96, stay round however large.
    expect(cadModifierPrimitiveForAnalyticShape(cylinderShape({ width: 200, depth: 200 }))?.kind).toBe("cylinder");
    expect(cadModifierPrimitiveForAnalyticShape(cylinderShape({ width: 200, depth: 200, sides: 96 }))?.kind).toBe("cylinder");
    expect(cadModifierPrimitiveForAnalyticShape(cylinderShape({ width: 2, depth: 2, sides: 48 }))?.kind).toBe("cylinder");
    expect(cadModifierPrimitiveForAnalyticShape(coneShape({ sides: 6 }))).toBeNull();
    expect(cadModifierPrimitiveForAnalyticShape(coneShape({ width: 200, depth: 200, baseRadius: 100, sides: 96 }))?.kind).toBe("cone");
    // Six steps draw a ball of 12 x 6 facets; its own 24 are round.
    expect(cadModifierPrimitiveForAnalyticShape(sphereShape({ steps: 6 }))).toBeNull();
    expect(cadModifierPrimitiveForAnalyticShape(sphereShape({ width: 200, depth: 200, height: 200, size: 200, steps: 24 }))?.kind).toBe("sphere");
    expect(cadModifierPrimitiveForAnalyticShape(sphereShape())?.kind).toBe("sphere");
  });

  it("extracts an analytic cone primitive including truncated cones", () => {
    const pointedCone = coneShape();
    const pointedPrimitive = cadModifierPrimitiveForAnalyticShape(pointedCone);
    expect(pointedPrimitive).toMatchObject({
      kind: "cone",
      baseRadius: 14,
      topRadius: 0,
      width: 28,
      depth: 28,
      height: 40,
    });

    const truncatedCone = coneShape({ topRadius: 6 });
    const truncatedPrimitive = cadModifierPrimitiveForAnalyticShape(truncatedCone);
    expect(truncatedPrimitive).toMatchObject({
      kind: "cone",
      baseRadius: 14,
      topRadius: 6,
      width: 28,
      depth: 28,
      height: 40,
    });
  });

  it("preserves an analytic cylinder primitive through transform baking", () => {
    const shape = cylinderShape({
      x: 10,
      elevation: 2,
      rotation: 30,
    });
    const directPrimitive = cadModifierPrimitiveForAnalyticShape(shape);
    expect(directPrimitive?.kind).toBe("cylinder");

    const baked = bakeCadMetadataForShapeTransform(shape, {
      centerX: 10,
      minY: 2,
      centerZ: 0,
      width: 20,
      depth: 20,
      height: 30,
      yawDegrees: 30,
    });

    expect(baked.cadPrimitiveFrame).toMatchObject({
      kind: "cylinder",
      radius: 10,
      width: 20,
      depth: 20,
      height: 30,
    });

    const bakedShape: WorkplaneShape = {
      ...shape,
      ...baked,
      kind: "mesh",
      x: 10,
      z: 0,
      elevation: 2,
      rotation: 0,
      rotationX: 0,
      rotationZ: 0,
      importedMesh: {
        positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
        baseWidth: 20,
        baseDepth: 20,
        baseHeight: 30,
        triangleCount: 1,
        sourceFormat: "json",
      },
    };

    const restored = cadModifierPrimitiveForBakedShape(bakedShape);
    expect(restored).toMatchObject({
      kind: "cylinder",
      radius: 10,
      width: 20,
      depth: 20,
      height: 30,
    });
    expectTransformClose(restored?.transform, directPrimitive?.transform ?? []);
  });

  it("preserves an analytic cone primitive through transform baking", () => {
    const shape = coneShape({
      x: 5,
      elevation: 0,
      topRadius: 4,
      rotation: 45,
    });
    const directPrimitive = cadModifierPrimitiveForAnalyticShape(shape);
    expect(directPrimitive?.kind).toBe("cone");

    const baked = bakeCadMetadataForShapeTransform(shape, {
      centerX: 5,
      minY: 0,
      centerZ: 0,
      width: 28,
      depth: 28,
      height: 40,
      yawDegrees: 45,
    });

    expect(baked.cadPrimitiveFrame).toMatchObject({
      kind: "cone",
      baseRadius: 14,
      topRadius: 4,
      width: 28,
      depth: 28,
      height: 40,
    });

    const bakedShape: WorkplaneShape = {
      ...shape,
      ...baked,
      kind: "mesh",
      x: 5,
      z: 0,
      elevation: 0,
      rotation: 0,
      rotationX: 0,
      rotationZ: 0,
      importedMesh: {
        positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
        baseWidth: 28,
        baseDepth: 28,
        baseHeight: 40,
        triangleCount: 1,
        sourceFormat: "json",
      },
    };

    const restored = cadModifierPrimitiveForBakedShape(bakedShape);
    expect(restored).toMatchObject({
      kind: "cone",
      baseRadius: 14,
      topRadius: 4,
      width: 28,
      depth: 28,
      height: 40,
    });
    expectTransformClose(restored?.transform, directPrimitive?.transform ?? []);
  });

  it("extracts an analytic sphere primitive for uniform spheres and skips non-uniform ones", () => {
    const uniform = sphereShape();
    const primitive = cadModifierPrimitiveForAnalyticShape(uniform);
    expect(primitive).toMatchObject({
      kind: "sphere",
      radius: 10,
      width: 20,
      depth: 20,
      height: 20,
    });

    const nonUniform = sphereShape({ width: 20, depth: 20, height: 25 });
    expect(cadModifierPrimitiveForAnalyticShape(nonUniform)).toBeNull();
  });

  it("extracts an analytic torus primitive for circular tori and skips elliptical ones", () => {
    const circular = torusShape();
    const primitive = cadModifierPrimitiveForAnalyticShape(circular);
    expect(primitive).toMatchObject({
      kind: "torus",
      majorRadius: 10,
      minorRadius: 5,
      width: 30,
      depth: 30,
      height: 10,
    });

    const elliptical = torusShape({ width: 30, depth: 35 });
    expect(cadModifierPrimitiveForAnalyticShape(elliptical)).toBeNull();
  });

  it("preserves an analytic sphere primitive through transform baking", () => {
    const shape = sphereShape({
      x: 10,
      elevation: 5,
      rotation: 45,
    });
    const directPrimitive = cadModifierPrimitiveForAnalyticShape(shape);
    expect(directPrimitive?.kind).toBe("sphere");

    const baked = bakeCadMetadataForShapeTransform(shape, {
      centerX: 10,
      minY: 5,
      centerZ: 0,
      width: 20,
      depth: 20,
      height: 20,
      yawDegrees: 45,
    });

    expect(baked.cadPrimitiveFrame).toMatchObject({
      kind: "sphere",
      radius: 10,
      width: 20,
      depth: 20,
      height: 20,
    });

    const bakedShape: WorkplaneShape = {
      ...shape,
      ...baked,
      kind: "mesh",
      importedMesh: {
        positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
        baseWidth: 20,
        baseDepth: 20,
        baseHeight: 20,
        triangleCount: 1,
        sourceFormat: "json",
      },
    };

    const restored = cadModifierPrimitiveForBakedShape(bakedShape);
    expect(restored).toMatchObject({
      kind: "sphere",
      radius: 10,
      width: 20,
      depth: 20,
      height: 20,
    });
  });

  it("preserves an analytic torus primitive through transform baking", () => {
    const shape = torusShape({
      x: 5,
      elevation: 2,
      rotation: 15,
    });
    const directPrimitive = cadModifierPrimitiveForAnalyticShape(shape);
    expect(directPrimitive?.kind).toBe("torus");

    const baked = bakeCadMetadataForShapeTransform(shape, {
      centerX: 5,
      minY: 2,
      centerZ: 0,
      width: 30,
      depth: 30,
      height: 10,
      yawDegrees: 15,
    });

    expect(baked.cadPrimitiveFrame).toMatchObject({
      kind: "torus",
      majorRadius: 10,
      minorRadius: 5,
      width: 30,
      depth: 30,
      height: 10,
    });

    const bakedShape: WorkplaneShape = {
      ...shape,
      ...baked,
      kind: "mesh",
      importedMesh: {
        positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
        baseWidth: 30,
        baseDepth: 30,
        baseHeight: 10,
        triangleCount: 1,
        sourceFormat: "json",
      },
    };

    const restored = cadModifierPrimitiveForBakedShape(bakedShape);
    expect(restored).toMatchObject({
      kind: "torus",
      majorRadius: 10,
      minorRadius: 5,
      width: 30,
      depth: 30,
      height: 10,
    });
  });
});
