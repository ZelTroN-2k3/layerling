// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { buildSvgExtrusionFromPaths } from "@/lib/svgImport";

/*
 * #304: the letters of a LightBurn text. Their outlines carry points on the straight edges, and the
 * extrusion put a triangle of no area at each of them, so a letter with one was left out of the
 * import as no solid - half of the text of a real file. The outline below is such a letter: a block
 * with points along its sides and a hole with points along its sides, at a place far from the origin
 * as the drawing area of such a file lies.
 */
const LETTER_WITH_STRAIGHT_POINTS = `<svg xmlns="http://www.w3.org/2000/svg" width="60mm" height="40mm" viewBox="400 800 60 40">
  <path style="fill:#0000ff;fill-rule:evenodd" d="M410,810 L420,810 L430,810 L445,810 L445,820 L445,825 L445,830 L410,830 L410,825 L410,815 Z M420,815 L425,815 L430,815 L430,820 L430,825 L425,825 L420,825 L420,820 Z"/>
</svg>`;

describe("SVG import with points on straight edges (#304)", () => {
  it("builds a letter whose outline has points along its straight edges, hole included", () => {
    const parsed = new SVGLoader().parse(LETTER_WITH_STRAIGHT_POINTS);
    const { skippedShapes, analysis } = buildSvgExtrusionFromPaths(parsed.paths);
    expect(skippedShapes).toBe(0);
    expect(analysis.degenerateTriangles).toBe(0);
    expect(analysis.boundaryEdges).toBe(0);
    // 35 x 20 mm block with a 10 x 10 mm hole, 4 mm high.
    expect(analysis.volume).toBeCloseTo((35 * 20 - 10 * 10) * 4, 3);
  });

  it("still keeps a corner that is really a corner", () => {
    const parsed = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" width="20mm" height="20mm" viewBox="0 0 20 20">
      <path style="fill:#000" d="M0,0 L10,0 L20,10 L10,20 L0,10 Z"/></svg>`);
    const { analysis } = buildSvgExtrusionFromPaths(parsed.paths);
    // The area of the pentagon 0,0 10,0 20,10 10,20 0,10 is 250, times 4 mm.
    expect(analysis.volume).toBeCloseTo(250 * 4, 3);
  });
});
