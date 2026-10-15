import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { loopArea, projectSectionPoint, sectionSvgDocument, sliceMeshContours, type SectionMesh } from "@/lib/sectionSvg";

/** Ein three.js-Koerper als Netz, wie der Export es liefert: Ecken je Dreieck, ungeschweisst. */
function meshFromGeometry(geometry: THREE.BufferGeometry): SectionMesh {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = source.getAttribute("position");
  const vertices: Array<[number, number, number]> = [];
  const faces: Array<[number, number, number]> = [];
  for (let index = 0; index < position.count; index += 1) vertices.push([position.getX(index), position.getY(index), position.getZ(index)]);
  for (let index = 0; index + 2 < position.count; index += 3) faces.push([index, index + 1, index + 2]);
  return { vertices, faces };
}

/** Eine 20 x 20 mm Platte, 10 mm stark (entlang Z), mit einer Bohrung von 8 mm in der Mitte. */
function plateWithBore() {
  const outline = new THREE.Shape([new THREE.Vector2(-10, -10), new THREE.Vector2(10, -10), new THREE.Vector2(10, 10), new THREE.Vector2(-10, 10)]);
  const bore = new THREE.Path();
  bore.absarc(0, 0, 4, 0, Math.PI * 2, true);
  outline.holes.push(bore);
  return meshFromGeometry(new THREE.ExtrudeGeometry(outline, { depth: 10, bevelEnabled: false, curveSegments: 32 }));
}

const closedAreas = (mesh: SectionMesh, axis: "x" | "y" | "z", offset: number) =>
  sliceMeshContours(mesh, axis, offset).map((loop) => {
    expect(loop.closed).toBe(true);
    return Math.abs(loopArea(loop.points));
  }).sort((a, b) => b - a);

describe("sliceMeshContours", () => {
  it("cuts a box into one closed rectangle with four corners", () => {
    const box = meshFromGeometry(new THREE.BoxGeometry(30, 20, 10).translate(0, 10, 0));
    const loops = sliceMeshContours(box, "y", 7);
    expect(loops).toHaveLength(1);
    expect(loops[0].closed).toBe(true);
    expect(loops[0].points).toHaveLength(4);
    expect(Math.abs(loopArea(loops[0].points))).toBeCloseTo(300, 6);
  });

  it("keeps the bore as its own closed loop", () => {
    const areas = closedAreas(plateWithBore(), "z", 5);
    expect(areas).toHaveLength(2);
    expect(areas[0]).toBeCloseTo(400, 6);
    // Ein Vieleck mit 32 Ecken im Kreis von 4 mm: knapp unter pi * 16.
    expect(areas[1]).toBeGreaterThan(49);
    expect(areas[1]).toBeLessThan(Math.PI * 16);
  });

  it("cuts straight through the bore into two closed walls", () => {
    const areas = closedAreas(plateWithBore(), "x", 0);
    expect(areas).toHaveLength(2);
    expect(areas[0]).toBeCloseTo(60, 6);
    expect(areas[1]).toBeCloseTo(60, 6);
  });

  it("stays closed where corners lie exactly on the plane", () => {
    // Zwei aufeinandergestapelte Quader, geschweisst: ein Eckenring genau bei y = 10.
    const lower = new THREE.BoxGeometry(10, 10, 10, 1, 1, 1).translate(0, 5, 0);
    const upper = new THREE.BoxGeometry(10, 10, 10, 1, 1, 1).translate(0, 15, 0);
    const tall = meshFromGeometry(new THREE.BoxGeometry(10, 20, 10, 1, 2, 1).translate(0, 10, 0));
    expect(closedAreas(tall, "y", 10)).toEqual([expect.closeTo(100, 6)]);
    // Genau auf einer Deckflaeche entscheidet die Regel "auf der Ebene zaehlt
    // als oben": der untere Quader zeigt seinen Deckel, der obere nichts -
    // eindeutig und ohne halbe Umrisse.
    expect(closedAreas(meshFromGeometry(lower), "y", 10)).toEqual([expect.closeTo(100, 6)]);
    expect(closedAreas(meshFromGeometry(upper), "y", 10)).toEqual([]);
  });

  it("finds nothing when the plane misses the body", () => {
    const box = meshFromGeometry(new THREE.BoxGeometry(10, 10, 10));
    expect(sliceMeshContours(box, "x", 20)).toEqual([]);
  });

  it("joins an already welded mesh the same way", () => {
    const geometry = new THREE.BoxGeometry(10, 10, 10);
    const position = geometry.getAttribute("position");
    const vertices: Array<[number, number, number]> = [];
    for (let index = 0; index < position.count; index += 1) vertices.push([position.getX(index), position.getY(index), position.getZ(index)]);
    const index = geometry.index!;
    const faces: Array<[number, number, number]> = [];
    for (let i = 0; i < index.count; i += 3) faces.push([index.getX(i), index.getX(i + 1), index.getX(i + 2)]);
    expect(closedAreas({ vertices, faces }, "z", 1.5)).toEqual([expect.closeTo(100, 6)]);
  });
});

describe("projectSectionPoint", () => {
  it("shows an X cut from the right: front on the left, up on top", () => {
    expect(projectSectionPoint([0, 0, 30], "x").u).toBe(-30);
    expect(projectSectionPoint([0, 12, 0], "x").v).toBe(-12);
  });

  it("shows a Y cut from above like the sketch: front at the bottom", () => {
    expect(projectSectionPoint([5, 0, 30], "y")).toEqual({ u: 5, v: 30 });
  });

  it("shows a Z cut from the front: right on the right, up on top", () => {
    expect(projectSectionPoint([5, 12, 0], "z")).toEqual({ u: 5, v: -12 });
  });
});

describe("sectionSvgDocument", () => {
  it("draws at 1:1 in millimetres, unfilled, one path per body", () => {
    const loops = sliceMeshContours(plateWithBore(), "z", 5);
    const result = sectionSvgDocument([{ name: "Platte <A>", color: "#d41721", loops }], "z", 5, "Test & Co")!;
    expect(result.width).toBeCloseTo(24, 6);
    expect(result.height).toBeCloseTo(24, 6);
    expect(result.svg).toContain('width="24mm" height="24mm" viewBox="-12 -12 24 24"');
    expect(result.svg.match(/<path /g)).toHaveLength(1);
    expect(result.svg).toContain('fill="none" fill-rule="evenodd" stroke="#d41721"');
    expect(result.svg.match(/ d="[^"]*"/)![0].match(/ Z/g)).toHaveLength(2);
    expect(result.svg).toContain("<title>Platte &lt;A&gt;</title>");
    expect(result.svg).toContain("<title>Test &amp; Co</title>");
    expect(result.loopCount).toBe(2);
    expect(result.openCount).toBe(0);
  });

  it("names the cut with the letter the editor shows: a cut across the depth is Y", () => {
    const loops = sliceMeshContours(plateWithBore(), "z", 5);
    expect(sectionSvgDocument([{ name: "Platte", color: "#000", loops }], "z", 5, "Test")!.svg)
      .toContain("<desc>layerling section at Y = 5 mm, seen from the front,");
  });

  it("returns nothing when no body is cut", () => {
    expect(sectionSvgDocument([{ name: "Leer", color: "#000", loops: [] }], "x", 0, "Leer")).toBeNull();
  });
});
