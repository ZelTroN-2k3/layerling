import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { WorkplaneShape } from "@/types/layerling";
import { cadModifierProfileForShape } from "@/lib/cadProfileExtrusion";
import { profileExtrusionSolid } from "@/lib/cadProfileSolid";
import { cadTransformRequiresGeneralTransform } from "@/lib/cadModifierRuntime";

/*
 * The round catalog shapes as exact bodies against the real kernel: ellipse,
 * oval cylinder, tube, half sphere, round roof, rounded box, and the sphere
 * and cone that are not round. Each is a valid solid with the volume its
 * outline predicts, standing where the display mesh stands.
 */

function shape(kind: WorkplaneShape["kind"], extra: Partial<WorkplaneShape> = {}): WorkplaneShape {
  return { id: `test-${kind}`, name: kind, kind, x: 0, z: 0, elevation: 0, size: 20, width: 20, depth: 20, height: 10, rotation: 0, color: "#ff8800", ...extra } as WorkplaneShape;
}

describe("exact bodies for the round shapes with the real OCCT kernel", () => {
  let cad: OcctKernel;
  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    cad = await OcctKernel.init({ wasm });
  });

  /** Vertices of a fine mesh of a copy, as [x, y, z] triples. */
  function meshVertices(solid: ShapeHandle) {
    const copy = cad.copy(solid);
    const { positions } = cad.tessellate(copy, { linearDeflection: 0.01, angularDeflection: 0.2 });
    cad.release(copy);
    const vertices: number[][] = [];
    for (let index = 0; index < positions.length; index += 3) vertices.push([positions[index], positions[index + 1], positions[index + 2]]);
    return vertices;
  }

  /** How far the mesh vertices above y = 0 lie off the ellipsoid with these semi-axes around (0, cy, 0), in mm. */
  function onEllipsoid(solid: ShapeHandle, rx: number, ry: number, rz: number, cy: number) {
    return Math.max(...meshVertices(solid).filter(([, y]) => y > 1e-4).map(([x, y, z]) => Math.abs(Math.hypot(x / rx, (y - cy) / ry, z / rz) - 1) * Math.min(rx, ry, rz)));
  }

  /** How far the mesh vertices strictly between base and top lie off the elliptic cone (depth half the width), in mm. */
  function offCone(solid: ShapeHandle, base: number, top: number, height: number, stretch: number) {
    return Math.max(...meshVertices(solid).filter(([, y]) => y > 1e-4 && y < height - 1e-4).map(([x, y, z]) => {
      const a = base + ((top - base) * y) / height;
      return Math.abs(Math.hypot(x / a, z / (a * stretch)) - 1) * a * stretch;
    }));
  }

  function build(source: WorkplaneShape) {
    const part = cadModifierProfileForShape(source);
    expect(part).not.toBeNull();
    const local = profileExtrusionSolid(cad, part!);
    // As the worker places it: a stretched placement needs the general transform.
    const transform = part!.transform;
    const solid = !transform ? local : cadTransformRequiresGeneralTransform(transform) ? cad.generalTransform(local, transform) : cad.transform(local, transform);
    expect(cad.isSolid(solid)).toBe(true);
    expect(cad.isValid(solid)).toBe(true);
    return solid;
  }

  it("ellipse: an elliptic prism with the exact area", () => {
    const solid = build(shape("ellipse", { x: 3, z: -2, elevation: 1, width: 26, depth: 16, height: 20 }));
    expect(cad.getVolume(solid)).toBeCloseTo(Math.PI * 13 * 8 * 20, 2);
    const box = cad.getBoundingBox(solid);
    expect(box.xmax - box.xmin).toBeCloseTo(26, 3);
    expect(box.zmax - box.zmin).toBeCloseTo(16, 3);
    expect(box.ymin).toBeCloseTo(1, 4);
    expect(box.ymax).toBeCloseTo(21, 4);
    // One closed edge per rim, and the side's seam line.
    expect(cad.subShapeCount(solid, "edge")).toBe(3);
    expect(cad.subShapeCount(solid, "face")).toBe(3);
  });

  it("cylinder: only an oval one is a profile, a round one stays the analytic primitive", () => {
    expect(cadModifierProfileForShape(shape("cylinder", { width: 20, depth: 20 }))).toBeNull();
    const solid = build(shape("cylinder", { width: 30, depth: 20, height: 12 }));
    expect(cad.getVolume(solid)).toBeCloseTo(Math.PI * 15 * 10 * 12, 2);
  });

  it("tube: outer ellipse minus inner ellipse, the wall from bevel", () => {
    const solid = build(shape("tube", { width: 34, depth: 34, height: 28, bevel: 6 }));
    expect(cad.getVolume(solid)).toBeCloseTo(Math.PI * (17 ** 2 - 11 ** 2) * 28, 2);
    expect(cad.subShapeCount(solid, "face")).toBeGreaterThanOrEqual(4);
    const oval = build(shape("tube", { width: 40, depth: 24, height: 10, bevel: 3 }));
    expect(cad.getVolume(oval)).toBeCloseTo(Math.PI * (20 * 12 - 17 * 9) * 10, 2);
    expect(cad.subShapeCount(oval, "edge")).toBe(6);
  });

  it("halfSphere: a dome standing on its flat base", () => {
    const solid = build(shape("halfSphere", { x: 1, z: 2, elevation: 3, width: 22, depth: 22, height: 11 }));
    expect(cad.getVolume(solid)).toBeCloseTo((2 / 3) * Math.PI * 11 ** 3, 1);
    const box = cad.getBoundingBox(solid);
    expect(box.ymin).toBeCloseTo(3, 4);
    expect(box.ymax).toBeCloseTo(14, 3);
    expect(box.xmax - box.xmin).toBeCloseTo(22, 3);
    expect(cad.subShapeCount(solid, "face")).toBe(2);
    const flatter = build(shape("halfSphere", { width: 22, depth: 22, height: 8 }));
    expect(cad.getVolume(flatter)).toBeCloseTo((2 / 3) * Math.PI * 11 * 11 * 8, 1);
    // An oval dome: the same section stretched to the depth.
    const oval = build(shape("halfSphere", { width: 22, depth: 30, height: 11 }));
    const ovalBox = cad.getBoundingBox(oval);
    expect(ovalBox.zmax - ovalBox.zmin).toBeCloseTo(30, 2);
    expect(onEllipsoid(oval, 11, 11, 15, 0)).toBeLessThan(1e-5);
  });

  it("sphere: a spheroid is a turned half ellipse, an ellipsoid the same stretched to the depth", () => {
    const spheroid = build(shape("sphere", { x: 2, elevation: 1, width: 20, depth: 20, height: 30 }));
    expect(cad.getVolume(spheroid)).toBeCloseTo((4 / 3) * Math.PI * 10 * 15 * 10, 1);
    const box = cad.getBoundingBox(spheroid);
    expect(box.ymin).toBeCloseTo(1, 3);
    expect(box.ymax).toBeCloseTo(31, 3);
    const ellipsoid = build(shape("sphere", { width: 30, depth: 20, height: 16 }));
    // B-spline volumes come out of the kernel a little off; the surface is exact.
    expect(onEllipsoid(ellipsoid, 15, 8, 10, 8)).toBeLessThan(1e-5);
  });

  it("cone: an oval cone or frustum is its section turned and stretched to the depth", () => {
    const pointed = build(shape("cone", { width: 30, depth: 15, height: 15, baseRadius: 15, topRadius: 0 }));
    const frustum = build(shape("cone", { width: 30, depth: 15, height: 15, baseRadius: 15, topRadius: 4 }));
    [[pointed, 0], [frustum, 4]].forEach(([solid, top]) => {
      const box = cad.getBoundingBox(solid as ShapeHandle);
      expect(box.xmax - box.xmin).toBeCloseTo(30, 2);
      expect(box.zmax - box.zmin).toBeCloseTo(15, 2);
      expect(box.ymax - box.ymin).toBeCloseTo(15, 2);
      // Every vertex of the side lies on the elliptic cone x^2/a^2 + z^2/(a/2)^2 = 1, a from 15 down to the top radius.
      expect(offCone(solid as ShapeHandle, 15, top as number, 15, 0.5)).toBeLessThan(1e-5);
    });
    // A round cone stays the analytic primitive.
    expect(cadModifierProfileForShape(shape("cone", { width: 20, depth: 20, height: 15 }))).toBeNull();
    // On its tip, as CylinderGeometry(top, 0) draws it: the point at y = 0, the oval at the top.
    const tip = build(shape("cone", { width: 30, depth: 15, height: 15, baseRadius: 0, topRadius: 15 }));
    const tipBox = cad.getBoundingBox(tip);
    expect(tipBox.ymin).toBeCloseTo(0, 3);
    expect(offCone(tip, 0, 15, 15, 0.5)).toBeLessThan(1e-5);
  });

  it("the stretched bodies take fillets and chamfers on their rims, also turned and mirrored", () => {
    const rims = (solid: ShapeHandle) => cad.getSubShapes(solid, "edge").filter((edge) => cad.curveType(edge) !== "line" && cad.getBoundingBox(edge).xmax - cad.getBoundingBox(edge).xmin > 1);
    const placement = { x: 5, z: -3, elevation: 2, rotation: 33, rotationX: 40, mirrorZ: true };
    [
      shape("halfSphere", { width: 30, depth: 20, height: 10 }),
      shape("cone", { width: 30, depth: 15, height: 15, baseRadius: 15, topRadius: 0 }),
      shape("cone", { width: 30, depth: 15, height: 15, baseRadius: 15, topRadius: 4 }),
    ].forEach((source) => {
      [source, { ...source, ...placement }].forEach((placed) => {
        const solid = build(placed);
        const edges = rims(solid);
        expect(edges.length).toBeGreaterThan(0);
        const filleted = cad.fillet(solid, edges, 1);
        expect(cad.isValid(filleted)).toBe(true);
        expect(cad.getVolume(filleted)).toBeLessThan(cad.getVolume(solid));
        const chamfered = cad.chamfer(solid, edges, 0.8);
        expect(cad.isValid(chamfered)).toBe(true);
      });
    });
  });

  it("roundRoof: a half ellipse along the depth, curved side up", () => {
    const solid = build(shape("roundRoof", { x: -4, z: 5, elevation: 2, width: 20, depth: 30, height: 10 }));
    expect(cad.getVolume(solid)).toBeCloseTo((Math.PI / 2) * 10 * 10 * 30, 1);
    const box = cad.getBoundingBox(solid);
    expect(box.ymin).toBeCloseTo(2, 4);
    expect(box.ymax).toBeCloseTo(12, 3);
    expect(box.xmin).toBeCloseTo(-14, 3);
    expect(box.xmax).toBeCloseTo(6, 3);
    expect(box.zmin).toBeCloseTo(-10, 3);
    expect(box.zmax).toBeCloseTo(20, 3);
  });

  it("roundedBox: rounded corners exactly, rounded ends when asked", () => {
    const plain = build(shape("roundedBox", { width: 40, depth: 30, height: 20, cornerFillet: 5, topBottomFillet: 0 }));
    expect(cad.getVolume(plain)).toBeCloseTo((40 * 30 - (4 - Math.PI) * 25) * 20, 2);
    const rounded = build(shape("roundedBox", { width: 40, depth: 30, height: 20, cornerFillet: 5, topBottomFillet: 2 }));
    expect(cad.getVolume(rounded)).toBeLessThan(cad.getVolume(plain));
    expect(cad.getVolume(rounded)).toBeGreaterThan(cad.getVolume(plain) * 0.95);
  });

  it("roundedBox: sharp corners are a plain rectangle", () => {
    const solid = build(shape("roundedBox", { width: 40, depth: 30, height: 20, cornerFillet: 0, topBottomFillet: 0 }));
    expect(cad.getVolume(solid)).toBeCloseTo(40 * 30 * 20, 3);
  });
});
