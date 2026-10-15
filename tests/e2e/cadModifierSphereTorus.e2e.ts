import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel } from "occt-wasm";

const ROTATE_Z_TO_Y: number[] = [
  1, 0, 0, 0,
  0, 0, 1, 0,
  0, -1, 0, 0,
];

describe("CAD modifier analytic sphere and torus with real OCCT kernel", () => {
  let kernel: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    kernel = await OcctKernel.init({ wasm });
  });

  it("creates an analytic sphere solid with conserved volume and valid topology", () => {
    const radius = 15;
    const sphere = kernel.makeSphere(radius);

    expect(kernel.isSolid(sphere)).toBe(true);
    expect(kernel.isValid(sphere)).toBe(true);

    const expectedVolume = (4 / 3) * Math.PI * Math.pow(radius, 3);
    const actualVolume = kernel.getVolume(sphere);
    expect(actualVolume).toBeCloseTo(expectedVolume, 0);

    const faces = kernel.getSubShapes(sphere, "face");
    expect(faces.length).toBeGreaterThanOrEqual(1);
    expect(kernel.surfaceType(faces[0])).toBe("sphere");

    kernel.release(sphere);
    faces.forEach((f) => kernel.release(f));
  });

  it("creates an analytic torus solid oriented to Y-up with conserved volume", () => {
    const majorRadius = 20;
    const minorRadius = 5;
    const raw = kernel.makeTorus(majorRadius, minorRadius);
    const torus = kernel.transform(raw, ROTATE_Z_TO_Y);
    kernel.release(raw);

    expect(kernel.isSolid(torus)).toBe(true);
    expect(kernel.isValid(torus)).toBe(true);

    const expectedVolume = 2 * Math.PI * Math.PI * majorRadius * Math.pow(minorRadius, 2);
    const actualVolume = kernel.getVolume(torus);
    expect(actualVolume).toBeCloseTo(expectedVolume, 0);

    const faces = kernel.getSubShapes(torus, "face");
    expect(faces.length).toBeGreaterThanOrEqual(1);
    expect(kernel.surfaceType(faces[0])).toBe("torus");

    kernel.release(torus);
    faces.forEach((f) => kernel.release(f));
  });

  it("fuses an analytic sphere and torus (Magnetron's case) and fillets the intersection seam with R1", () => {
    // Magnetron's Reproduzierer aus Beitrag #92 (Bild 2 & 3):
    // Kugel und Torus verschmolzen, Schnittkante wird verrundet.
    const sphereRadius = 16;
    let sphere = kernel.makeSphere(sphereRadius);
    sphere = kernel.translate(sphere, 0, 10, 0);

    const torusRaw = kernel.makeTorus(20, 6);
    let torus = kernel.transform(torusRaw, ROTATE_Z_TO_Y);
    kernel.release(torusRaw);
    torus = kernel.translate(torus, 0, 10, 0);

    // B-Rep Boolean Fuse
    const fused = kernel.fuse(sphere, torus);
    kernel.release(sphere);
    kernel.release(torus);

    const fusedSolids = kernel.isSolid(fused) ? [fused] : kernel.getSubShapes(fused, "solid");
    expect(fusedSolids.length).toBe(1);
    const fusedSolid = fusedSolids[0];
    expect(kernel.isValid(fusedSolid)).toBe(true);

    // Kanten einsammeln
    const edges = kernel.getSubShapes(fused, "edge");
    const circularEdges = edges.filter((e) => {
      try {
        return kernel.curveType(e) === "circle";
      } catch {
        return false;
      }
    });

    // Die Durchdringung von Torus und Kugel bildet kreisfoermige Schnittkanten
    expect(circularEdges.length).toBeGreaterThan(0);

    // Verrunden der Schnittkante mit R1
    const filleted = kernel.fillet(fusedSolid, [circularEdges[0]], 1.0);
    const filletedSolids = kernel.isSolid(filleted) ? [filleted] : kernel.getSubShapes(filleted, "solid");
    expect(filletedSolids.length).toBeGreaterThan(0);
    expect(kernel.isValid(filleted)).toBe(true);

    kernel.release(fused);
    kernel.release(filleted);
    edges.forEach((e) => kernel.release(e));
  });
});
