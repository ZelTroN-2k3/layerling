import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createPrismGeometry } from "@/lib/prismGeometry";
import { regularPolygonAspect, regularPolygonFootprintScale } from "@/lib/regularPolygonFootprint";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";

function bounds(geometry: ReturnType<typeof createPrismGeometry>) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  return {
    width: box.max.x - box.min.x,
    depth: box.max.z - box.min.z,
    height: box.max.y - box.min.y,
    minY: box.min.y,
  };
}

describe("prism geometry", () => {
  it.each([3, 5, 6, 8, 12])("fills the requested box with %i sides", (sides) => {
    const measured = bounds(createPrismGeometry(24, 30, 18, sides));
    expect(measured.width).toBeCloseTo(24, 4);
    expect(measured.depth).toBeCloseTo(18, 4);
    expect(measured.height).toBeCloseTo(30, 4);
    // Der Koerper steht auf der Arbeitsebene, nicht halb darunter.
    expect(measured.minY).toBeCloseTo(0, 5);
  });

  it("describes how wide and deep a polygon of unit radius measures", () => {
    // Ein Sechskant misst ueber die Ecken zwei, ueber die Flaechen Wurzel drei.
    const hexagon = regularPolygonAspect(6);
    expect(hexagon.depth).toBeCloseTo(2, 6);
    expect(hexagon.width).toBeCloseTo(Math.sqrt(3), 6);
    // Ein Viereck ist quadratisch, ein Fuenfkant weder noch.
    const square = regularPolygonAspect(4);
    expect(square.width).toBeCloseTo(square.depth, 6);
    const pentagon = regularPolygonAspect(5);
    expect(pentagon.width).not.toBeCloseTo(pentagon.depth, 3);
    expect(regularPolygonAspect(2.4)).toEqual(regularPolygonAspect(3));
  });

  it("drops a regular hexagon on the plane, not a squashed one", () => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "polygon");
    expect(asset).toBeDefined();
    const shape = makeShapeFromAsset(asset!, { x: 0, z: 0 });

    expect(shape.sides).toBe(6);
    const aspect = regularPolygonAspect(6);
    // Gleicher Umkreis in beiden Achsen heisst: das Vieleck ist gleichseitig.
    expect(shape.width / aspect.width).toBeCloseTo(shape.depth / aspect.depth, 6);
    expect(Math.max(shape.width, shape.depth)).toBeCloseTo(20, 6);

    const measured = bounds(createPrismGeometry(shape.width, shape.height, shape.depth, shape.sides));
    expect(measured.width).toBeCloseTo(shape.width, 4);
    expect(measured.depth).toBeCloseTo(shape.depth, 4);
  });

  it.each([3, 5, 6, 7, 96])("puts the quick path and the baked body in the same place with %i sides", (sides) => {
    // Die Ansicht skaliert einen Einheitskoerper, damit ein Zug am Anfasser
    // nicht jedes Mal ein neues Vieleck baut; Verschneidung und Ausgabe backen
    // die Masse in die Geometrie. Beide muessen denselben Koerper ergeben.
    const fit = regularPolygonFootprintScale(24, 18, sides);
    const quick = new THREE.CylinderGeometry(1, 1, 1, sides);
    quick.scale(fit.x, 30, fit.z);
    quick.translate(fit.offsetX, 0, fit.offsetZ);
    quick.computeBoundingBox();
    const baked = createPrismGeometry(24, 30, 18, sides);
    baked.computeBoundingBox();

    const a = quick.boundingBox!;
    const b = baked.boundingBox!;
    expect(a.min.x).toBeCloseTo(b.min.x, 5);
    expect(a.max.x).toBeCloseTo(b.max.x, 5);
    expect(a.min.z).toBeCloseTo(b.min.z, 5);
    expect(a.max.z).toBeCloseTo(b.max.z, 5);
    expect(a.max.y - a.min.y).toBeCloseTo(b.max.y - b.min.y, 5);
  });

  it("makes a cylinder with few sides keep the measurements it shows", () => {
    // Frueher lag das Vieleck im Kreis vom Durchmesser der Breite: ein
    // Sechskant, der 20 sagte, mass 17,32.
    const hexagon = bounds(createPrismGeometry(20, 20, 20, 6));
    expect(hexagon.width).toBeCloseTo(20, 4);
    expect(hexagon.depth).toBeCloseTo(20, 4);
    const triangle = bounds(createPrismGeometry(20, 20, 20, 3));
    expect(triangle.width).toBeCloseTo(20, 4);
    expect(triangle.depth).toBeCloseTo(20, 4);
  });
});
