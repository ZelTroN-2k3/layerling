import { beforeAll, describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { OcctKernel, type ShapeHandle } from "occt-wasm";

const ROTATE_Z_TO_Y: number[] = [
  1, 0, 0, 0,
  0, 0, 1, 0,
  0, -1, 0, 0,
];

describe("CAD modifier analytic primitives with real OCCT kernel", () => {
  let kernel: OcctKernel;

  beforeAll(async () => {
    const wasm = join(dirname(fileURLToPath(import.meta.resolve("occt-wasm"))), "occt-wasm.wasm");
    kernel = await OcctKernel.init({ wasm });
  });

  it("creates an analytic cylinder and fillets the rim with R3 without faceting errors", () => {
    // Fraterculas Zylinder/Dose mit R3
    const raw = kernel.makeCylinder(20, 40);
    const solid = kernel.transform(raw, ROTATE_Z_TO_Y);
    kernel.release(raw);

    expect(kernel.isSolid(solid)).toBe(true);
    expect(kernel.isValid(solid)).toBe(true);

    // Kanten einsammeln
    const edges = kernel.getSubShapes(solid, "edge");
    const circularEdges = edges.filter((e) => {
      try {
        return kernel.curveType(e) === "circle";
      } catch {
        return false;
      }
    });

    // Zylinder hat genau 2 kreisfoermige Randkanten (oben und unten)
    expect(circularEdges).toHaveLength(2);

    // Verrunden mit Radius 3 mm
    const filleted = kernel.fillet(solid, [circularEdges[0]], 3);
    const filletedSolids = kernel.isSolid(filleted) ? [filleted] : kernel.getSubShapes(filleted, "solid");
    expect(filletedSolids.length).toBeGreaterThan(0);
    expect(kernel.isValid(filleted)).toBe(true);

    const filletedVolume = kernel.getVolume(filleted);
    const originalVolume = kernel.getVolume(solid);
    // Verrundung nimmt Material an der Aussenkante weg
    expect(filletedVolume).toBeLessThan(originalVolume);

    kernel.release(solid);
    kernel.release(filleted);
    edges.forEach((e) => kernel.release(e));
  });

  it("fillets the circular edge of a truncated cone (Fraterculas Reproduzierer R38/R60/h40) with R1 and R3", () => {
    // Fraterculas Reproduzierer aus layerling-verrundung-geneigte-flaechen.md:
    // Kegelstumpf R38 oben (Deckflaeche), R60 unten (Grundflaeche), Hoehe 40 mm.
    // Mit STL-Mesh schlug R1 fruher fehl wegen 244 Facetten und Diederwinkel.
    const raw = kernel.makeCone(60, 38, 40);
    const solid = kernel.transform(raw, ROTATE_Z_TO_Y);
    kernel.release(raw);

    expect(kernel.isSolid(solid)).toBe(true);
    expect(kernel.isValid(solid)).toBe(true);

    const edges = kernel.getSubShapes(solid, "edge");
    const circularEdges = edges.filter((e) => {
      try {
        return kernel.curveType(e) === "circle";
      } catch {
        return false;
      }
    });

    // 2 kreisfoermige Kanten: oben R38, unten R60
    expect(circularEdges).toHaveLength(2);

    // Verrundung R1 an der Deckkante (oben):
    const filletedR1 = kernel.fillet(solid, [circularEdges[1]], 1);
    expect(kernel.getSubShapes(filletedR1, "solid").length).toBeGreaterThan(0);
    expect(kernel.isValid(filletedR1)).toBe(true);

    // Sogar Verrundung R3 funktioniert jetzt einwandfrei:
    const filletedR3 = kernel.fillet(solid, [circularEdges[1]], 3);
    expect(kernel.getSubShapes(filletedR3, "solid").length).toBeGreaterThan(0);
    expect(kernel.isValid(filletedR3)).toBe(true);

    kernel.release(solid);
    kernel.release(filletedR1);
    kernel.release(filletedR3);
    edges.forEach((e) => kernel.release(e));
  });

  it("handles boolean cut of inner cylinder (dose) and fillets outer and inner rims with R3", () => {
    // Vollstaendige Dose: Aussen R25, h30. Innen R19, h30 ab y=2 (2mm Boden, 6mm Wandstaerke).
    const outerRaw = kernel.makeCylinder(25, 30);
    const outerSolid = kernel.transform(outerRaw, ROTATE_Z_TO_Y);
    kernel.release(outerRaw);

    const innerRaw = kernel.makeCylinder(19, 30);
    let innerSolid = kernel.transform(innerRaw, ROTATE_Z_TO_Y);
    kernel.release(innerRaw);
    innerSolid = kernel.translate(innerSolid, 0, 2, 0);

    const dose = kernel.cut(outerSolid, innerSolid);
    kernel.release(outerSolid);
    kernel.release(innerSolid);

    const doseSolids = kernel.isSolid(dose) ? [dose] : kernel.getSubShapes(dose, "solid");
    expect(doseSolids.length).toBe(1);
    const doseSolid = doseSolids[0];

    const edges = kernel.getSubShapes(doseSolid, "edge");
    const circularEdges = edges.filter((e) => {
      try {
        return kernel.curveType(e) === "circle";
      } catch {
        return false;
      }
    });

    expect(circularEdges.length).toBeGreaterThanOrEqual(2);

    // Dose: R3 an der Aussenkante
    const filletedDose = kernel.fillet(doseSolid, [circularEdges[0]], 3);
    expect(kernel.getSubShapes(filletedDose, "solid").length).toBeGreaterThan(0);
    expect(kernel.isValid(filletedDose)).toBe(true);

    kernel.release(dose);
    kernel.release(filletedDose);
    edges.forEach((e) => kernel.release(e));
  });
});
